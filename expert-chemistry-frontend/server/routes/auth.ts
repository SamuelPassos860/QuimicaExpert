import { Router } from 'express';
import { createUser, isDuplicateUserIdError, loginUser } from '../services/auth.ts';
import type { LoginBody, SignupBody } from '../types/auth.ts';
import { validateLogin, validateSignup } from '../validators/auth.ts';

const router = Router();

router.post('/signup', async (request, response) => {
  const validation = validateSignup((request.body ?? {}) as SignupBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const user = await createUser(
      validation.data!.userId,
      validation.data!.fullName,
      validation.data!.password
    );

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

    response.json({ user });
  } catch (error) {
    console.error('Failed to log in user:', error);
    response.status(500).json({ error: 'Failed to log in user.' });
  }
});

export default router;
