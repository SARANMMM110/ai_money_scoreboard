import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config, initVault } from './config.js';
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scans.js';
import reportRoutes from './routes/reports.js';
import brandRoutes from './routes/brands.js';
import visibilityRoutes from './routes/visibility.js';
import keyRoutes from './routes/keys.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initQueues } from './lib/queue.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

const storagePath = path.resolve(config.storagePath);
if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/visibility', visibilityRoutes);
app.use('/api/keys', keyRoutes);

app.use(notFound);
app.use(errorHandler);

initVault();
initQueues();

app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
  console.log('[Server] Scanner persist: createMany (v2 — no interactive transactions)');
});
