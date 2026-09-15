import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.LOCAL_DEV === 'true') {
  const { setup } = await import('./scripts/localDev.mjs');
  await setup();
}

const app = express();

// CORS origins: set CORS_ORIGINS env var as a comma-separated list for production.
// Falls back to localhost dev origins when not set.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : [
      'http://127.0.0.1:3000', 'http://localhost:3000',
      'http://127.0.0.1:5173', 'http://localhost:5173',
    ];

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Serve built frontend
app.use(express.static(path.join(__dirname, 'dist')));

import { ensureSession } from './middlewares/session.mjs';
app.use(ensureSession);

// --- API routes ---
import adminRouter from './routes/admin.mjs';
import uploadTokensRouter from './routes/uploadTokens.mjs';
import filesRouter from './routes/files.mjs';
import sessionRouter from './routes/session.mjs';
import sseRouter from './routes/sse.mjs';

app.use('/api/admin', adminRouter);
app.use('/api/upload-tokens', uploadTokensRouter);
app.use('/api/files', filesRouter);
app.use('/api/session', sessionRouter);
app.use('/api/sse', sseRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

import { startCleanupLoop } from './lib/cleanup.mjs';
startCleanupLoop();

// SPA catch-all — must come after all API routes
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler — must be last middleware.
// Express 5 automatically forwards thrown/rejected errors here.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
