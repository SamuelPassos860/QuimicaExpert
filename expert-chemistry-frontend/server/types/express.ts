import type { AuthUser } from './auth';

declare global {
  namespace Express {
    interface Locals {
      currentUser?: AuthUser;
      sessionToken?: string;
    }
  }
}

export {};
