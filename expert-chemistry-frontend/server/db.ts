import { Pool } from 'pg';
import { loadDatabaseUrl } from './config.ts';

const databaseUrl = loadDatabaseUrl();

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});
