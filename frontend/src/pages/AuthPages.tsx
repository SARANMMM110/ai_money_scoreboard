import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Access your scan history and reports">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-sig-critical bg-sig-critical/10 border border-sig-critical/20 rounded-lg px-4 py-3">{error}</div>}
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs text-brand hover:text-brand-deep">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-brand text-bg font-semibold py-3 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-text-dim text-center mt-6">
        No account? <Link to="/register" className="text-brand hover:text-brand-deep">Register</Link>
      </p>
      <p className="text-xs text-text-faint text-center mt-4">
        Demo: demo@aimoneyscoreboard.com (any password in dev mode)
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start auditing your site for AI search readiness">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-sig-critical bg-sig-critical/10 border border-sig-critical/20 rounded-lg px-4 py-3">{error}</div>}
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
        <button type="submit" disabled={loading} className="w-full bg-brand text-bg font-semibold py-3 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-50">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-text-dim text-center mt-6">
        Already have an account? <Link to="/login" className="text-brand hover:text-brand-deep">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.auth.forgot(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-sig-critical bg-sig-critical/10 rounded-lg px-4 py-3">{error}</div>}
        {message && <div className="text-sm text-brand bg-brand/10 rounded-lg px-4 py-3">{message}</div>}
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <button type="submit" disabled={loading} className="w-full bg-brand text-bg font-semibold py-3 rounded-lg hover:bg-brand-deep transition-colors disabled:opacity-50">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="text-sm text-text-dim text-center mt-6">
        <Link to="/login" className="text-brand hover:text-brand-deep">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-xl font-semibold tracking-tight block text-center mb-8">
          AI Money<span className="text-brand">.</span>
        </Link>
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-panel">
          <h1 className="font-display text-2xl font-semibold mb-1">{title}</h1>
          <p className="text-text-dim text-sm mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full bg-surface-2 border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-brand transition-colors"
      />
    </div>
  );
}
