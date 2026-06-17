import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  supabaseId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const supabaseUser = data.user;
      let user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: supabaseUser.email ?? `${supabaseUser.id}@unknown.local`,
            name: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? null,
            supabaseId: supabaseUser.id,
          },
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        supabaseId: supabaseUser.id,
      };
      return next();
    }

    // Dev fallback: accept dev tokens (dev:userId)
    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev:')) {
      const userId = token.slice(4);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(401).json({ error: 'Invalid dev token' });
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        supabaseId: user.supabaseId ?? user.id,
      };
      return next();
    }

    return res.status(401).json({ error: 'Auth not configured' });
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return authMiddleware(req, res, next);
}
