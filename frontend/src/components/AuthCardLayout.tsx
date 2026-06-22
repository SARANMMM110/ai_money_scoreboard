import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BrandLogo } from './BrandLogo';
import { IconMail, IconLock, IconEye, IconEyeOff, IconUser, IconSearch, IconSparkle } from './icons';

const PURPLE = '#6c5ce7';
const BLUE = '#5b8def';

function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#4c1d95_0%,#5b21b6_25%,#6d28d9_50%,#4f46e5_75%,#2563eb_100%)]" />

      {/* Shade overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_15%_20%,rgba(139,92,246,0.55)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_85%_80%,rgba(59,130,246,0.5)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(30,20,80,0.25)_0%,transparent_70%)]" />

      {/* Edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(30,10,60,0.45)_100%)]" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Floating orbs — stronger */}
      <motion.div
        className="absolute top-[10%] left-[6%] w-72 h-72 rounded-full bg-[#c4b5fd]/20 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[8%] right-[4%] w-96 h-96 rounded-full bg-[#93c5fd]/25 blur-3xl"
        animate={{ y: [0, -25, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] left-[30%] w-[500px] h-[400px] rounded-full bg-[#7c3aed]/15 blur-[100px]"
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[45%] right-[18%] w-48 h-48 rounded-full bg-[#60a5fa]/25 blur-2xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Decorative rings */}
      <svg className="absolute top-[6%] right-[10%] w-52 h-52 opacity-[0.22]" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="1" />
        <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="0.5" />
      </svg>

      {/* Bottom-left shade arc */}
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#312e81]/40 blur-3xl" />
    </div>
  );
}

function WelcomeIllustration() {
  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7]/30 to-[#5b8def]/30 blur-2xl rounded-3xl scale-110" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_20px_50px_rgba(108,92,231,0.2)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#5b8def] flex items-center justify-center text-white">
              <IconSearch size={14} />
            </div>
            <span className="text-xs font-semibold text-ink">AI Readiness</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ede9fe] text-[#6c5ce7] font-medium">Live</span>
        </div>

        {/* Mini gauge */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#ede9fe" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke="url(#gauge-grad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="201"
                strokeDashoffset="54"
              />
              <defs>
                <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#6c5ce7" />
                  <stop offset="1" stopColor="#5b8def" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-lg font-bold text-[#6c5ce7]">73</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              { label: 'Schema', w: '85%' },
              { label: 'E-E-A-T', w: '70%' },
              { label: 'Content', w: '62%' },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[10px] text-faint mb-0.5">
                  <span>{bar.label}</span>
                </div>
                <div className="h-1.5 bg-[#ede9fe] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#5b8def]"
                    style={{ width: bar.w }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {['18 issues', '6 quick wins'].map((chip) => (
            <span
              key={chip}
              className="text-[10px] px-2.5 py-1 rounded-full bg-[#f5f3ff] border border-[#ddd6fe] text-[#6c5ce7] font-medium"
            >
              {chip}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Floating accent icons */}
      <motion.div
        className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#5b8def] flex items-center justify-center text-white shadow-lg"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <IconSparkle size={16} />
      </motion.div>
    </div>
  );
}

interface AuthCardLayoutProps {
  greeting: string;
  subtitle: string;
  welcomeTitle: string;
  welcomeText: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCardLayout({
  greeting,
  subtitle,
  welcomeTitle,
  welcomeText,
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[960px] z-10"
      >
        {/* Card halo / background shade */}
        <div className="absolute -inset-6 sm:-inset-8 rounded-[2.5rem] bg-gradient-to-br from-[#8b5cf6]/35 via-[#6366f1]/25 to-[#3b82f6]/35 blur-2xl pointer-events-none" />
        <div className="absolute -inset-3 sm:-inset-4 rounded-[2.25rem] bg-[#1e1b4b]/20 blur-xl pointer-events-none" />

        <div className="relative bg-white rounded-[2rem] shadow-[0_32px_100px_rgba(15,10,50,0.55),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[560px]">
          {/* Form panel */}
          <div className="flex-1 p-8 sm:p-10 lg:p-12 flex flex-col justify-center relative bg-gradient-to-br from-white via-white to-[#f5f3ff]/80">
            <div className="absolute top-0 left-0 w-56 h-56 bg-gradient-to-br from-[#ede9fe]/80 to-transparent rounded-br-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#ede9fe]/30 to-transparent pointer-events-none md:hidden" />

            <Link to="/" className="inline-block mb-8 relative z-10">
              <BrandLogo size="lg" />
            </Link>

            <h1 className="font-display text-4xl font-bold text-ink mb-1 relative z-10">{greeting}</h1>
            <p className="text-dim text-sm mb-8 relative z-10">{subtitle}</p>

            <div className="relative z-10">{children}</div>
            {footer}
          </div>

          {/* Welcome panel */}
          <div className="hidden md:flex flex-1 relative overflow-hidden">
            {/* Wavy divider */}
            <svg
              className="absolute left-0 top-0 h-full w-16 -translate-x-[55%] z-10 pointer-events-none"
              viewBox="0 0 80 500"
              preserveAspectRatio="none"
            >
              <path
                d="M80 0 C40 60 60 140 35 220 C10 300 50 380 80 500 L80 0 Z"
                fill="white"
              />
            </svg>

            <div className="flex-1 bg-gradient-to-br from-[#ede9fe]/90 via-[#e0e7ff]/70 to-[#bfdbfe]/50 flex flex-col items-center justify-center p-10 lg:p-12 text-center relative">
              {/* Panel shade layers */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(108,92,231,0.12)_0%,transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.15)_0%,transparent_55%)]" />
              <div className="absolute top-8 right-8 w-28 h-28 rounded-full border border-[#6c5ce7]/15 bg-[#6c5ce7]/5" />
              <div className="absolute bottom-12 left-8 w-20 h-20 rounded-full bg-[#6c5ce7]/10 blur-sm" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/30 blur-3xl pointer-events-none" />

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="relative z-10 w-full"
              >
                <WelcomeIllustration />

                <h2 className="font-display text-2xl font-bold text-ink mt-8 mb-3">{welcomeTitle}</h2>
                <p className="text-dim text-sm leading-relaxed max-w-xs mx-auto">{welcomeText}</p>

                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {['Scores', 'Issues', 'Fixes'].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1 rounded-full bg-white/80 border border-[#ddd6fe] text-[#6c5ce7] font-medium shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function AuthNeoInput({
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  minLength,
  trailing,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="auth-pill-input group flex items-center gap-3 bg-[#faf9ff] rounded-2xl px-4 py-3.5 border border-[#e9e5ff] shadow-[inset_0_1px_2px_rgba(108,92,231,0.04)] focus-within:border-[#6c5ce7]/50 focus-within:ring-2 focus-within:ring-[#6c5ce7]/15 focus-within:bg-white transition-all">
      <span className="shrink-0 text-[#a5a0c8] group-focus-within:text-[#6c5ce7] transition-colors">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full bg-transparent text-ink placeholder:text-[#b8b3d0] text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
      />
      {trailing}
    </div>
  );
}

export function AuthPasswordInput({
  value,
  onChange,
  required,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <AuthNeoInput
      icon={<IconLock size={18} />}
      type={show ? 'text' : 'password'}
      placeholder="Password"
      value={value}
      onChange={onChange}
      required={required}
      minLength={minLength}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="shrink-0 p-1 text-[#a5a0c8] hover:text-[#6c5ce7] transition-colors outline-none focus-visible:outline-none focus-visible:shadow-none"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
        </button>
      }
    />
  );
}

export function AuthGradientButton({
  children,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full rounded-2xl py-3.5 text-white font-bold text-sm tracking-widest uppercase bg-gradient-to-r from-[#6c5ce7] via-[#7c6cf0] to-[#5b8def] shadow-[0_10px_30px_rgba(108,92,231,0.45)] hover:shadow-[0_14px_36px_rgba(108,92,231,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

export function AuthCreateLink({ to, label = 'Create' }: { to: string; label?: string }) {
  return (
    <p className="text-center text-sm text-dim mt-6">
      Don&apos;t have an account?{' '}
      <Link to={to} className="font-semibold text-[#6c5ce7] hover:text-[#5b4cdb] hover:underline transition-colors">
        {label}
      </Link>
    </p>
  );
}

export function AuthSignInLink({ to }: { to: string }) {
  return (
    <p className="text-center text-sm text-dim mt-6">
      Already have an account?{' '}
      <Link to={to} className="font-semibold text-[#6c5ce7] hover:text-[#5b4cdb] hover:underline transition-colors">
        Sign in
      </Link>
    </p>
  );
}

export { IconMail, IconUser, PURPLE, BLUE };
