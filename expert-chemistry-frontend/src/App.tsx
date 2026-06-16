import { FormEvent, Suspense, lazy, useEffect, useState } from 'react';
import Layout from './components/Layout';
import { View } from './constants';
import { Language, LanguageProvider, useLanguage } from './i18n';
import type { AuthUser } from './types/auth';

import AuthView from './views/Auth';

const Dashboard = lazy(() => import('./views/Dashboard'));
const Reports = lazy(() => import('./views/Reports'));
const Methods = lazy(() => import('./views/Methods'));
const Spectrophotometry = lazy(() => import('./views/Spectrophotometry'));
const UserManagement = lazy(() => import('./views/UserManagement'));
const AuditLogs = lazy(() => import('./views/AuditLogs'));

type SpectrophotometryTab = 'calculate' | 'saved';
type ViewOptions = {
  spectrophotometryTab?: SpectrophotometryTab;
  reportsProjectKey?: string;
  reportsProjectLabel?: string;
};
type GlobalSearchRequest = {
  view: View;
  query: string;
  nonce: number;
};

const EMAIL_VERIFICATION_TEXT: Record<Language, {
  eyebrow: string;
  title: string;
  description: string;
  email: string;
  emailPlaceholder: string;
  code: string;
  codePlaceholder: string;
  sendCode: string;
  sending: string;
  confirm: string;
  confirming: string;
  codeSent: string;
  emailRequired: string;
  codeRequired: string;
  requestFailed: string;
  confirmFailed: string;
}> = {
  en: {
    eyebrow: 'Email confirmation',
    title: 'Add an email to continue',
    description: 'Your account needs a verified email before using password recovery. We will send a 6-digit code to confirm it.',
    email: 'Email',
    emailPlaceholder: 'chemist@example.com',
    code: 'Confirmation code',
    codePlaceholder: '6-digit code',
    sendCode: 'Send code',
    sending: 'Sending...',
    confirm: 'Confirm email',
    confirming: 'Confirming...',
    codeSent: 'Code sent. Check your inbox and enter it below.',
    emailRequired: 'Enter a valid email address.',
    codeRequired: 'Enter the confirmation code.',
    requestFailed: 'Unable to send confirmation code.',
    confirmFailed: 'Unable to confirm email.'
  },
  pt: {
    eyebrow: 'Confirmação de email',
    title: 'Adicione um email para continuar',
    description: 'Sua conta precisa de um email verificado para usar a recuperação de senha. Enviaremos um código de 6 dígitos para confirmar.',
    email: 'Email',
    emailPlaceholder: 'quimico@example.com',
    code: 'Código de confirmação',
    codePlaceholder: 'Código de 6 dígitos',
    sendCode: 'Enviar código',
    sending: 'Enviando...',
    confirm: 'Confirmar email',
    confirming: 'Confirmando...',
    codeSent: 'Código enviado. Confira sua caixa de entrada e informe o código abaixo.',
    emailRequired: 'Informe um email válido.',
    codeRequired: 'Informe o código de confirmação.',
    requestFailed: 'Não foi possível enviar o código de confirmação.',
    confirmFailed: 'Não foi possível confirmar o email.'
  },
  es: {
    eyebrow: 'Confirmación de email',
    title: 'Agrega un email para continuar',
    description: 'Tu cuenta necesita un email verificado para usar la recuperación de contraseña. Enviaremos un código de 6 dígitos para confirmarlo.',
    email: 'Email',
    emailPlaceholder: 'quimico@example.com',
    code: 'Código de confirmación',
    codePlaceholder: 'Código de 6 dígitos',
    sendCode: 'Enviar código',
    sending: 'Enviando...',
    confirm: 'Confirmar email',
    confirming: 'Confirmando...',
    codeSent: 'Código enviado. Revisa tu bandeja de entrada e ingrésalo abajo.',
    emailRequired: 'Ingresa un email válido.',
    codeRequired: 'Ingresa el código de confirmación.',
    requestFailed: 'No se pudo enviar el código de confirmación.',
    confirmFailed: 'No se pudo confirmar el email.'
  }
};

const ROLE_DEFAULT_VIEW: Record<AuthUser['role'], View> = {
  admin: 'dashboard',
  analyst: 'methods'
};

const ROLE_ALLOWED_VIEWS: Record<AuthUser['role'], View[]> = {
  admin: ['dashboard', 'spectrophotometry', 'reports', 'methods', 'user-management', 'audit-logs'],
  analyst: ['methods', 'reports', 'audit-logs']
};

function canAccessView(role: AuthUser['role'], view: View) {
  return ROLE_ALLOWED_VIEWS[role].includes(view);
}

