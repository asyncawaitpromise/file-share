import { Router } from 'express';
import db from '../db.mjs';

const router = Router();

function status(file) {
  if (file.deleted_at) {
    if (file.delete_reason === 'expired') return 'expired';
    if (file.delete_reason === 'manual') return 'deleted';
    return 'downloaded';
  }
  if (file.claimed_at) return 'downloading';
  return 'pending';
}

function summarize(file) {
  return {
    fileId: file.id,
    sizeBytes: file.size_bytes,
    createdAt: file.created_at,
    expiresAt: file.expires_at,
    claimedAt: file.claimed_at,
    deletedAt: file.deleted_at,
    status: status(file),
  };
}

// The server can only echo back what it tracked server-side (size, status,
// timestamps) — never filenames or download links, since those never leave
// the browser that created them. The client merges this with whatever it
// remembers locally.
router.get('/history', (req, res) => {
  const uploads = db.prepare('SELECT * FROM files WHERE uploader_session_id = ? ORDER BY created_at DESC')
    .all(req.sessionId);

  const downloads = db.prepare(`
    SELECT * FROM files
    WHERE claimed_by_session_id = ?
      AND (uploader_session_id IS NULL OR uploader_session_id != claimed_by_session_id)
    ORDER BY claimed_at DESC
  `).all(req.sessionId);

  res.json({ uploads: uploads.map(summarize), downloads: downloads.map(summarize) });
});

export default router;
