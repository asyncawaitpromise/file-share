import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import db from '../db.mjs';
import { requireAdmin, ADMIN_COOKIE } from '../middlewares/requireAdmin.mjs';
import { ADMIN_SESSION_MAX_AGE_MS } from '../lib/config.mjs';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again later' },
});

router.post('/login', loginLimiter, (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'Password required' });

  const given = Buffer.from(password);
  const wanted = Buffer.from(expected);
  const valid = given.length === wanted.length && crypto.timingSafeEqual(given, wanted);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  const sessionId = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS).toISOString();
  db.prepare('INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)').run(sessionId, expiresAt);

  res.cookie(ADMIN_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE_MS,
  });
  res.json({ ok: true });
});

router.post('/logout', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(req.cookies[ADMIN_COOKIE]);
  res.clearCookie(ADMIN_COOKIE);
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (_req, res) => res.json({ ok: true }));

// --- Upload access tokens ---------------------------------------------------

router.get('/tokens', requireAdmin, (_req, res) => {
  res.json({ tokens: db.prepare('SELECT * FROM upload_tokens ORDER BY created_at DESC').all() });
});

router.post('/tokens', requireAdmin, (req, res) => {
  const { label, maxUses } = req.body || {};
  const id = crypto.randomBytes(16).toString('base64url');
  db.prepare('INSERT INTO upload_tokens (id, label, max_uses) VALUES (?, ?, ?)')
    .run(id, label || null, Number.isInteger(maxUses) ? maxUses : null);
  res.status(201).json({ token: db.prepare('SELECT * FROM upload_tokens WHERE id = ?').get(id) });
});

router.patch('/tokens/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM upload_tokens WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const enabled = !!req.body?.enabled;
  db.prepare(`UPDATE upload_tokens SET enabled = ?, disabled_at = ? WHERE id = ?`)
    .run(enabled ? 1 : 0, enabled ? null : new Date().toISOString(), req.params.id);
  res.json({ token: db.prepare('SELECT * FROM upload_tokens WHERE id = ?').get(req.params.id) });
});

router.delete('/tokens/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM upload_tokens WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- Global audit log + stats -----------------------------------------------

router.get('/audit', requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  res.json({ events: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(limit) });
});

router.get('/stats', requireAdmin, (_req, res) => {
  res.json(db.prepare(`
    SELECT
      COUNT(*) AS totalFilesEver,
      COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN size_bytes ELSE 0 END), 0) AS activeBytes,
      COALESCE(SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END), 0) AS activeFiles
    FROM files
  `).get());
});

export default router;
