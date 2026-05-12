import { Router } from 'express';
import { createAuditLog } from '../services/audit.ts';
import {
  createSessionForUser,
  createPasswordResetTokenForUser,
  createUser,
  deleteSessionByToken,
  getUserForSessionToken,
  hasAnyUsers,
  isDuplicateUserIdError,
  loginUser,
  resetPasswordWithToken
} from '../services/auth.ts';
import type { ForgotPasswordBody, LoginBody, ResetPasswordBody, SignupBody } from '../types/auth.ts';
import { clearSessionCookie, getSessionTokenFromRequest, setSessionCookie } from '../utils/http.ts';
import { validateForgotPassword, validateLogin, validateResetPassword, validateSignup } from '../validators/auth.ts';

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
    await createAuditLog({
      actorUserId: user.id,
      actorUserIdentifier: user.userId,
      actorFullName: user.fullName,
      eventType: 'login',
      resourceType: 'session'
    });
    response.json({ user });
  } catch (error) {
    console.error('Failed to log in user:', error);
    response.status(500).json({ error: 'Failed to log in user.' });
  }
});

router.post('/forgot-password', async (request, response) => {
  const validation = validateForgotPassword((request.body ?? {}) as ForgotPasswordBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const resetRequest = await createPasswordResetTokenForUser(validation.data!.userId);

    if (resetRequest) {
      await createAuditLog({
        actorUserId: resetRequest.user.id,
        actorUserIdentifier: resetRequest.user.userId,
        actorFullName: resetRequest.user.fullName,
        eventType: 'password_reset_requested',
        resourceType: 'user',
        resourceKey: resetRequest.user.userId,
        metadata: {
          expiresAt: resetRequest.expiresAt
        }
      });
    }

    const resetPath = resetRequest
      ? `/#/reset-password?token=${encodeURIComponent(resetRequest.token)}`
      : undefined;

    response.json({
      message: 'If this User ID exists, a password reset link has been prepared.',
      resetPath,
      resetToken: resetRequest?.token,
      expiresAt: resetRequest?.expiresAt
    });
  } catch (error) {
    console.error('Failed to request password reset:', error);
    response.status(500).json({ error: 'Failed to request password reset.' });
  }
});

router.post('/reset-password', async (request, response) => {
  const validation = validateResetPassword((request.body ?? {}) as ResetPasswordBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const user = await resetPasswordWithToken(validation.data!.token, validation.data!.password);

    if (!user) {
      response.status(400).json({ error: 'Invalid or expired password reset token.' });
      return;
    }

    await createAuditLog({
      actorUserId: user.id,
      actorUserIdentifier: user.userId,
      actorFullName: user.fullName,
      eventType: 'password_reset_completed',
      resourceType: 'user',
      resourceKey: user.userId
    });

    response.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Failed to reset password:', error);
    response.status(500).json({ error: 'Failed to reset password.' });
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
      const user = await getUserForSessionToken(sessionToken);

      if (user) {
        await createAuditLog({
          actorUserId: user.id,
          actorUserIdentifier: user.userId,
          actorFullName: user.fullName,
          eventType: 'logout',
          resourceType: 'session'
        });
      }

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
