// Background sweep that enforces the two ways a file's life ends:
//   1. Someone downloaded it — it stays available for DOWNLOAD_GRACE_MS after
//      the first download request (so a dropped connection can retry), then
//      is deleted unconditionally.
//   2. It hit its optional expires_at without ever being downloaded.

import db from '../db.mjs';
import { deleteBlob } from './blobStore.mjs';
import { DOWNLOAD_GRACE_MS } from './config.mjs';
import appEvents from '../events.mjs';

const SWEEP_INTERVAL_MS = 30_000;

async function removeFile(file, reason, auditEvent) {
  await deleteBlob(file.id);
  db.prepare(`UPDATE files SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), delete_reason = ? WHERE id = ?`)
    .run(reason, file.id);
  db.prepare('INSERT INTO audit_log (file_id, session_id, event) VALUES (?, NULL, ?)')
    .run(file.id, auditEvent);

  const payload = { type: 'deleted', fileId: file.id, reason };
  appEvents.emit(`session:${file.uploader_session_id}`, payload);
  appEvents.emit('admin', payload);
}

async function sweepOnce() {
  const graceCutoff = new Date(Date.now() - DOWNLOAD_GRACE_MS).toISOString();

  const graceExpired = db.prepare(`
    SELECT * FROM files
    WHERE deleted_at IS NULL AND claimed_at IS NOT NULL AND claimed_at <= ?
  `).all(graceCutoff);

  for (const file of graceExpired) {
    await removeFile(file, 'downloaded', 'deleted_grace');
  }

  const ttlExpired = db.prepare(`
    SELECT * FROM files
    WHERE deleted_at IS NULL AND claimed_at IS NULL
      AND expires_at IS NOT NULL AND expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).all();

  for (const file of ttlExpired) {
    await removeFile(file, 'expired', 'expired');
  }
}

export function startCleanupLoop() {
  sweepOnce().catch((err) => console.error('Cleanup sweep failed:', err));
  return setInterval(() => {
    sweepOnce().catch((err) => console.error('Cleanup sweep failed:', err));
  }, SWEEP_INTERVAL_MS);
}
