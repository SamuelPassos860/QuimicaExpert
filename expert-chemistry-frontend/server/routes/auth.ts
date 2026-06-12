import { Router } from 'express';
import { createAuditLog } from '../services/audit.js';
import {
  confirmEmailVerificationCode,
  createEmailVerificationCodeForUser,
  createSessionForUser,
  createPasswordResetTokenForUser,
  createUser,
  deleteSessionByToken,
  getUserForSessionToken,
  hasAnyUsers,
  isDuplicateEmailError,
  isDuplicateUserIdError,
  loginUser,
  resetPasswordWithToken
} from '../services/auth.js';
import { requireAuth } from '../middleware/auth.js';
import type { ForgotPasswordBody, LoginBody, ResetPasswordBody, SignupBody } from '../types/auth.js';
import { isEmailDeliveryConfigured, sendMail } from '../utils/email.js';
import { clearSessionCookie, getSessionTokenFromRequest, setSessionCookie } from '../utils/http.js';
import { validateForgotPassword, validateLogin, validateResetPassword, validateSignup } from '../validators/auth.js';

const router = Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeCode(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

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
      validation.data!.email,
      validation.data!.fullName,
      validation.data!.password
    );

    const session = await createSessionForUser(user.id);
    setSessionCookie(response, session.token);
    await createAuditLog({
      actorUserId: user.id,
      actorUserIdentifier: user.userId,
      actorFullName: user.fullName,
      eventType: 'user_created',
      resourceType: 'user',
      resourceKey: user.userId,
      metadata: {
        createdUserId: user.userId,
        createdFullName: user.fullName,
        role: user.role,
        source: 'initial_setup'
      }
    });
    response.status(201).json({ user });
  } catch (error) {
    if (isDuplicateUserIdError(error)) {
      response.status(409).json({ error: 'A user with this User ID already exists.' });
      return;
    }

    if (isDuplicateEmailError(error)) {
      response.status(409).json({ error: 'A user with this email already exists.' });
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

router.post('/forgot-password', async (request, response) => {
  const validation = validateForgotPassword((request.body ?? {}) as ForgotPasswordBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const resetRequest = await createPasswordResetTokenForUser(validation.data!.userId);

    if (resetRequest?.user.email) {
      const publicUrl = process.env.APP_PUBLIC_URL || `${request.protocol}://${request.get('host')}`;
      const resetUrl = `${publicUrl.replace(/\/$/, '')}/#/reset-password?token=${encodeURIComponent(resetRequest.token)}`;

      if (isEmailDeliveryConfigured()) {
        await sendMail({
          to: resetRequest.user.email,
          subject: 'Expert Chemistry password reset confirmation',
          text: [
            `Hello ${resetRequest.user.fullName},`,
            '',
            'We received a request to reset your Expert Chemistry password.',
            'Confirm this request by opening the secure link below:',
            '',
            resetUrl,
            '',
            `This link expires at ${resetRequest.expiresAt}.`,
            'If you did not request this reset, you can ignore this email.'
          ].join('\n')
        });
      } else {
        console.info(`[dev email] Password reset link for ${resetRequest.user.email}: ${resetUrl}`);
      }
    }

    response.json({
      message: 'If this User ID exists and has an email address, a confirmation link has been sent.'
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

    response.json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Failed to reset password:', error);
    response.status(500).json({ error: 'Failed to reset password.' });
  }
});

router.post('/email-verification/request', requireAuth, async (request, response) => {
  const email = normalizeEmail((request.body ?? {}).email);

  if (!email || !EMAIL_PATTERN.test(email)) {
    response.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  try {
    const currentUser = response.locals.currentUser;
    const verification = await createEmailVerificationCodeForUser(currentUser.id, email);

    if (!verification) {
      response.status(404).json({ error: 'User not found.' });
      return;
    }

    if (isEmailDeliveryConfigured()) {
      await sendMail({
        to: verification.email,
        subject: 'Expert Chemistry email confirmation code',
        text: [
          `Hello ${verification.user.fullName},`,
          '',
          'Use the code below to confirm your email address in Expert Chemistry:',
          '',
          verification.code,
          '',
          `This code expires at ${verification.expiresAt}.`,
          'If you did not request this, ignore this email.'
        ].join('\n')
      });
    } else {
      console.info(`[dev email] Email verification code for ${verification.email}: ${verification.code}`);
    }

    response.json({
      message: 'Verification code sent.',
      email: verification.email,
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      response.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    console.error('Failed to request email verification:', error);
    response.status(500).json({ error: 'Failed to request email verification.' });
  }
});

router.post('/email-verification/confirm', requireAuth, async (request, response) => {
  const email = normalizeEmail((request.body ?? {}).email);
  const code = normalizeCode((request.body ?? {}).code);

  if (!email || !EMAIL_PATTERN.test(email) || !code) {
    response.status(400).json({ error: 'Email and verification code are required.' });
    return;
  }

  try {
    const currentUser = response.locals.currentUser;
    const user = await confirmEmailVerificationCode(currentUser.id, email, code);

    if (!user) {
      response.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }

    response.json({ user });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      response.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    console.error('Failed to confirm email verification:', error);
    response.status(500).json({ error: 'Failed to confirm email verification.' });
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
