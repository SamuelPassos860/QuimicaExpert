import { FormEvent, useEffect, useState } from 'react';
import { Search, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react';
import type { AuthUser, UserRole } from '../types/auth';
import { useLanguage } from '../i18n';

interface UserManagementProps {
  currentUser: AuthUser;
  globalSearch?: { query: string; nonce: number };
}

interface CreateUserFormState {
  userId: string;
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
}

const USER_MANAGEMENT_TEXT = {
  en: {
    title: 'User Management',
    adminOnly: 'This area is only available to administrators.',
    adminControl: 'Admin Control',
    description: 'Public sign-up is closed after setup. Admins create new users here and control who has elevated access.',
    registeredUsers: 'Registered Users',
    admins: 'Admins',
    searchUsers: 'Search users',
    searchUsersPlaceholder: 'Search by name, User ID, email or role...',
    accountProvisioning: 'Account Provisioning',
    createNewUser: 'Create a new user',
    userId: 'User ID',
    email: 'Email',
    fullName: 'Full Name',
    password: 'Password',
    passwordPlaceholder: 'More than 6 characters',
    role: 'Role',
    analyst: 'Analyst',
    admin: 'Admin',
    fillAll: 'Please fill in all fields.',
    passwordLength: 'Password must be more than 6 characters long.',
    createError: 'Unable to create user.',
    createNowError: 'Unable to create user right now.',
    created: 'User created successfully.',
    creating: 'Creating...',
    createUser: 'Create User',
    loadError: 'Unable to load users right now.',
    updateError: 'Unable to update user role.',
    updateNowError: 'Unable to update user role right now.',
    accessRegistry: 'Access Registry',
    rolesPrivileges: 'Roles and privileges',
    loadingUsers: 'Loading users...',
    createdLabel: 'Created',
    privileges: 'Privileges',
    adminPrivileges: 'Can manage users, compounds, and metrics',
    analystPrivileges: 'Methods, reports, and audit logs only',
    updating: 'Updating...',
    setAnalyst: 'Set As Analyst',
    promoteAdmin: 'Promote To Admin',
    currentSession: 'Current Session'
  },
  pt: {
    title: 'Gerenciamento de Usuários',
    adminOnly: 'Esta área está disponível apenas para administradores.',
    adminControl: 'Controle Administrativo',
    description: 'O cadastro público fica fechado após a configuração. Administradores criam novos usuários aqui e controlam quem possui acesso elevado.',
    registeredUsers: 'Usuários Registrados',
    admins: 'Administradores',
    searchUsers: 'Pesquisar usuários',
    searchUsersPlaceholder: 'Pesquisar por nome, User ID, email ou função...',
    accountProvisioning: 'Provisionamento de Conta',
    createNewUser: 'Criar novo usuário',
    userId: 'ID do Usuário',
    email: 'Email',
    fullName: 'Nome Completo',
    password: 'Senha',
    passwordPlaceholder: 'Mais de 6 caracteres',
    role: 'Função',
    analyst: 'Analista',
    admin: 'Administrador',
    fillAll: 'Preencha todos os campos.',
    passwordLength: 'A senha deve ter mais de 6 caracteres.',
    createError: 'Não foi possível criar o usuário.',
    createNowError: 'Não foi possível criar o usuário agora.',
    created: 'Usuário criado com sucesso.',
    creating: 'Criando...',
    createUser: 'Criar Usuário',
    loadError: 'Não foi possível carregar os usuários agora.',
    updateError: 'Não foi possível atualizar a função do usuário.',
    updateNowError: 'Não foi possível atualizar a função do usuário agora.',
    accessRegistry: 'Registro de Acesso',
    rolesPrivileges: 'Funções e privilégios',
    loadingUsers: 'Carregando usuários...',
    createdLabel: 'Criado em',
    privileges: 'Privilégios',
    adminPrivileges: 'Pode gerenciar usuários, compostos e métricas',
    analystPrivileges: 'Apenas métodos, relatórios e trilhas de auditoria',
    updating: 'Atualizando...',
    setAnalyst: 'Definir como Analista',
    promoteAdmin: 'Promover a Administrador',
    currentSession: 'Sessão Atual'
  },
  es: {
    title: 'Gestión de Usuarios',
    adminOnly: 'Esta área está disponible solo para administradores.',
    adminControl: 'Control Administrativo',
    description: 'El registro público queda cerrado después de la configuración. Los administradores crean nuevos usuarios aquí y controlan quién tiene acceso elevado.',
    registeredUsers: 'Usuarios Registrados',
    admins: 'Administradores',
    searchUsers: 'Buscar usuarios',
    searchUsersPlaceholder: 'Buscar por nombre, User ID, email o rol...',
    accountProvisioning: 'Provisionamiento de Cuenta',
    createNewUser: 'Crear nuevo usuario',
    userId: 'ID de Usuario',
    email: 'Email',
    fullName: 'Nombre Completo',
    password: 'Contraseña',
    passwordPlaceholder: 'Más de 6 caracteres',
    role: 'Rol',
    analyst: 'Analista',
    admin: 'Administrador',
    fillAll: 'Completa todos los campos.',
    passwordLength: 'La contraseña debe tener más de 6 caracteres.',
    createError: 'No se pudo crear el usuario.',
    createNowError: 'No se puede crear el usuario en este momento.',
    created: 'Usuario creado correctamente.',
    creating: 'Creando...',
    createUser: 'Crear Usuario',
    loadError: 'No se pueden cargar los usuarios en este momento.',
    updateError: 'No se pudo actualizar el rol del usuario.',
    updateNowError: 'No se puede actualizar el rol del usuario en este momento.',
    accessRegistry: 'Registro de Acceso',
    rolesPrivileges: 'Roles y privilegios',
    loadingUsers: 'Cargando usuarios...',
    createdLabel: 'Creado',
    privileges: 'Privilegios',
    adminPrivileges: 'Puede gestionar usuarios, compuestos y métricas',
    analystPrivileges: 'Solo métodos, informes y registros de auditoría',
    updating: 'Actualizando...',
    setAnalyst: 'Definir como Analista',
    promoteAdmin: 'Promover a Administrador',
    currentSession: 'Sesión Actual'
  }
};

function getApiRole(role: UserRole) {
  return role === 'analyst' ? 'user' : role;
}

const INITIAL_CREATE_USER_FORM: CreateUserFormState = {
  userId: '',
  email: '',
  fullName: '',
  password: '',
  role: 'analyst'
};

export default function UserManagement({ currentUser, globalSearch }: UserManagementProps) {
  const { language } = useLanguage();
  const text = USER_MANAGEMENT_TEXT[language];
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserMessage, setCreateUserMessage] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(INITIAL_CREATE_USER_FORM);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!globalSearch) return;
    setUserSearch(globalSearch.query);
  }, [globalSearch?.nonce]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/users', {
          credentials: 'include',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        setUsers(payload.users as AuthUser[]);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }

        setError(text.loadError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, [text.loadError]);

  const updateRole = async (userId: number, role: UserRole) => {
    setPendingUserId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: getApiRole(role) })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || text.updateError);
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? (payload.user as AuthUser) : user))
      );
    } catch (requestError) {
      console.error('Failed to update role:', requestError);
      setError(text.updateNowError);
    } finally {
      setPendingUserId(null);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserError(null);
    setCreateUserMessage(null);

    if (!createUserForm.userId.trim() || !createUserForm.email.trim() || !createUserForm.fullName.trim() || !createUserForm.password) {
      setCreateUserError(text.fillAll);
      return;
    }

    if (createUserForm.password.length < 7) {
      setCreateUserError(text.passwordLength);
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: createUserForm.userId.trim(),
          email: createUserForm.email.trim(),
          fullName: createUserForm.fullName.trim(),
          password: createUserForm.password,
          role: getApiRole(createUserForm.role)
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setCreateUserError(payload.error || text.createError);
        return;
      }

      setUsers((currentUsers) => [...currentUsers, payload.user as AuthUser]);
      setCreateUserForm(INITIAL_CREATE_USER_FORM);
      setCreateUserMessage(text.created);
    } catch (requestError) {
      console.error('Failed to create user:', requestError);
      setCreateUserError(text.createNowError);
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border-white/[0.03]">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{text.title}</h1>
        <p className="mt-4 text-white/60">{text.adminOnly}</p>
      </div>
    );
  }

  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const visibleUsers = normalizedUserSearch
    ? users.filter((user) => [
        user.fullName,
        user.userId,
        user.email,
        user.role
      ].some((value) => value.toLowerCase().includes(normalizedUserSearch)))
    : users;

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              {text.adminControl}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            {text.title}
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            {text.description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
          <div className="glass-panel rounded-2xl px-5 py-4 border-white/[0.03]">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">{text.registeredUsers}</p>
            <p className="mt-3 text-3xl font-display font-bold text-white">{users.length}</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-4 border-white/[0.03]">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">{text.admins}</p>
            <p className="mt-3 text-3xl font-display font-bold text-white">
              {users.filter((user) => user.role === 'admin').length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="glass-panel rounded-[2rem] p-4 sm:p-6 lg:p-8 border-white/[0.03] space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20 self-start shrink-0">
              <UserPlus size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                {text.accountProvisioning}
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-1 break-words">
                {text.createNewUser}
              </h2>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 items-end">
              <label className="block space-y-2 min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 font-bold break-words">{text.userId}</span>
                <input
                  value={createUserForm.userId}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, userId: event.target.value }))}
                  className="w-full min-w-0 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  placeholder="new_user"
                />
              </label>

              <label className="block space-y-2 min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 font-bold break-words">{text.email}</span>
                <input
                  type="email"
                  value={createUserForm.email}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full min-w-0 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  placeholder="chemist@example.com"
                />
              </label>

              <label className="block space-y-2 min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 font-bold break-words">{text.fullName}</span>
                <input
                  value={createUserForm.fullName}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, fullName: event.target.value }))}
                  className="w-full min-w-0 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  placeholder="Dr. Ada Lovelace"
                />
              </label>

              <label className="block space-y-2 min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 font-bold break-words">{text.password}</span>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full min-w-0 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                  placeholder={text.passwordPlaceholder}
                />
              </label>

              <label className="block space-y-2 min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 font-bold break-words">{text.role}</span>
                <select
                  value={createUserForm.role}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                  className="w-full min-w-0 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                >
                  <option value="analyst">{text.analyst}</option>
                  <option value="admin">{text.admin}</option>
                </select>
              </label>
            </div>

            {createUserError && (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                {createUserError}
              </div>
            )}

            {createUserMessage && (
              <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-secondary">
                {createUserMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isCreatingUser}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-on-secondary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(118,243,234,0.22)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} />
              {isCreatingUser ? text.creating : text.createUser}
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                  {text.accessRegistry}
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-1">
                  {text.rolesPrivileges}
                </h2>
              </div>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">{text.searchUsers}</span>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-primary/30 placeholder:text-white/25"
                placeholder={text.searchUsersPlaceholder}
              />
            </div>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
              {text.loadingUsers}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {visibleUsers.map((user) => {
                const isCurrentUser = user.id === currentUser.id;
                const nextRole: UserRole = user.role === 'admin' ? 'analyst' : 'admin';
                const canToggle = !(isCurrentUser && user.role === 'admin');

                return (
                  <div
                    key={user.id}
                    className="rounded-[1.6rem] p-5 sm:p-6 bg-white/[0.03] border border-white/8 hover:border-primary/20 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white text-lg font-semibold break-words">{user.fullName}</p>
                        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/30 mt-2">
                          {user.userId}
                        </p>
                        {user.email && (
                          <p className="mt-1 text-xs text-white/45 break-all">{user.email}</p>
                        )}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full border text-[9px] font-mono uppercase tracking-[0.18em] font-bold ${
                          user.role === 'admin'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-secondary/20 bg-secondary/10 text-secondary'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">{text.createdLabel}</p>
                        <p className="text-white mt-2 font-semibold">{new Date(user.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">{text.privileges}</p>
                        <p className="text-white mt-2 font-semibold">
                          {user.role === 'admin' ? text.adminPrivileges : text.analystPrivileges}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        onClick={() => updateRole(user.id, nextRole)}
                        disabled={!canToggle || pendingUserId === user.id}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(167,200,255,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        <UserCog size={16} />
                        {pendingUserId === user.id ? text.updating : user.role === 'admin' ? text.setAnalyst : text.promoteAdmin}
                      </button>

                      {isCurrentUser && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-secondary font-bold">
                          <ShieldCheck size={14} />
                          {text.currentSession}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
