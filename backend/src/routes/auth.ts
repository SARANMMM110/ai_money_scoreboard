import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

function isEmailNotConfirmed(message: string): boolean {
  return /email not confirmed/i.test(message);
}

/** In development, auto-confirm so local sign-in works without inbox verification. */
async function confirmSupabaseEmailInDev(userId: string): Promise<void> {
  if (config.nodeEnv !== 'development' || !supabaseAdmin) return;
  await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function signInSupabase(email: string, password: string, knownUserId?: string) {
  let result = await supabaseAnon!.auth.signInWithPassword({ email, password });
  if (!result.error) return result;

  if (isEmailNotConfirmed(result.error.message) && config.nodeEnv === 'development' && supabaseAdmin) {
    const uid = knownUserId ?? (await findSupabaseUserIdByEmail(email));
    if (uid) {
      await confirmSupabaseEmailInDev(uid);
      result = await supabaseAnon!.auth.signInWithPassword({ email, password });
    }
  }
  return result;
}

/** Link or create a local User row for a Supabase auth user (handles prior dev-mode rows). */
async function syncSupabaseUser(
  supabaseId: string,
  email: string,
  name?: string | null,
) {
  const bySupabase = await prisma.user.findUnique({ where: { supabaseId } });
  if (bySupabase) {
    return prisma.user.update({
      where: { id: bySupabase.id },
      data: { email, name: name ?? undefined },
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    if (byEmail.supabaseId && byEmail.supabaseId !== supabaseId) {
      throw Object.assign(new Error('Email already linked to a different account'), { status: 409 });
    }
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { supabaseId, name: name ?? byEmail.name ?? undefined },
    });
  }

  return prisma.user.create({
    data: { email, supabaseId, name: name ?? null },
  });
}

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  if (!supabaseAnon) {
    return res.status(400).json({ error: 'Session refresh is not available in dev auth mode — sign in again' });
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });
  if (error || !data.session?.access_token) {
    return res.status(401).json({ error: error?.message ?? 'Session expired — sign in again' });
  }

  res.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    if (!supabaseAnon) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const user = await prisma.user.create({ data: { email, name: name ?? null } });
      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        session: { access_token: `dev:${user.id}` },
      });
    }

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) return res.status(400).json({ error: error.message });
    if (!data.user?.email) return res.status(400).json({ error: 'Registration failed' });

    const user = await syncSupabaseUser(data.user.id, data.user.email, name);

    if (config.nodeEnv === 'development' && supabaseAdmin) {
      await confirmSupabaseEmailInDev(data.user.id);
    }

    let session = data.session;
    if (!session?.access_token) {
      const signIn = await signInSupabase(email, password, data.user.id);
      if (signIn.error) {
        return res.status(400).json({
          error: signIn.error.message || 'Account created — confirm your email, then sign in.',
        });
      }
      session = signIn.data.session;
    }

    if (!session?.access_token) {
      return res.status(400).json({ error: 'Account created — check your email to confirm, then sign in.' });
    }

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      session: { access_token: session.access_token, refresh_token: session.refresh_token },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered — try signing in instead' });
    }
    const message = err instanceof Error ? err.message : 'Registration failed';
    return res.status(status).json({ error: message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    if (!supabaseAnon) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        session: { access_token: `dev:${user.id}` },
      });
    }

    const { data, error } = await signInSupabase(email, password);
    if (error) return res.status(401).json({ error: error.message });

    const user = await syncSupabaseUser(
      data.user!.id,
      data.user!.email!,
      data.user!.user_metadata?.full_name ?? data.user!.user_metadata?.name,
    );

    if (!data.session?.access_token) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Account conflict — contact support or use a different email' });
    }
    const message = err instanceof Error ? err.message : 'Login failed';
    return res.status(500).json({ error: message });
  }
});
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  if (supabaseAnon) {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });
    if (error) return res.status(400).json({ error: error.message });
  }

  res.json({ message: 'If an account exists, a reset link has been sent.' });
});

router.post('/reset', async (req, res) => {
  const { accessToken, password } = req.body;
  if (!accessToken || !password) {
    return res.status(400).json({ error: 'Token and new password required' });
  }

  if (!supabaseAnon) {
    return res.status(400).json({ error: 'Password reset requires Supabase configuration' });
  }

  const { error } = await supabaseAnon.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password updated successfully' });
});

export default router;
