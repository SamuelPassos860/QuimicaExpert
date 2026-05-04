import { FormEvent, useEffect, useState } from 'react';
import { ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react';
import type { AuthUser, UserRole } from '../types/auth';

interface UserManagementProps {
  currentUser: AuthUser;
}

interface CreateUserFormState {
  userId: string;
  fullName: string;
  password: string;
  role: UserRole;
}

const INITIAL_CREATE_USER_FORM: CreateUserFormState = {
  userId: '',
  fullName: '',
  password: '',
  role: 'user'
};

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserMessage, setCreateUserMessage] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>(INITIAL_CREATE_USER_FORM);

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

        setError('Unable to load users right now.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();

    return () => controller.abort();
  }, []);

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
        body: JSON.stringify({ role })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Unable to update user role.');
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === userId ? (payload.user as AuthUser) : user))
      );
    } catch (requestError) {
      console.error('Failed to update role:', requestError);
      setError('Unable to update user role right now.');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserError(null);
    setCreateUserMessage(null);

    if (!createUserForm.userId.trim() || !createUserForm.fullName.trim() || !createUserForm.password) {
      setCreateUserError('Please fill in all fields.');
      return;
    }

    if (createUserForm.password.length < 7) {
      setCreateUserError('Password must be more than 6 characters long.');
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
          fullName: createUserForm.fullName.trim(),
          password: createUserForm.password,
          role: createUserForm.role
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setCreateUserError(payload.error || 'Unable to create user.');
        return;
      }

      setUsers((currentUsers) => [...currentUsers, payload.user as AuthUser]);
      setCreateUserForm(INITIAL_CREATE_USER_FORM);
      setCreateUserMessage('User created successfully.');
    } catch (requestError) {
      console.error('Failed to create user:', requestError);
      setCreateUserError('Unable to create user right now.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border-white/[0.03]">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">User Management</h1>
        <p className="mt-4 text-white/60">This area is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] font-bold">
              Admin Control
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            User Management
          </h1>
          <p className="text-white/40 mt-1 max-w-3xl text-sm leading-relaxed">
            Public sign-up is closed after setup. Admins create new users here and control who has elevated access.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-auto">
          <div className="glass-panel rounded-2xl px-5 py-4 border-white/[0.03]">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">Registered Users</p>
            <p className="mt-3 text-3xl font-display font-bold text-white">{users.length}</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-4 border-white/[0.03]">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">Admins</p>
            <p className="mt-3 text-3xl font-display font-bold text-white">
              {users.filter((user) => user.role === 'admin').length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className="glass-panel rounded-[2rem] p-5 sm:p-6 lg:p-8 border-white/[0.03] space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-secondary/10 text-secondary border border-secondary/20">
              <UserPlus size={22} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/30 font-bold">
                Account Provisioning
              </p>
              <h2 className="text-2xl font-display font-bold text-white mt-1">
                Create a new user
              </h2>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">User ID</span>
              <input
                value={createUserForm.userId}
                onChange={(event) => setCreateUserForm((current) => ({ ...current, userId: event.target.value }))}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                placeholder="new_user"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Full Name</span>
              <input
                value={createUserForm.fullName}
                onChange={(event) => setCreateUserForm((current) => ({ ...current, fullName: event.target.value }))}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                placeholder="Dr. Ada Lovelace"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Password</span>
              <input
                type="password"
                value={createUserForm.password}
                onChange={(event) => setCreateUserForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
                placeholder="More than 6 characters"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 font-bold">Role</span>
              <select
                value={createUserForm.role}
                onChange={(event) => setCreateUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>

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
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary text-on-secondary text-[10px] font-mono uppercase tracking-[0.25em] font-bold hover:shadow-[0_0_30px_rgba(118,243,234,0.22)] transition-all disabled:opacity-60 disabled:cursor-not-allowed w-full"
            >
              <UserPlus size={16} />
              {isCreatingUser ? 'Creating...' : 'Create User'}
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
                  Access Registry
                </p>
                <h2 className="text-2xl font-display font-bold text-white mt-1">
                  Roles and privileges
                </h2>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-sm text-white/55">
              Loading users...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUser.id;
                const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
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
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full border text-[9px] font-mono uppercase tracking-[0.18em] font-bold ${
                          user.role === 'admin'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-white/10 bg-white/[0.03] text-white/70'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">Created</p>
                        <p className="text-white mt-2 font-semibold">{new Date(user.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-[#0b1121]/50 border border-white/5 p-4">
                        <p className="text-white/30 font-mono uppercase tracking-widest">Privileges</p>
                        <p className="text-white mt-2 font-semibold">
                          {user.role === 'admin' ? 'Can manage all users' : 'Standard workflow access'}
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
                        {pendingUserId === user.id ? 'Updating...' : user.role === 'admin' ? 'Set As User' : 'Promote To Admin'}
                      </button>

                      {isCurrentUser && (
                        <div className="inline-flex items-center gap-2 rounded-xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.2em] text-secondary font-bold">
                          <ShieldCheck size={14} />
                          Current Session
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
