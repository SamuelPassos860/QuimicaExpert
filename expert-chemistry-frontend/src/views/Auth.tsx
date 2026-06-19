import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Atom, KeyRound, Languages, LockKeyhole, User, UserPlus } from 'lucide-react';
import { LANGUAGE_OPTIONS, Language, useLanguage } from '../i18n';
import type { AuthUser } from '../types/auth';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';

interface FormState {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  resetToken: string;
}

const INITIAL_FORM: FormState = {
  userId: '',
  email: '',
  fullName: '',
  password: '',
  confirmPassword: '',
  resetToken: ''
};

const AUTH_TEXT: Record<Language, {
  languageTitle: string;
  languageLabels: Record<Language, string>;
  badge: string;
  heroTitle: string;
  heroDescription: string;
  featureCards: string[];
  titles: Record<AuthMode, string>;
  subtitles: Record<AuthMode, string>;
  signupDisabledSubtitle: string;
  restrictedNotice: string;
  setupNotice: string;
  backToSignIn: string;
  userId: string;
  email: string;
  resetToken: string;
  resetTokenPlaceholder: string;
  fullName: string;
  password: string;
  newPassword: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  forgotPassword: string;
  resetNow: string;
  pleaseWait: string;
  submit: Record<AuthMode, string>;
  errors: {
    forgotUserId: string;
    forgotFailed: string;
    forgotService: string;
    resetMissingFields: string;
    passwordLength: string;
    passwordMismatch: string;
    resetFailed: string;
    resetService: string;
    signupDisabled: string;
    missingSignupFields: string;
    missingLoginFields: string;
    authFailed: string;
    authService: string;
  };
  notices: {
    resetLinkReady: string;
    resetRequestRecorded: string;
    resetSuccess: string;
  };
}> = {
  en: {
    languageTitle: 'Language',
    languageLabels: { en: 'English', pt: 'Portuguese', es: 'Spanish' },
    badge: 'Secure Lab Access',
    heroTitle: 'Secure access for analytical operations and laboratory oversight.',
    heroDescription: 'Expert Chemistry centralizes spectrophotometry workflows, controlled user access, and operational reporting in a protected environment built for professional laboratory use.',
    featureCards: [
      'Protected session access with server-managed authentication',
      'Credential policies aligned with minimum password validation',
      'Administrator-controlled user provisioning after initial setup'
    ],
    titles: {
      login: 'Access the Expert Chemistry platform',
      signup: 'Create the initial administrator account',
      'forgot-password': 'Recover access to your account',
      'reset-password': 'Create a new password'
    },
    subtitles: {
      login: 'Sign in with your credentials to access analytical workflows, secured reports, and laboratory administration tools.',
      signup: 'Set up the first platform account. The initial account is automatically granted administrator privileges.',
      'forgot-password': 'Enter your User ID and we will send a confirmation link to the email registered for this account.',
      'reset-password': 'Use the temporary token from your recovery link and choose a new password with more than 6 characters.'
    },
    signupDisabledSubtitle: 'Public account creation is disabled. Please contact an administrator to provision your access.',
    restrictedNotice: 'Account registration is restricted after the initial platform setup. New user access must be provisioned by an administrator.',
    setupNotice: 'Initial setup mode is active. Create the first account to establish administrative control of the platform.',
    backToSignIn: 'Back to sign in',
    userId: 'User ID',
    email: 'Email',
    resetToken: 'Reset Token',
    resetTokenPlaceholder: 'Paste your reset token',
    fullName: 'Full Name',
    password: 'Password',
    newPassword: 'New Password',
    passwordPlaceholder: 'More than 6 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Repeat your new password',
    forgotPassword: 'Forgot your password?',
    resetNow: 'Reset password now',
    pleaseWait: 'Please wait...',
    submit: {
      login: 'Sign In',
      signup: 'Create Account',
      'forgot-password': 'Send Confirmation Email',
      'reset-password': 'Reset Password'
    },
    errors: {
      forgotUserId: 'Enter your User ID to request password recovery.',
      forgotFailed: 'Could not request password recovery.',
      forgotService: 'Could not reach the password recovery service.',
      resetMissingFields: 'Enter the token, new password, and confirmation.',
      passwordLength: 'Password must be more than 6 characters long.',
      passwordMismatch: 'Confirmation must match the new password.',
      resetFailed: 'Could not reset the password.',
      resetService: 'Could not reach the password reset service.',
      signupDisabled: 'Public sign-up is disabled. Ask an administrator to create your account.',
      missingSignupFields: 'Please fill in all fields.',
      missingLoginFields: 'Please fill in User ID and password.',
      authFailed: 'Authentication failed.',
      authService: 'Could not reach the authentication service.'
    },
    notices: {
      resetLinkReady: 'Request recorded. Check your email to confirm the password reset.',
      resetRequestRecorded: 'If this User ID exists and has an email address, a confirmation link has been sent.',
      resetSuccess: 'Password reset successfully. Return to sign in with the new password.'
    }
  },
  pt: {
    languageTitle: 'Idioma',
    languageLabels: { en: 'Inglês', pt: 'Português', es: 'Espanhol' },
    badge: 'Acesso Seguro ao Laboratório',
    heroTitle: 'Acesso seguro para operações analíticas e supervisão laboratorial.',
    heroDescription: 'O Expert Chemistry centraliza fluxos de espectrofotometria, acesso controlado de usuários e relatórios operacionais em um ambiente protegido para uso profissional em laboratório.',
    featureCards: [
      'Acesso de sessão protegido com autenticação gerenciada pelo servidor',
      'Políticas de credenciais alinhadas à validação mínima de senha',
      'Provisionamento de usuários controlado por administrador após a configuração inicial'
    ],
    titles: {
      login: 'Acesse a plataforma Expert Chemistry',
      signup: 'Crie a conta inicial de administrador',
      'forgot-password': 'Recupere o acesso à sua conta',
      'reset-password': 'Crie uma nova senha'
    },
    subtitles: {
      login: 'Entre com suas credenciais para acessar fluxos analíticos, relatórios protegidos e ferramentas de administração do laboratório.',
      signup: 'Configure a primeira conta da plataforma. A conta inicial recebe privilégios de administrador automaticamente.',
      'forgot-password': 'Informe seu User ID e enviaremos um link de confirmação para o email cadastrado nesta conta.',
      'reset-password': 'Use o token temporário do link de recuperação e escolha uma nova senha com mais de 6 caracteres.'
    },
    signupDisabledSubtitle: 'A criação pública de contas está desativada. Entre em contato com um administrador para provisionar seu acesso.',
    restrictedNotice: 'O cadastro de contas fica restrito após a configuração inicial. Novos acessos devem ser provisionados por um administrador.',
    setupNotice: 'O modo de configuração inicial está ativo. Crie a primeira conta para estabelecer o controle administrativo da plataforma.',
    backToSignIn: 'Voltar para o login',
    userId: 'User ID',
    email: 'Email',
    resetToken: 'Token de Redefinição',
    resetTokenPlaceholder: 'Cole seu token de redefinição',
    fullName: 'Nome Completo',
    password: 'Senha',
    newPassword: 'Nova Senha',
    passwordPlaceholder: 'Mais de 6 caracteres',
    confirmPassword: 'Confirmar Senha',
    confirmPasswordPlaceholder: 'Repita sua nova senha',
    forgotPassword: 'Esqueceu sua senha?',
    resetNow: 'Redefinir senha agora',
    pleaseWait: 'Aguarde...',
    submit: {
      login: 'Entrar',
      signup: 'Criar Conta',
      'forgot-password': 'Enviar Email de Confirmação',
      'reset-password': 'Redefinir Senha'
    },
    errors: {
      forgotUserId: 'Informe seu User ID para solicitar a recuperação de senha.',
      forgotFailed: 'Não foi possível solicitar a recuperação de senha.',
      forgotService: 'Não foi possível alcançar o serviço de recuperação de senha.',
      resetMissingFields: 'Informe o token, a nova senha e a confirmação.',
      passwordLength: 'A senha precisa ter mais de 6 caracteres.',
      passwordMismatch: 'A confirmação precisa ser igual à nova senha.',
      resetFailed: 'Não foi possível redefinir a senha.',
      resetService: 'Não foi possível alcançar o serviço de redefinição de senha.',
      signupDisabled: 'O cadastro público está desativado. Peça para um administrador criar sua conta.',
      missingSignupFields: 'Preencha todos os campos.',
      missingLoginFields: 'Preencha User ID e senha.',
      authFailed: 'Falha na autenticação.',
      authService: 'Não foi possível alcançar o serviço de autenticação.'
    },
    notices: {
      resetLinkReady: 'Solicitação registrada. Confira seu email para confirmar a redefinição de senha.',
      resetRequestRecorded: 'Se este User ID existir e tiver email cadastrado, um link de confirmação foi enviado.',
      resetSuccess: 'Senha redefinida com sucesso. Volte para o login e entre com a nova senha.'
    }
  },
  es: {
    languageTitle: 'Idioma',
    languageLabels: { en: 'Inglés', pt: 'Portugués', es: 'Español' },
    badge: 'Acceso Seguro al Laboratorio',
    heroTitle: 'Acceso seguro para operaciones analíticas y supervisión de laboratorio.',
    heroDescription: 'Expert Chemistry centraliza flujos de espectrofotometría, acceso controlado de usuarios e informes operativos en un entorno protegido para uso profesional de laboratorio.',
    featureCards: [
      'Acceso de sesión protegido con autenticación gestionada por el servidor',
      'Políticas de credenciales alineadas con validación mínima de contraseña',
      'Provisión de usuarios controlada por administrador tras la configuración inicial'
    ],
    titles: {
      login: 'Accede a la plataforma Expert Chemistry',
      signup: 'Crea la cuenta inicial de administrador',
      'forgot-password': 'Recupera el acceso a tu cuenta',
      'reset-password': 'Crea una nueva contraseña'
    },
    subtitles: {
      login: 'Inicia sesión con tus credenciales para acceder a flujos analíticos, informes protegidos y herramientas de administración del laboratorio.',
      signup: 'Configura la primera cuenta de la plataforma. La cuenta inicial recibe privilegios de administrador automáticamente.',
      'forgot-password': 'Ingresa tu User ID y enviaremos un enlace de confirmación al email registrado en esta cuenta.',
      'reset-password': 'Usa el token temporal del enlace de recuperación y elige una nueva contraseña con más de 6 caracteres.'
    },
    signupDisabledSubtitle: 'La creación pública de cuentas está desactivada. Contacta a un administrador para aprovisionar tu acceso.',
    restrictedNotice: 'El registro de cuentas queda restringido después de la configuración inicial. Un administrador debe aprovisionar nuevos accesos.',
    setupNotice: 'El modo de configuración inicial está activo. Crea la primera cuenta para establecer el control administrativo de la plataforma.',
    backToSignIn: 'Volver al inicio de sesión',
    userId: 'User ID',
    email: 'Email',
    resetToken: 'Token de Restablecimiento',
    resetTokenPlaceholder: 'Pega tu token de restablecimiento',
    fullName: 'Nombre Completo',
    password: 'Contraseña',
    newPassword: 'Nueva Contraseña',
    passwordPlaceholder: 'Más de 6 caracteres',
    confirmPassword: 'Confirmar Contraseña',
    confirmPasswordPlaceholder: 'Repite tu nueva contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetNow: 'Restablecer contraseña ahora',
    pleaseWait: 'Espera...',
    submit: {
      login: 'Iniciar Sesión',
      signup: 'Crear Cuenta',
      'forgot-password': 'Enviar Email de Confirmación',
      'reset-password': 'Restablecer Contraseña'
    },
    errors: {
      forgotUserId: 'Ingresa tu User ID para solicitar la recuperación de contraseña.',
      forgotFailed: 'No se pudo solicitar la recuperación de contraseña.',
      forgotService: 'No se pudo contactar el servicio de recuperación de contraseña.',
      resetMissingFields: 'Ingresa el token, la nueva contraseña y la confirmación.',
      passwordLength: 'La contraseña debe tener más de 6 caracteres.',
      passwordMismatch: 'La confirmación debe coincidir con la nueva contraseña.',
      resetFailed: 'No se pudo restablecer la contraseña.',
      resetService: 'No se pudo contactar el servicio de restablecimiento de contraseña.',
      signupDisabled: 'El registro público está desactivado. Pide a un administrador que cree tu cuenta.',
      missingSignupFields: 'Completa todos los campos.',
      missingLoginFields: 'Completa User ID y contraseña.',
      authFailed: 'Error de autenticación.',
      authService: 'No se pudo contactar el servicio de autenticación.'
    },
    notices: {
      resetLinkReady: 'Solicitud registrada. Revisa tu email para confirmar el restablecimiento de contraseña.',
      resetRequestRecorded: 'Si este User ID existe y tiene email registrado, se envió un enlace de confirmación.',
      resetSuccess: 'Contraseña restablecida correctamente. Vuelve al inicio de sesión con la nueva contraseña.'
    }
  }
};

