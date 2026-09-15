import db from '../db.mjs';

export const ADMIN_COOKIE = 'fs_admin';

export function requireAdmin(req, res, next) {
  const sessionId = req.cookies?.[ADMIN_COOKIE];
  if (!sessionId) return res.status(401).json({ error: 'Admin login required' });

  const session = db.prepare(`
    SELECT id FROM admin_sessions WHERE id = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).get(sessionId);
  if (!session) return res.status(401).json({ error: 'Admin session expired' });

  next();
}

export function isAdminRequest(req) {
  const sessionId = req.cookies?.[ADMIN_COOKIE];
  if (!sessionId) return false;
  return !!db.prepare(`
    SELECT 1 FROM admin_sessions WHERE id = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `).get(sessionId);
}
