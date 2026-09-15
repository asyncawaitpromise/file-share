// Live updates for the current anonymous session (and, if the fs_admin
// cookie is valid, the global admin feed too) — lets the history/admin
// pages update instantly instead of polling.
//
// Client usage:
//   const es = new EventSource('/api/sse/stream', { withCredentials: true })
//   es.addEventListener('update', (e) => console.log(JSON.parse(e.data)))
//   es.addEventListener('admin', (e) => console.log(JSON.parse(e.data)))

import { Router } from 'express';
import appEvents from '../events.mjs';
import { isAdminRequest } from '../middlewares/requireAdmin.mjs';

const router = Router();

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', {});

  const heartbeat = setInterval(() => send('heartbeat', { ts: Date.now() }), 30_000);

  const sessionListener = (data) => send('update', data);
  appEvents.on(`session:${req.sessionId}`, sessionListener);

  let adminListener = null;
  if (isAdminRequest(req)) {
    adminListener = (data) => send('admin', data);
    appEvents.on('admin', adminListener);
  }

  req.on('close', () => {
    clearInterval(heartbeat);
    appEvents.off(`session:${req.sessionId}`, sessionListener);
    if (adminListener) appEvents.off('admin', adminListener);
  });
});

export default router;
