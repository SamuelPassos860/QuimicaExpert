import type { RequestHandler } from 'express';
import { getSessionTokenFromRequest } from '../utils/http.ts';
import { getUserForSessionToken } from '../services/auth.ts';

export const requireAuth: RequestHandler = async (request, response, next) => {
  try {
    const sessionToken = getSessionTokenFromRequest(request);

    if (!sessionToken) {
      response.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const user = await getUserForSessionToken(sessionToken);

    if (!user) {
      response.status(401).json({ error: 'Authentication required.' });
      return;
    }

    response.locals.currentUser = user;
    response.locals.sessionToken = sessionToken;
    next();
  } catch (error) {
    console.error('Failed to validate session:', error);
    response.status(500).json({ error: 'Failed to validate session.' });
  }
};

export const requireAdmin: RequestHandler = async (_request, response, next) => {
  if (!response.locals.currentUser) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (response.locals.currentUser.role !== 'admin') {
    response.status(403).json({ error: 'Admin access required.' });
    return;
  }

  next();
};
