import { motion } from 'framer-motion';
import { PRODUCT_NAME } from '../components/BrandLogo';
import { AppShell } from '../components/AppShell';
import { ScanPageDecor } from '../components/ScanPageDecor';
import { ApiKeysSection } from '../components/ApiKeysSection';
import { IconSettings, IconPencil, IconUser, IconLogOut } from '../components/icons';
import { useAuth } from '../context/AuthContext';

function userInitial(user: { name: string | null; email: string } | null) {
  if (!user) return '?';
  if (user.name) return user.name.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

function displayName(user: { name: string | null; email: string } | null) {
  if (!user) return '—';
  if (user.name) return user.name;
  return user.email.split('@')[0] ?? '—';
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const initial = userInitial(user);

  return (
    <AppShell>
      <div className="relative w-full min-h-full bg-scan-page overflow-hidden flex flex-col">
        <ScanPageDecor />

        {/* Decorative gear — top right */}
        <div className="pointer-events-none absolute top-8 right-12 z-0 hidden lg:block" aria-hidden>
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-brand/10 blur-2xl" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-soft to-white border border-brand/20 shadow-card flex items-center justify-center text-brand">
              <IconSettings size={36} />
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full px-6 sm:px-8 py-8 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Settings</h1>
            <p className="text-dim text-sm mt-1">Manage your account and preferences</p>
          </motion.div>

          <div className="space-y-5 max-w-4xl">
            {/* Profile card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-surface border border-line rounded-2xl shadow-card p-6 sm:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
                <div className="relative shrink-0 self-start">
                  <div className="w-20 h-20 rounded-full bg-brand-gradient flex items-center justify-center text-white text-2xl font-bold shadow-[0_8px_24px_rgba(14,169,141,0.35)]">
                    {initial}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-surface border border-line shadow-card flex items-center justify-center text-faint hover:text-brand hover:border-brand/30 transition-colors"
                    aria-label="Edit profile"
                  >
                    <IconPencil size={14} />
                  </button>
                </div>

                <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-faint mb-1">Email</p>
                    <p className="text-sm font-semibold text-ink">{user?.email ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-faint mb-1">Name</p>
                    <p className="text-sm font-semibold text-ink">{displayName(user)}</p>
                  </div>
                </div>

                <div className="lg:w-64 shrink-0 bg-brand-soft/60 border border-brand/15 rounded-xl p-4 flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand/15 flex items-center justify-center text-brand shrink-0">
                    <IconUser size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand mb-0.5">Account</p>
                    <p className="text-xs text-dim leading-relaxed">
                      Manage your personal information and account settings.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
            >
              <ApiKeysSection />
            </motion.div>

            {/* Sign out card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface border border-line rounded-2xl shadow-card p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="w-11 h-11 rounded-xl bg-critical-soft flex items-center justify-center text-critical shrink-0">
                  <IconLogOut size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-critical">Sign out</p>
                  <p className="text-xs text-faint mt-0.5">Sign out from your account on this device</p>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="shrink-0 text-sm font-semibold text-critical border border-critical/30 bg-critical-soft/30 px-5 py-2.5 rounded-xl hover:bg-critical-soft transition-colors"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        <footer className="relative z-10 py-6 text-center">
          <p className="text-xs text-faint">© {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved.</p>
        </footer>
      </div>
    </AppShell>
  );
}