function getSearchView(role: AuthUser['role'], activeView: View): View {
  const searchableViews: View[] = ['dashboard', 'spectrophotometry', 'reports', 'methods', 'user-management', 'audit-logs'];

  if (searchableViews.includes(activeView) && canAccessView(role, activeView)) {
    return activeView;
  }

  return role === 'admin' ? 'dashboard' : 'reports';
}

function ViewLoadingFallback() {
  const { t } = useLanguage();

  return (
    <div className="glass-panel rounded-[28px] px-8 py-6 text-center border-white/10">
      <p className="text-sm uppercase tracking-[0.28em] text-secondary font-semibold">{t('app.loadingView.title')}</p>
      <p className="mt-3 text-white/70">{t('app.loadingView.message')}</p>
    </div>
  );
}

function CheckingSessionFallback() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0b1121] text-white flex items-center justify-center">
      <div className="glass-panel rounded-[28px] px-8 py-6 text-center border-white/10">
        <p className="text-sm uppercase tracking-[0.28em] text-secondary font-semibold">{t('app.checkingSession.title')}</p>
        <p className="mt-3 text-white/70">{t('app.checkingSession.message')}</p>
      </div>
    </div>
  );
}

function RequiredEmailVerificationModal({ onVerified }: { onVerified: (user: AuthUser) => void }) {
  const { language } = useLanguage();
  const text = EMAIL_VERIFICATION_TEXT[language];
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const hasSentCode = Boolean(notice);

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError(text.emailRequired);
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/auth/email-verification/request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || text.requestFailed);
        return;
      }

      setEmail(typeof payload.email === 'string' ? payload.email : email.trim());
      setNotice(text.codeSent);
    } catch (requestError) {
      console.error('Failed to request email verification:', requestError);
      setError(text.requestFailed);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!code.trim()) {
      setError(text.codeRequired);
      return;
    }

    setIsConfirming(true);

    try {
      const response = await fetch('/api/auth/email-verification/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim()
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || text.confirmFailed);
        return;
      }

      const normalizedUser = normalizeAuthUser(payload.user);

      if (!normalizedUser) {
        setError(text.confirmFailed);
        return;
      }

      onVerified(normalizedUser);
    } catch (requestError) {
      console.error('Failed to confirm email verification:', requestError);
      setError(text.confirmFailed);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020617]/80 px-4 py-6 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-[28px] border-white/10 p-6 sm:p-8 shadow-2xl">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-secondary">{text.eyebrow}</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-display font-semibold text-white">{text.title}</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{text.description}</p>

        <form onSubmit={handleSendCode} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.email}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSending || isConfirming}
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/35 disabled:opacity-70"
              placeholder={text.emailPlaceholder}
            />
          </label>

          <button
            type="submit"
            disabled={isSending || isConfirming}
            className="w-full rounded-xl bg-secondary px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-on-secondary transition hover:shadow-[0_0_28px_rgba(118,243,234,0.22)] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSending ? text.sending : text.sendCode}
          </button>
        </form>

        {hasSentCode && (
          <form onSubmit={handleConfirmCode} className="mt-5 space-y-4">
            <div className="rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm text-secondary">
              {notice}
            </div>

            <label className="block space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.code}</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
                disabled={isConfirming}
                className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/35 disabled:opacity-70"
                placeholder={text.codePlaceholder}
              />
            </label>

            <button
              type="submit"
              disabled={isConfirming || isSending}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[#03263a] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isConfirming ? text.confirming : text.confirm}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffddd8]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AuthUser>;
  const parsedId =
    typeof candidate.id === 'number'
      ? candidate.id
      : typeof candidate.id === 'string'
        ? Number(candidate.id)
        : Number.NaN;

  if (!Number.isFinite(parsedId)) {
    return null;
  }

  return {
    id: parsedId,
    userId: typeof candidate.userId === 'string' ? candidate.userId : '',
    email: typeof candidate.email === 'string' ? candidate.email : '',
    fullName: typeof candidate.fullName === 'string' ? candidate.fullName : 'Unknown User',
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
    role: candidate.role === 'admin' ? 'admin' : 'analyst'
  };
}

function AppContent() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [viewResetKey, setViewResetKey] = useState(0);
  const [spectrophotometryInitialTab, setSpectrophotometryInitialTab] = useState<SpectrophotometryTab | undefined>();
  const [reportsInitialProjectKey, setReportsInitialProjectKey] = useState<string | undefined>();
  const [reportsInitialProjectLabel, setReportsInitialProjectLabel] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [globalSearchRequest, setGlobalSearchRequest] = useState<GlobalSearchRequest | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (isMounted) {
            setCurrentUser(null);
          }
          return;
        }

        const payload = await response.json();
        const normalizedUser = normalizeAuthUser(payload.user);

        if (isMounted) {
          setCurrentUser(normalizedUser);
          if (normalizedUser) {
            setActiveView((currentView) => (
              canAccessView(normalizedUser.role, currentView)
                ? currentView
                : ROLE_DEFAULT_VIEW[normalizedUser.role]
            ));
          }
        }
      } catch (error) {
        console.error('Failed to check current session:', error);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthenticated = (user: AuthUser) => {
    const normalizedUser = normalizeAuthUser(user);

    if (!normalizedUser) {
      console.error('Received invalid auth user payload:', user);
      setCurrentUser(null);
      return;
    }

    setCurrentUser(normalizedUser);
    setActiveView(ROLE_DEFAULT_VIEW[normalizedUser.role]);
    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setCurrentUser(null);
      setActiveView('dashboard');
      setSpectrophotometryInitialTab(undefined);
      setReportsInitialProjectKey(undefined);
      setReportsInitialProjectLabel(undefined);
    }
  };

  useEffect(() => {
    if (!currentUser || canAccessView(currentUser.role, activeView)) return;

    setActiveView(ROLE_DEFAULT_VIEW[currentUser.role]);
    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
  }, [activeView, currentUser]);

  const handleViewChange = (view: View) => {
    if (currentUser && !canAccessView(currentUser.role, view)) {
      setActiveView(ROLE_DEFAULT_VIEW[currentUser.role]);
      return;
    }

    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
    setActiveView((currentView) => {
      if (currentView === view) {
        setViewResetKey((currentKey) => currentKey + 1);
      }

      return view;
    });
  };

  const handleOpenView = (view: View, options?: ViewOptions) => {
    if (currentUser && !canAccessView(currentUser.role, view)) {
      setActiveView(ROLE_DEFAULT_VIEW[currentUser.role]);
      return;
    }

    setSpectrophotometryInitialTab(options?.spectrophotometryTab);
    setReportsInitialProjectKey(options?.reportsProjectKey);
    setReportsInitialProjectLabel(options?.reportsProjectLabel);
    setActiveView(view);
  };

  const handleGlobalSearch = (query: string) => {
    if (!currentUser) return;

    const targetView = getSearchView(currentUser.role, activeView);
    setSpectrophotometryInitialTab(undefined);
    setReportsInitialProjectKey(undefined);
    setReportsInitialProjectLabel(undefined);
    setGlobalSearchRequest((currentRequest) => ({
      view: targetView,
      query,
      nonce: (currentRequest?.nonce ?? 0) + 1
    }));
    setActiveView(targetView);
  };

  const getGlobalSearchForView = (view: View) => (
    globalSearchRequest?.view === view
      ? { query: globalSearchRequest.query, nonce: globalSearchRequest.nonce }
      : undefined
  );

  const renderView = (user: AuthUser) => {
    if (!canAccessView(user.role, activeView)) {
      return renderViewByKey(user, ROLE_DEFAULT_VIEW[user.role]);
    }

    return renderViewByKey(user, activeView);
  };

  const renderViewByKey = (user: AuthUser, view: View) => {
    switch (view) {
      case 'dashboard': return <Dashboard currentUser={user} onOpenView={handleOpenView} globalSearch={getGlobalSearchForView('dashboard')} />;
      case 'spectrophotometry': return <Spectrophotometry currentUser={user} initialTab={spectrophotometryInitialTab} globalSearch={getGlobalSearchForView('spectrophotometry')} />;
      case 'reports': return <Reports currentUser={user} initialProjectKey={reportsInitialProjectKey} initialProjectLabel={reportsInitialProjectLabel} globalSearch={getGlobalSearchForView('reports')} />;
      case 'methods': return <Methods currentUser={user} globalSearch={getGlobalSearchForView('methods')} />;
      case 'user-management': return <UserManagement currentUser={user} globalSearch={getGlobalSearchForView('user-management')} />;
      case 'audit-logs': return <AuditLogs globalSearch={getGlobalSearchForView('audit-logs')} />;
      default: return renderViewByKey(user, ROLE_DEFAULT_VIEW[user.role]);
    }
  };

  if (isCheckingSession) {
    return <CheckingSessionFallback />;
  }

  if (!currentUser) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Layout
      activeView={activeView}
      contentKey={`${activeView}:${viewResetKey}`}
      onViewChange={handleViewChange}
      onGlobalSearch={handleGlobalSearch}
      onLogout={handleLogout}
      user={{
        name: currentUser.fullName,
        role: `${currentUser.role.toUpperCase()} - ${currentUser.userId}`,
        userRole: currentUser.role
      }}
    >
      <Suspense fallback={<ViewLoadingFallback />}>
        {renderView(currentUser)}
      </Suspense>

      {!currentUser.email && (
        <RequiredEmailVerificationModal onVerified={setCurrentUser} />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
