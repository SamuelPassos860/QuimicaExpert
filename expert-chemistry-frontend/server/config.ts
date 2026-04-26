import fs from 'node:fs';
import path from 'node:path';

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
