import { pool } from '../db.js';
import { initializeAuthSchema } from '../services/auth.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserEmailRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

function getArgValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printUsage() {
  console.log([
    'Usage:',
    '  npm run users:missing-email',
    '  npm run users:set-email -- --user-id <USER_ID> --email <EMAIL>',
    '',
    'Example:',
    '  npm run users:set-email -- --user-id chemist_01 --email chemist@example.com'
  ].join('\n'));
}

async function listUsersMissingEmail() {
  const result = await pool.query<UserEmailRow>(`
    SELECT id::text, user_id, full_name, email
    FROM users
    WHERE email = ''
    ORDER BY created_at ASC
  `);

  if (!result.rowCount) {
    console.log('All users already have an email address.');
    return;
  }

  console.log('Users without email:');
  for (const user of result.rows) {
    console.log(`- ${user.user_id} (${user.full_name}) [id=${user.id}]`);
  }
}

async function setUserEmail(userId: string, email: string) {
  const normalizedUserId = userId.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedUserId || !normalizedEmail) {
    throw new Error('User ID and email are required.');
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error('Provide a valid email address.');
  }

  const existingEmail = await pool.query<UserEmailRow>(
    `
      SELECT id::text, user_id, full_name, email
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (existingEmail.rowCount) {
    const owner = existingEmail.rows[0];
    throw new Error(`Email is already used by ${owner?.user_id}.`);
  }

  const result = await pool.query<UserEmailRow>(
    `
      UPDATE users
      SET email = $2
      WHERE LOWER(user_id) = LOWER($1)
      RETURNING id::text, user_id, full_name, email
    `,
    [normalizedUserId, normalizedEmail]
  );

  const updatedUser = result.rows[0];

  if (!updatedUser) {
    throw new Error(`User ID "${normalizedUserId}" was not found.`);
  }

  console.log(`Email updated for ${updatedUser.user_id} (${updatedUser.full_name}): ${updatedUser.email}`);
}

async function main() {
  await initializeAuthSchema();

  if (process.argv.includes('--list-missing')) {
    await listUsersMissingEmail();
    return;
  }

  const userId = getArgValue('--user-id') || process.argv[2];
  const email = getArgValue('--email') || process.argv[3];

  if (!userId || !email) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await setUserEmail(userId, email);
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
