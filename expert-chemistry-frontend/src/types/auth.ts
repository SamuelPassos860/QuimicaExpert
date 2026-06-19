export type UserRole = 'admin' | 'analyst';

export interface AuthUser {
  id: number;
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  role: UserRole;
}
