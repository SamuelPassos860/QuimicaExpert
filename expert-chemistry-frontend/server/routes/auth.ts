import { Router } from 'express';
import {
  createSessionForUser,
  createUser,
  deleteSessionByToken,
  getUserForSessionToken,
  hasAnyUsers,
  isDuplicateUserIdError,
  loginUser
} from '../services/auth.ts';
import type { LoginBody, SignupBody } from '../types/auth.ts';
import { clearSessionCookie, getSessionTokenFromRequest, setSessionCookie } from '../utils/http.ts';
import { validateLogin, validateSignup } from '../validators/auth.ts';

const router = Router();

router.get('/setup-status', async (_request, response) => {
  try {
    const allowPublicSignup = !(await hasAnyUsers());
    response.json({ allowPublicSignup });
  } catch (error) {
    console.error('Failed to fetch setup status:', error);
    response.status(500).json({ error: 'Failed to fetch setup status.' });
  }
});

router.post('/signup', async (request, response) => {
  const validation = validateSignup((request.body ?? {}) as SignupBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const allowPublicSignup = !(await hasAnyUsers());

    if (!allowPublicSignup) {
      response.status(403).json({ error: 'Public sign-up is disabled. Ask an admin to create your account.' });
      return;
    }

    const user = await createUser(
      validation.data!.userId,
      validation.data!.fullName,
      validation.data!.password
    );

    const session = await createSessionForUser(user.id);
    setSessionCookie(response, session.token);
    response.status(201).json({ user });
  } catch (error) {
    if (isDuplicateUserIdError(error)) {
      response.status(409).json({ error: 'A user with this User ID already exists.' });
      return;
    }

    console.error('Failed to sign up user:', error);
    response.status(500).json({ error: 'Failed to create user.' });
  }
});

router.post('/login', async (request, response) => {
  const validation = validateLogin((request.body ?? {}) as LoginBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const user = await loginUser(validation.data!.userId, validation.data!.password);

    if (!user) {
      response.status(401).json({ error: 'Invalid User ID or password.' });
      return;
    }

    const session = await createSessionForUser(user.id);
    setSessionCookie(response, session.token);
    response.json({ user });
  } catch (error) {
    console.error('Failed to log in user:', error);
    response.status(500).json({ error: 'Failed to log in user.' });
  }
});

router.get('/me', async (request, response) => {
  try {
    const sessionToken = getSessionTokenFromRequest(request);

    if (!sessionToken) {
      response.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = await getUserForSessionToken(sessionToken);

    if (!user) {
      clearSessionCookie(response);
      response.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    response.json({ user });
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    response.status(500).json({ error: 'Failed to fetch current user.' });
  }
});

router.post('/logout', async (request, response) => {
  try {
    const sessionToken = getSessionTokenFromRequest(request);

    if (sessionToken) {
      await deleteSessionByToken(sessionToken);
    }

    clearSessionCookie(response);
    response.status(204).send();
  } catch (error) {
    console.error('Failed to log out user:', error);
    response.status(500).json({ error: 'Failed to log out user.' });
  }
});

export default router;
