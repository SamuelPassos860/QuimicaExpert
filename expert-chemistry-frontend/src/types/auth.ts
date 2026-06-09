export type UserRole = 'admin' | 'analyst';

export interface AuthUser {
  id: number;
  userId: string;
  fullName: string;
  createdAt: string;
  role: UserRole;
}
