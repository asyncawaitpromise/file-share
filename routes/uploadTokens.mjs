import { Router } from 'express';
import db from '../db.mjs';

const router = Router();

// Public check so the upload page can tell a visitor whether their link
// still works before they pick files.
router.get('/:token/check', (req, res) => {
  const token = db.prepare(`
    SELECT enabled, max_uses, use_count, label FROM upload_tokens WHERE id = ?
  `).get(req.params.token);

  if (!token) return res.json({ valid: false });

  const usesLeft = token.max_uses == null ? null : token.max_uses - token.use_count;
  const valid = !!token.enabled && (usesLeft === null || usesLeft > 0);
  res.json({ valid, label: token.label || null });
});

export default router;
