export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  userId: string;
  fullName: string;
  createdAt: string;
  role: UserRole;
}
