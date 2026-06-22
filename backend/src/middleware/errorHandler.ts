import { Request, Response, NextFunction } from 'express';
import { scrubSecrets } from '../vault/keyVault.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const safeMessage = scrubSecrets(err.message);
  console.error('[Error]', safeMessage);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? safeMessage : undefined,
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}
