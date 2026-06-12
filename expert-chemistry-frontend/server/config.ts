import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ENV_PATHS = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env')
];

for (const envPath of ENV_PATHS) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

export function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.resolve(process.cwd(), '..', '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error('DATABASE_URL not found. Add it to the root .env file or set it in the environment.');
  }

  const envFile = fs.readFileSync(envPath, 'utf8');
  const match = envFile.match(/^\s*(?:export\s+)?DATABASE_URL\s*=\s*["']?(.+?)["']?\s*$/m);

  if (!match?.[1]) {
    throw new Error('DATABASE_URL is missing from the root .env file.');
  }

  return match[1];
}
