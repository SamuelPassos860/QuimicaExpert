import type { AuthUser } from './auth.ts';

declare global {
  namespace Express {
    interface Locals {
      currentUser?: AuthUser;
      sessionToken?: string;
    }
  }
}

export {};
