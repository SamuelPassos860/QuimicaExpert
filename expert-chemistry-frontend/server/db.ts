import { Pool } from 'pg';
import { loadDatabaseUrl } from './config.js';

let poolInstance: Pool | null = null;

function createPool() {
  return new Pool({
    connectionString: loadDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });
}

function getPool() {
  if (!poolInstance) {
    poolInstance = createPool();
  }

  return poolInstance;
}

export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    const instance = getPool();
    const value = Reflect.get(instance, property, receiver);

    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
