import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import type { AuthUser, UserRole } from '../types/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { getSessionMaxAgeMs } from '../utils/http.js';

interface UserRow {
  id: number;
  user_id: string;
  full_name: string;
  created_at: string;
  password_hash: string;
  role: UserRole;
}

interface SessionRow {
  token_hash: string;
  session_user_id: number;
  expires_at: string;
}

interface PasswordResetTokenRow {
  user_id: number;
  reset_user_id: string;
  full_name: string;
  created_at: string;
  role: UserRole;
  password_hash: string;
  expires_at: string;
  used_at: string | null;
}

let schemaReadyPromise: Promise<void> | null = null;
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function mapUser(row: Pick<UserRow, 'id' | 'user_id' | 'full_name' | 'created_at' | 'role'>): AuthUser {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    createdAt: row.created_at,
    role: row.role
  };
}

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);

  await pool.query(`
    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR role NOT IN ('admin', 'user')
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_lower_idx
    ON users (LOWER(user_id))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
    ON user_sessions (user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
    ON user_sessions (expires_at)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens (user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
    ON password_reset_tokens (expires_at)
  `);

  const adminCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'"
  );

  if (Number(adminCountResult.rows[0]?.count || '0') === 0) {
    await pool.query(`
      UPDATE users
      SET role = 'admin'
      WHERE id = (
        SELECT id
        FROM users
        ORDER BY created_at ASC
        LIMIT 1
      )
    `);
  }
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function buildSessionExpiryDate() {
  return new Date(Date.now() + getSessionMaxAgeMs());
}

function buildPasswordResetExpiryDate() {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
}

export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export function generatePasswordResetToken() {
  return randomBytes(32).toString('hex');
}

export function initializeAuthSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureUsersTable();
  }

  return schemaReadyPromise;
}

export async function hasAnyUsers() {
  await initializeAuthSchema();

  const result = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  return Number(result.rows[0]?.count || '0') > 0;
}

export async function createUser(userId: string, fullName: string, password: string, forcedRole?: UserRole) {
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

  const existingUsersCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  const role: UserRole = forcedRole || (Number(existingUsersCount.rows[0]?.count || '0') === 0 ? 'admin' : 'user');
  const passwordHash = await hashPassword(password);
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (user_id, full_name, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, full_name, created_at, role
    `,
    [userId, fullName, passwordHash, role]
  );

  return mapUser(result.rows[0]!);
}

export async function loginUser(userId: string, password: string) {
  await initializeAuthSchema();

  const result = await pool.query<UserRow>(
    `
      SELECT id, user_id, full_name, created_at, password_hash, role
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

export async function createPasswordResetTokenForUser(userId: string) {
  await initializeAuthSchema();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query<UserRow>(
      `
        SELECT id, user_id, full_name, created_at, password_hash, role
        FROM users
        WHERE LOWER(user_id) = LOWER($1)
        LIMIT 1
      `,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query('COMMIT');
      return null;
    }

    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = buildPasswordResetExpiryDate();

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
          AND expires_at > NOW()
      `,
      [user.id]
    );

    await client.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, tokenHash, expiresAt]
    );

    await client.query('COMMIT');

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: mapUser(user)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithToken(token: string, password: string) {
  await initializeAuthSchema();

  const client = await pool.connect();
  const tokenHash = hashPasswordResetToken(token);

  try {
    await client.query('BEGIN');

    const tokenResult = await client.query<PasswordResetTokenRow>(
      `
        SELECT
          rt.user_id,
          u.user_id AS reset_user_id,
          u.full_name,
          u.created_at,
          u.role,
          u.password_hash,
          rt.expires_at,
          rt.used_at
        FROM password_reset_tokens rt
        INNER JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        LIMIT 1
        FOR UPDATE
      `,
      [tokenHash]
    );

    const resetToken = tokenResult.rows[0];

    if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at).getTime() <= Date.now()) {
      await client.query('COMMIT');
      return null;
    }

    const passwordHash = await hashPassword(password);

    const updatedUserResult = await client.query<UserRow>(
      `
        UPDATE users
        SET password_hash = $2
        WHERE id = $1
        RETURNING id, user_id, full_name, created_at, password_hash, role
      `,
      [resetToken.user_id, passwordHash]
    );

    await client.query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE token_hash = $1
      `,
      [tokenHash]
    );

    await client.query(
      `
        DELETE FROM user_sessions
        WHERE user_id = $1
      `,
      [resetToken.user_id]
    );

    await client.query('COMMIT');

    const updatedUser = updatedUserResult.rows[0];
    return updatedUser ? mapUser(updatedUser) : null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createSessionForUser(userId: number) {
  await initializeAuthSchema();

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = buildSessionExpiryDate();

  await pool.query(
    `
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  );

  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
}

export async function getUserForSessionToken(token: string) {
  await initializeAuthSchema();

  const tokenHash = hashSessionToken(token);

  const result = await pool.query<UserRow & SessionRow>(
    `
      SELECT
        u.id,
        u.user_id,
        u.full_name,
        u.created_at,
        u.password_hash,
        u.role,
        s.token_hash,
        s.user_id AS session_user_id,
        s.expires_at
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSessionByToken(token);
    return null;
  }

  return mapUser(row);
}

export async function deleteSessionByToken(token: string) {
  await initializeAuthSchema();

  const tokenHash = hashSessionToken(token);
  await pool.query(
    `
      DELETE FROM user_sessions
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
}

export async function listUsers() {
  await initializeAuthSchema();

  const result = await pool.query<UserRow>(
    `
      SELECT id, user_id, full_name, created_at, password_hash, role
      FROM users
      ORDER BY created_at ASC
    `
  );

  return result.rows.map((row) => mapUser(row));
}

export async function updateUserRole(userId: number, role: UserRole) {
  await initializeAuthSchema();

  const result = await pool.query<UserRow>(
    `
      UPDATE users
      SET role = $2
      WHERE id = $1
      RETURNING id, user_id, full_name, created_at, password_hash, role
    `,
    [userId, role]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export function isDuplicateUserIdError(error: unknown) {
  return error instanceof Error && error.name === 'DuplicateUserIdError';
}
