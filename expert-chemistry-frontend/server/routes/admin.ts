import { Router } from 'express';
import { createUser, isDuplicateUserIdError, listUsers, updateUserRole } from '../services/auth.ts';
import type { AdminCreateUserBody, UserRoleUpdateBody } from '../types/auth.ts';
import { validateAdminCreateUser, validateRoleUpdate } from '../validators/auth.ts';

const router = Router();

router.get('/users', async (_request, response) => {
  try {
    const users = await listUsers();
    response.json({ users });
  } catch (error) {
    console.error('Failed to list users:', error);
    response.status(500).json({ error: 'Failed to list users.' });
  }
});

router.post('/users', async (request, response) => {
  const validation = validateAdminCreateUser((request.body ?? {}) as AdminCreateUserBody);

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  try {
    const user = await createUser(
      validation.data!.userId,
      validation.data!.fullName,
      validation.data!.password,
      validation.data!.role
    );

    response.status(201).json({ user });
  } catch (error) {
    if (isDuplicateUserIdError(error)) {
      response.status(409).json({ error: 'A user with this User ID already exists.' });
      return;
    }

    console.error('Failed to create user from admin panel:', error);
    response.status(500).json({ error: 'Failed to create user.' });
  }
});

router.patch('/users/:id/role', async (request, response) => {
  const targetUserId = Number(request.params.id);
  const validation = validateRoleUpdate((request.body ?? {}) as UserRoleUpdateBody);

  if (!Number.isFinite(targetUserId)) {
    response.status(400).json({ error: 'Invalid user id.' });
    return;
  }

  if (validation.error) {
    response.status(400).json({ error: validation.error });
    return;
  }

  if (response.locals.currentUser?.id === targetUserId && validation.data?.role !== 'admin') {
    response.status(400).json({ error: 'Admins cannot remove their own admin access.' });
    return;
  }

  try {
    const user = await updateUserRole(targetUserId, validation.data!.role);

    if (!user) {
      response.status(404).json({ error: 'User not found.' });
      return;
    }

    response.json({ user });
  } catch (error) {
    console.error('Failed to update user role:', error);
    response.status(500).json({ error: 'Failed to update user role.' });
  }
});

export default router;
