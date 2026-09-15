/**
 * Local development setup — called automatically when LOCAL_DEV=true.
 * - Defaults ADMIN_PASSWORD if not configured
 * - Creates a standing "local-dev" upload link for convenience
 */

import crypto from 'crypto';
import db from '../db.mjs';

export async function setup() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🛠  LOCAL DEV MODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!process.env.ADMIN_PASSWORD) {
    process.env.ADMIN_PASSWORD = 'dev-admin';
    console.log('  🔑 ADMIN_PASSWORD not set — using "dev-admin" for this session');
  }

  let token = db.prepare(`SELECT * FROM upload_tokens WHERE label = 'local-dev'`).get();
  if (!token) {
    const id = crypto.randomBytes(16).toString('base64url');
    db.prepare(`INSERT INTO upload_tokens (id, label) VALUES (?, 'local-dev')`).run(id);
    token = db.prepare('SELECT * FROM upload_tokens WHERE id = ?').get(id);
    console.log('  📤 Local dev upload link created');
  } else {
    console.log('  📤 Local dev upload link exists');
  }

  const clientPort = 5173;
  console.log(`     Admin panel:  http://localhost:${clientPort}/admin  (password: ${process.env.ADMIN_PASSWORD})`);
  console.log(`     Upload link:  http://localhost:${clientPort}/upload/${token.id}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
