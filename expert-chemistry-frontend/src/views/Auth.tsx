import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Atom, KeyRound, LockKeyhole, User, UserPlus } from 'lucide-react';
import type { AuthUser } from '../types/auth';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'signup';

interface FormState {
  userId: string;
  fullName: string;
  password: string;
}

const INITIAL_FORM: FormState = {
  userId: '',
  fullName: '',
  password: ''
};

export default function AuthView({ onAuthenticated }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowPublicSignup, setAllowPublicSignup] = useState(false);
  const [isCheckingSignup, setIsCheckingSignup] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSetupStatus() {
      try {
        const response = await fetch('/api/auth/setup-status');

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { allowPublicSignup?: boolean };

        if (isMounted) {
          const shouldAllowSignup = payload.allowPublicSignup === true;
          setAllowPublicSignup(shouldAllowSignup);
          if (!shouldAllowSignup) {
            setMode('login');
          }
        }
      } catch (requestError) {
        console.error('Failed to load auth setup status:', requestError);
      } finally {
        if (isMounted) {
          setIsCheckingSignup(false);
        }
      }
    }

    void loadSetupStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const title = useMemo(
    () => mode === 'login' ? 'Access the Expert Chemistry platform' : 'Create the initial administrator account',
    [mode]
  );

  const subtitle = useMemo(
    () => mode === 'login'
      ? 'Sign in with your credentials to access analytical workflows, secured reports, and laboratory administration tools.'
      : allowPublicSignup
        ? 'Set up the first platform account. The initial account is automatically granted administrator privileges.'
        : 'Public account creation is disabled. Please contact an administrator to provision your access.',
    [allowPublicSignup, mode]
  );

  const resetForMode = (nextMode: AuthMode) => {
    if (nextMode === 'signup' && !allowPublicSignup) {
      return;
    }

    setMode(nextMode);
    setError('');
    setForm(INITIAL_FORM);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'signup' && !allowPublicSignup) {
      setError('Public sign-up is disabled. Ask an administrator to create your account.');
      return;
    }

    if (!form.userId.trim() || !form.password || (mode === 'signup' && !form.fullName.trim())) {
      setError(mode === 'signup' ? 'Please fill in all fields.' : 'Please fill in User ID and password.');
      return;
    }

    if (mode === 'signup' && form.password.length < 7) {
      setError('Password must be more than 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: form.userId.trim(),
          fullName: form.fullName.trim(),
          password: form.password
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Authentication failed.');
        return;
      }

      onAuthenticated(payload.user as AuthUser);
    } catch (requestError) {
      console.error('Authentication request failed:', requestError);
      setError('Could not reach the authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1121] text-white overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(118,243,234,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(167,200,255,0.18),_transparent_30%)]" />
        <div className="absolute inset-0 lab-grid opacity-40" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-6xl grid gap-10 lg:grid-cols-[1.2fr_0.9fr] items-stretch">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="glass-panel rounded-[32px] p-8 md:p-12 border-white/10"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-secondary/20 bg-secondary/10 px-4 py-2 text-secondary text-xs uppercase tracking-[0.28em] font-semibold">
              <Atom size={14} />
              Secure Lab Access
            </div>

            <div className="mt-8 max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight text-white">
                Secure access for analytical operations and laboratory oversight.
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/70 leading-8">
                Expert Chemistry centralizes spectrophotometry workflows, controlled user access, and operational reporting in a protected environment built for professional laboratory use.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                'Protected session access with server-managed authentication',
                'Credential policies aligned with minimum password validation',
                'Administrator-controlled user provisioning after initial setup'
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/75">
                  {item}
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="glass-panel rounded-[32px] p-8 border-white/10 shadow-2xl"
          >
            <div className="flex rounded-2xl bg-white/[0.04] p-1.5 mb-8">
              <button
                type="button"
                onClick={() => resetForMode('login')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === 'login' ? 'bg-white text-[#0b1121]' : 'text-white/60 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => resetForMode('signup')}
                disabled={!allowPublicSignup || isCheckingSignup}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-[#0b1121]'
                    : allowPublicSignup
                      ? 'text-white/60 hover:text-white'
                      : 'text-white/25 cursor-not-allowed'
                }`}
              >
                Sign Up
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-display font-semibold">{title}</h2>
              <p className="mt-3 text-sm text-white/65 leading-6">{subtitle}</p>
            </div>

            {!allowPublicSignup && !isCheckingSignup && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-4 text-sm text-secondary">
                <LockKeyhole size={18} className="mt-0.5 shrink-0" />
                <p>
                  Account registration is restricted after the initial platform setup. New user access must be provisioned by an administrator.
                </p>
              </div>
            )}

            {allowPublicSignup && !isCheckingSignup && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-primary">
                <LockKeyhole size={18} className="mt-0.5 shrink-0" />
                <p>
                  Initial setup mode is active. Create the first account to establish administrative control of the platform.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                  User ID
                </span>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    value={form.userId}
                    onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                    placeholder="chemist_01"
                  />
                </div>
              </label>

              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    Full Name
                  </span>
                  <div className="relative">
                    <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      value={form.fullName}
                      onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                      placeholder="Dr. Marie Curie"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                  Password
                </span>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                    placeholder="More than 6 characters"
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffddd8]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isCheckingSignup}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-3.5 text-sm font-semibold text-[#03263a] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
