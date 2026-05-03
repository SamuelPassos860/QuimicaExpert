export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  userId: string;
  fullName: string;
  createdAt: string;
  role: UserRole;
}

export interface SignupBody {
  userId: string;
  fullName: string;
  password: string;
}

export interface AdminCreateUserBody extends SignupBody {
  role?: UserRole;
}

export interface LoginBody {
  userId: string;
  password: string;
}

export interface UserRoleUpdateBody {
  role: UserRole;
}
