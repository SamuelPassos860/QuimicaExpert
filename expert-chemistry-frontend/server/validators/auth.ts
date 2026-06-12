import type {
  AdminCreateUserBody,
  ForgotPasswordBody,
  LoginBody,
  ResetPasswordBody,
  SignupBody,
  UserRole,
  UserRoleUpdateBody
} from '../types/auth.js';

const MIN_PASSWORD_LENGTH = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function validateSignup(body: SignupBody) {
  const userId = normalizeText(body.userId);
  const email = normalizeEmail(body.email);
  const fullName = normalizeText(body.fullName);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!userId || !email || !fullName || !password) {
    return { error: 'All fields are required.' };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'A valid email address is required.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: 'Password must be more than 6 characters long.' };
  }

  return {
    data: {
      userId,
      email,
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

export function validateForgotPassword(body: ForgotPasswordBody) {
  const userId = normalizeText(body.userId);

  if (!userId) {
    return { error: 'User ID is required.' };
  }

  return {
    data: {
      userId
    }
  };
}

export function validateResetPassword(body: ResetPasswordBody) {
  const token = normalizeText(body.token);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token || !password) {
    return { error: 'Reset token and new password are required.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: 'Password must be more than 6 characters long.' };
  }

  return {
    data: {
      token,
      password
    }
  };
}

export function validateRoleUpdate(body: UserRoleUpdateBody) {
  const rawRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : '';
  const role = rawRole === 'user' ? 'analyst' : rawRole;

  if (role !== 'admin' && role !== 'analyst') {
    return { error: 'Role must be either admin or analyst.' };
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

  const rawRole = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'analyst';
  const role = rawRole === 'user' ? 'analyst' : rawRole;

  if (role !== 'admin' && role !== 'analyst') {
    return { error: 'Role must be either admin or analyst.' };
  }

  return {
    data: {
      ...signupValidation.data!,
      role: role as UserRole
    },
    error: undefined
  };
}
