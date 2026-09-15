import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import db from '../db.mjs';
import { writeBlob, readBlobStream, deleteBlob, blobExists } from '../lib/blobStore.mjs';
import { MAX_UPLOAD_BYTES, DOWNLOAD_GRACE_MS } from '../lib/config.mjs';
import appEvents from '../events.mjs';

const router = Router();

const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

function logEvent(fileId, sessionId, event) {
  db.prepare('INSERT INTO audit_log (file_id, session_id, event) VALUES (?, ?, ?)')
    .run(fileId, sessionId || null, event);
}

// --- Upload ------------------------------------------------------------------
// Body is an already-encrypted opaque blob (client-side AES-GCM over a zip of
// the staged files) — raw octet-stream, not multipart, so there's nothing for
// the server to parse or inspect.

router.post(
  '/upload',
  uploadLimiter,
  express.raw({ type: '*/*', limit: MAX_UPLOAD_BYTES }),
  (req, res) => {
    const tokenId = req.query.token;
    if (!tokenId || typeof tokenId !== 'string') {
      return res.status(400).json({ error: 'Missing upload token' });
    }

    const token = db.prepare('SELECT * FROM upload_tokens WHERE id = ?').get(tokenId);
    if (!token || !token.enabled) return res.status(403).json({ error: 'Invalid or disabled upload link' });
    if (token.max_uses != null && token.use_count >= token.max_uses) {
      return res.status(403).json({ error: 'Upload link has reached its use limit' });
    }

    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: 'Empty upload body' });
    }

    let expiresAt = null;
    const expiresInSeconds = parseInt(req.get('X-Expires-In-Seconds'), 10);
    if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
      expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    }

    const fileId = crypto.randomBytes(16).toString('base64url');

    writeBlob(fileId, buffer)
      .then(() => {
        db.prepare(`
          INSERT INTO files (id, size_bytes, upload_token_id, uploader_session_id, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(fileId, buffer.length, token.id, req.sessionId, expiresAt);

        db.prepare('UPDATE upload_tokens SET use_count = use_count + 1 WHERE id = ?').run(token.id);

        logEvent(fileId, req.sessionId, 'uploaded');
        appEvents.emit(`session:${req.sessionId}`, { type: 'uploaded', fileId });
        appEvents.emit('admin', { type: 'uploaded', fileId });

        res.status(201).json({ fileId, expiresAt });
      })
      .catch((err) => {
        console.error('Upload write failed:', err);
        res.status(500).json({ error: 'Failed to store file' });
      });
  }
);

// --- Metadata (does not claim the file) -------------------------------------

router.get('/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file || file.deleted_at) return res.status(404).json({ error: 'File not found or already removed' });

  const graceExpiresAt = file.claimed_at
    ? new Date(new Date(file.claimed_at).getTime() + DOWNLOAD_GRACE_MS).toISOString()
    : null;

  res.json({
    fileId: file.id,
    sizeBytes: file.size_bytes,
    claimed: !!file.claimed_at,
    graceExpiresAt,
    expiresAt: file.expires_at,
  });
});

// --- Download (claims the file on first request) ----------------------------

router.get('/:id/blob', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file || file.deleted_at || !blobExists(file.id)) {
    return res.status(404).json({ error: 'File not found or already removed' });
  }

  if (!file.claimed_at) {
    db.prepare(`UPDATE files SET claimed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), claimed_by_session_id = ? WHERE id = ?`)
      .run(req.sessionId, file.id);
    file.claimed_at = new Date().toISOString();

    logEvent(file.id, req.sessionId, 'download_started');
    appEvents.emit(`session:${file.uploader_session_id}`, { type: 'download_started', fileId: file.id });
    appEvents.emit('admin', { type: 'download_started', fileId: file.id });
  } else {
    const graceEnd = new Date(file.claimed_at).getTime() + DOWNLOAD_GRACE_MS;
    if (Date.now() > graceEnd) {
      return res.status(410).json({ error: 'Download window has expired' });
    }
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.id}.bin"`);
  res.setHeader('Content-Length', String(file.size_bytes));

  const stream = readBlobStream(file.id);
  stream.on('error', (err) => {
    console.error('Blob stream error:', err);
    if (!res.headersSent) res.status(500).end();
  });
  res.on('finish', () => {
    logEvent(file.id, req.sessionId, 'download_completed');
    appEvents.emit(`session:${file.uploader_session_id}`, { type: 'download_completed', fileId: file.id });
    appEvents.emit('admin', { type: 'download_completed', fileId: file.id });
  });
  stream.pipe(res);
});

// --- Manual delete (uploader's own session only) -----------------------------

router.delete('/:id', async (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file || file.deleted_at) return res.status(404).json({ error: 'File not found' });
  if (file.uploader_session_id !== req.sessionId) return res.status(403).json({ error: 'Not your file' });

  await deleteBlob(file.id);
  db.prepare(`UPDATE files SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), delete_reason = 'manual' WHERE id = ?`).run(file.id);
  logEvent(file.id, req.sessionId, 'deleted_manual');
  appEvents.emit(`session:${req.sessionId}`, { type: 'deleted', fileId: file.id, reason: 'manual' });
  appEvents.emit('admin', { type: 'deleted', fileId: file.id, reason: 'manual' });

  res.status(204).end();
});

export default router;
