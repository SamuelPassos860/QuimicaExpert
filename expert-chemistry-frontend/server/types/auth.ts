export interface AuthUser {
  id: number;
  userId: string;
  fullName: string;
  createdAt: string;
}

export interface SignupBody {
  userId: string;
  fullName: string;
  password: string;
}

export interface LoginBody {
  userId: string;
  password: string;
}
