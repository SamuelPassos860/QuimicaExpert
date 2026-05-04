import type { AdminCreateUserBody, LoginBody, SignupBody, UserRole, UserRoleUpdateBody } from '../types/auth.ts';

const MIN_PASSWORD_LENGTH = 7;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateSignup(body: SignupBody) {
  const userId = normalizeText(body.userId);
  const fullName = normalizeText(body.fullName);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!userId || !fullName || !password) {
    return { error: 'All fields are required.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: 'Password must be more than 6 characters long.' };
  }

  return {
    data: {
      userId,
      fullName,
      password
    }
  };
}

export function validateLogin(body: LoginBody) {
  const userId = normalizeText(body.userId);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!userId || !password) {
    return { error: 'User ID and password are required.' };
  }

  return {
    data: {
      userId,
      password
    }
  };
}

export function validateRoleUpdate(body: UserRoleUpdateBody) {
  const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';

  if (role !== 'admin' && role !== 'user') {
    return { error: 'Role must be either admin or user.' };
  }

  return {
    data: {
      role: role as UserRole
    }
  };
}

export function validateAdminCreateUser(body: AdminCreateUserBody) {
  const signupValidation = validateSignup(body);

  if (signupValidation.error) {
    return { error: signupValidation.error as string };
  }

  const role = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'user';

  if (role !== 'admin' && role !== 'user') {
    return { error: 'Role must be either admin or user.' };
  }

  return {
    data: {
      ...signupValidation.data!,
      role: role as UserRole
    },
    error: undefined
  };
}
