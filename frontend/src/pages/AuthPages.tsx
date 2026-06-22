import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PRODUCT_NAME } from '../components/BrandLogo';
import {
  AuthCardLayout,
  AuthNeoInput,
  AuthPasswordInput,
  AuthGradientButton,
  AuthCreateLink,
  AuthSignInLink,
  IconMail,
  IconUser,
} from '../components/AuthCardLayout';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app';

  useEffect(() => {
    const saved = localStorage.getItem('remember_email');
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem('remember_email', email);
      else localStorage.removeItem('remember_email');
      navigate(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardLayout
      greeting="Hello!"
      subtitle="Sign in to your account"
      welcomeTitle="Welcome Back!"
      welcomeText={`Sign in to ${PRODUCT_NAME} and see how AI search engines read your site — with scores, issues, and paste-ready fixes waiting for you.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-critical bg-critical-soft border border-critical/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <AuthNeoInput
          icon={<IconMail size={18} />}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={setEmail}
          required
        />

        <AuthPasswordInput value={password} onChange={setPassword} required />

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-dim">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[#ddd6fe] focus:ring-[#6c5ce7]/30"
              style={{ accentColor: '#6c5ce7' }}
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[#6c5ce7] hover:text-[#5b4cdb] hover:underline transition-colors">
            Forgot password?
          </Link>
        </div>

        <div className="pt-3">
          <AuthGradientButton loading={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </AuthGradientButton>
        </div>
      </form>

      <AuthCreateLink to="/register" />

    </AuthCardLayout>
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
    <AuthCardLayout
      greeting="Hello!"
      subtitle="Create your account"
      welcomeTitle="Get Started"
      welcomeText={`Join ${PRODUCT_NAME} and run your first AI search readiness scan in minutes. Know exactly what to fix so ChatGPT, Perplexity, and Google AI can cite your content.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-critical bg-critical-soft border border-critical/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        <AuthNeoInput icon={<IconUser size={18} />} placeholder="Name" value={name} onChange={setName} />
        <AuthNeoInput icon={<IconMail size={18} />} type="email" placeholder="E-mail" value={email} onChange={setEmail} required />
        <AuthPasswordInput value={password} onChange={setPassword} required minLength={6} />
        <div className="pt-3">
          <AuthGradientButton loading={loading}>
            {loading ? 'Creating…' : 'Create Account'}
          </AuthGradientButton>
        </div>
      </form>
      <AuthSignInLink to="/login" />
    </AuthCardLayout>
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
    <AuthCardLayout
      greeting="Hello!"
      subtitle="Reset your password"
      welcomeTitle="Forgot Password?"
      welcomeText="Enter your email and we'll send you a link to reset your password and get back into your account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-critical bg-critical-soft rounded-xl px-4 py-3">{error}</div>
        )}
        {message && (
          <div className="text-sm rounded-xl px-4 py-3 bg-[#ede9fe] text-[#5b2d9a]">{message}</div>
        )}
        <AuthNeoInput icon={<IconMail size={18} />} type="email" placeholder="E-mail" value={email} onChange={setEmail} required />
        <div className="pt-3">
          <AuthGradientButton loading={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </AuthGradientButton>
        </div>
      </form>
      <AuthSignInLink to="/login" />
    </AuthCardLayout>
  );
}
