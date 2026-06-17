import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scans.js';
import reportRoutes from './routes/reports.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

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

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[Server] Running on http://localhost:${config.port}`);
});
