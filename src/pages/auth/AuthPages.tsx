import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await loginWithEmail(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method). Please use Google Sign-In or enable Email/Password provider.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Invalid email or password.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Sign in to FormSaathi</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Access your saved jobs, application tracker, and Resume Studio.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="w-full py-2.5 px-4 text-sm font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-[#64748B]">
          <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-slate-800" />
          <span>or sign in with email</span>
          <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-slate-800" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold">Password</label>
              <Link to="/forgot-password" className="text-xs text-[#0D9488] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-center text-[#64748B] dark:text-slate-400">
          New to FormSaathi?{' '}
          <Link to="/register" className="font-semibold text-[#0D9488] hover:underline">
            Create a free account
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { loginWithGoogle, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-Up failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDoneMsg('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await registerWithEmail(name, email, password, consent);
      setDoneMsg(
        'Account created! A verification link has been sent to your email. Please verify your email before accessing personal Firestore storage.'
      );
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        setError(
          'Email/Password sign-up is not yet enabled in Firebase Console (Authentication -> Sign-in method). Please use Continue with Google or enable Email/Password.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Create your FormSaathi account</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Free access to job tracking, eligibility history, and ATS Resume Studio.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="w-full py-2.5 px-4 text-sm font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-[#64748B]">
          <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-slate-800" />
          <span>or register with email</span>
          <div className="flex-1 h-px bg-[#E2E8F0] dark:bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5">Password (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-[#64748B] dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 rounded border-slate-300"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-[#0D9488] underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-[#0D9488] underline">
                Privacy Policy
              </Link>{' '}
              for storing my career records.
            </span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-xs text-[#DC2626] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {doneMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-[#16A34A] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{doneMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            {busy ? 'Creating Account...' : 'Create Free Account'}
          </button>
        </form>

        <p className="text-xs text-center text-[#64748B] dark:text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#0D9488] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#0D9488]">
          <Mail className="w-5 h-5" />
          <h1 className="text-xl font-bold text-[#14243A] dark:text-white">Reset Password</h1>
        </div>
        <p className="text-xs text-[#64748B] dark:text-slate-400">
          Enter the email address linked to your FormSaathi account to receive a password reset link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          {error && <p className="text-xs text-[#DC2626]">{error}</p>}
          {sent && (
            <p className="text-xs text-[#16A34A]">
              Password reset instructions sent if an account exists for {email}.
            </p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Send Reset Link
          </button>
        </form>
        <Link to="/login" className="block text-center text-xs text-[#0D9488] hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