export default function AuthView({ onAuthenticated }: AuthViewProps) {
  const { language, setLanguage } = useLanguage();
  const text = AUTH_TEXT[language];
  const [isLanguageOpen, setLanguageOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowPublicSignup, setAllowPublicSignup] = useState(false);
  const [isCheckingSignup, setIsCheckingSignup] = useState(true);

  useEffect(() => {
    const applyModeFromHash = () => {
      const hashValue = window.location.hash.replace(/^#\/?/, '');
      const [hashMode, hashQuery = ''] = hashValue.split('?');

      if (hashMode === 'forgot-password') {
        setMode('forgot-password');
        return;
      }

      if (hashMode === 'reset-password') {
        const token = new URLSearchParams(hashQuery).get('token') || '';
        setMode('reset-password');
        setForm((current) => ({ ...current, resetToken: token }));
        return;
      }

      if (hashMode === 'signup') {
        setMode('signup');
        return;
      }

      setMode('login');
    };

    applyModeFromHash();
    window.addEventListener('hashchange', applyModeFromHash);

    return () => {
      window.removeEventListener('hashchange', applyModeFromHash);
    };
  }, []);

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

  const title = useMemo(() => text.titles[mode], [mode, text]);

  const subtitle = useMemo(
    () => {
      if (mode === 'signup' && !allowPublicSignup) {
        return text.signupDisabledSubtitle;
      }

      return text.subtitles[mode];
    },
    [allowPublicSignup, mode, text]
  );

  const resetForMode = (nextMode: AuthMode) => {
    if (nextMode === 'signup' && !allowPublicSignup) {
      return;
    }

    setMode(nextMode);
    setError('');
    setNotice('');
    setForm(INITIAL_FORM);
    window.location.hash = nextMode === 'login' ? '#/login' : `#/${nextMode}`;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'forgot-password') {
      if (!form.userId.trim()) {
        setError(text.errors.forgotUserId);
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: form.userId.trim()
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          setError(payload.error || text.errors.forgotFailed);
          return;
        }

        setNotice(text.notices.resetRequestRecorded);
      } catch (requestError) {
        console.error('Password reset request failed:', requestError);
        setError(text.errors.forgotService);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'reset-password') {
      if (!form.resetToken.trim() || !form.password || !form.confirmPassword) {
        setError(text.errors.resetMissingFields);
        return;
      }

      if (form.password.length < 7) {
        setError(text.errors.passwordLength);
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError(text.errors.passwordMismatch);
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: form.resetToken.trim(),
            password: form.password
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          setError(payload.error || text.errors.resetFailed);
          return;
        }

        setNotice(text.notices.resetSuccess);
        setForm(INITIAL_FORM);
      } catch (requestError) {
        console.error('Password reset failed:', requestError);
        setError(text.errors.resetService);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (mode === 'signup' && !allowPublicSignup) {
      setError(text.errors.signupDisabled);
      return;
    }

    if (!form.userId.trim() || !form.password || (mode === 'signup' && (!form.email.trim() || !form.fullName.trim()))) {
      setError(mode === 'signup' ? text.errors.missingSignupFields : text.errors.missingLoginFields);
      return;
    }

    if (mode === 'signup' && form.password.length < 7) {
      setError(text.errors.passwordLength);
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
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          password: form.password
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || text.errors.authFailed);
        return;
      }

      onAuthenticated(payload.user as AuthUser);
    } catch (requestError) {
      console.error('Authentication request failed:', requestError);
      setError(text.errors.authService);
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

      <div className="absolute right-6 top-6 z-20">
        <button
          type="button"
          aria-expanded={isLanguageOpen}
          aria-controls="auth-language-panel"
          onClick={() => setLanguageOpen((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-[0.18em] transition-all ${
            isLanguageOpen
              ? 'text-primary bg-primary/10 border-primary/20'
              : 'text-white/55 hover:text-white hover:bg-white/5 border-white/10'
          }`}
        >
          <Languages size={18} />
          {language.toUpperCase()}
        </button>

        {isLanguageOpen && (
          <div
            id="auth-language-panel"
            className="absolute right-0 top-12 z-30 w-56 rounded-2xl border border-white/10 bg-[#0b1121]/98 p-2 shadow-[0_24px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl"
          >
            <p className="px-3 pb-2 pt-1 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-white/35">
              {text.languageTitle}
            </p>
            <div className="space-y-1">
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = language === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setLanguage(option.id);
                      setLanguageOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'bg-primary/12 text-primary border border-primary/20'
                        : 'text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="text-sm font-semibold">{text.languageLabels[option.id]}</span>
                    <span className="ml-2 text-[10px] font-mono text-white/30">{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
              {text.badge}
            </div>

            <div className="mt-8 max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight text-white">
                {text.heroTitle}
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/70 leading-8">
                {text.heroDescription}
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {text.featureCards.map((item) => (
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
            <div>
              <h2 className="text-2xl font-display font-semibold">{title}</h2>
              <p className="mt-3 text-sm text-white/65 leading-6">{subtitle}</p>
            </div>

            {!allowPublicSignup && !isCheckingSignup && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-4 text-sm text-secondary">
                <LockKeyhole size={18} className="mt-0.5 shrink-0" />
                <p>
                  {text.restrictedNotice}
                </p>
              </div>
            )}

            {allowPublicSignup && !isCheckingSignup && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-primary">
                <LockKeyhole size={18} className="mt-0.5 shrink-0" />
                <p>
                  {text.setupNotice}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {(mode === 'forgot-password' || mode === 'reset-password') && (
                <button
                  type="button"
                  onClick={() => resetForMode('login')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-secondary transition hover:text-white"
                >
                  <ArrowLeft size={16} />
                  {text.backToSignIn}
                </button>
              )}

              {mode !== 'reset-password' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {text.userId}
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
              )}

              {mode === 'reset-password' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {text.resetToken}
                  </span>
                  <div className="relative">
                    <LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      value={form.resetToken}
                      onChange={(event) => setForm((current) => ({ ...current, resetToken: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                      placeholder={text.resetTokenPlaceholder}
                    />
                  </div>
                </label>
              )}

              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {text.email}
                  </span>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                      placeholder="chemist@example.com"
                    />
                  </div>
                </label>
              )}

              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {text.fullName}
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

              {mode !== 'forgot-password' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {mode === 'reset-password' ? text.newPassword : text.password}
                  </span>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                      placeholder={text.passwordPlaceholder}
                    />
                  </div>
                </label>
              )}

              {mode === 'reset-password' && (
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-secondary font-semibold">
                    {text.confirmPassword}
                  </span>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-12 pr-4 text-sm text-white outline-none transition focus:border-primary/40 focus:bg-white/[0.08]"
                      placeholder={text.confirmPasswordPlaceholder}
                    />
                  </div>
                </label>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => resetForMode('forgot-password')}
                    className="text-sm font-semibold text-secondary transition hover:text-white"
                  >
                    {text.forgotPassword}
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-4 py-3 text-sm text-[#ffddd8]">
                  {error}
                </div>
              )}

              {notice && (
                <div className="rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isCheckingSignup}
                className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-3.5 text-sm font-semibold text-[#03263a] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting
                  ? text.pleaseWait
                  : text.submit[mode]}
              </button>
            </form>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
