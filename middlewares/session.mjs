import crypto from 'crypto';
import db from '../db.mjs';
import { ANON_SESSION_MAX_AGE_MS } from '../lib/config.mjs';

export const SESSION_COOKIE = 'fs_session';

// Every request gets an anonymous session — no login, just an opaque random
// id in a cookie. Lets a returning visitor see their own upload/download
// history without an account.
export function ensureSession(req, res, next) {
  const cookieId = req.cookies?.[SESSION_COOKIE];
  const existing = cookieId ? db.prepare('SELECT id FROM sessions WHERE id = ?').get(cookieId) : null;

  if (existing) {
    db.prepare(`UPDATE sessions SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(cookieId);
    req.sessionId = cookieId;
    return next();
  }

  const sessionId = crypto.randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO sessions (id) VALUES (?)').run(sessionId);
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ANON_SESSION_MAX_AGE_MS,
  });
  req.sessionId = sessionId;
  next();
}
