import { pool } from '../db.ts';
import type { AuthUser } from '../types/auth.ts';
import { hashPassword, verifyPassword } from '../utils/password.ts';

interface UserRow {
  id: number;
  user_id: string;
  full_name: string;
  created_at: string;
  password_hash: string;
}

let schemaReadyPromise: Promise<void> | null = null;

function mapUser(row: Pick<UserRow, 'id' | 'user_id' | 'full_name' | 'created_at'>): AuthUser {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    createdAt: row.created_at
  };
}

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_lower_idx
    ON users (LOWER(user_id))
  `);
}

export function initializeAuthSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureUsersTable();
  }

  return schemaReadyPromise;
}

export async function createUser(userId: string, fullName: string, password: string) {
  await initializeAuthSchema();

  const existingUser = await pool.query<Pick<UserRow, 'id'> & { id: number }>(
    `
      SELECT id
      FROM users
      WHERE LOWER(user_id) = LOWER($1)
      LIMIT 1
    `,
    [userId]
  );

  if (existingUser.rowCount) {
    const error = new Error('User ID already exists.');
    error.name = 'DuplicateUserIdError';
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (user_id, full_name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, full_name, created_at
    `,
    [userId, fullName, passwordHash]
  );

  return mapUser(result.rows[0]!);
}

export async function loginUser(userId: string, password: string) {
  await initializeAuthSchema();

  const result = await pool.query<UserRow>(
    `
      SELECT id, user_id, full_name, created_at, password_hash
      FROM users
      WHERE LOWER(user_id) = LOWER($1)
      LIMIT 1
    `,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);

  if (!passwordMatches) {
    return null;
  }

  return mapUser(user);
}

export function isDuplicateUserIdError(error: unknown) {
  return error instanceof Error && error.name === 'DuplicateUserIdError';
}
