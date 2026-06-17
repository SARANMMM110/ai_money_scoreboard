import { Router } from 'express';
import { supabaseAnon } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!supabaseAnon) {
    // Dev mode without Supabase
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
  if (!data.user) return res.status(400).json({ error: 'Registration failed' });

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    create: {
      email: data.user.email!,
      name: name ?? null,
      supabaseId: data.user.id,
    },
    update: { name: name ?? undefined },
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    session: data.session,
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!supabaseAnon) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      session: { access_token: `dev:${user.id}` },
    });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const user = await prisma.user.upsert({
    where: { supabaseId: data.user!.id },
    create: {
      email: data.user!.email!,
      supabaseId: data.user!.id,
    },
    update: {},
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    session: data.session,
  });
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
