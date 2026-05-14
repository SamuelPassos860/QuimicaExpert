import type { AuthUser } from './auth.js';

declare global {
  namespace Express {
    interface Locals {
      currentUser?: AuthUser;
      sessionToken?: string;
    }
  }
}

export {};
