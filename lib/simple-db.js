import { Pool } from 'pg';

// Use global object to cache pool during development to prevent connection exhaustion
// due to Hot Module Replacement (HMR) creating new pools on every reload.
let pool;

export function getPool() {
  if (process.env.NODE_ENV === 'production') {
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return pool;
  } else {
    // In development/test, use strict global
    if (!global.postgresPool) {
      global.postgresPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10, // Reduce max connections in dev to avoid hitting limits with multiple pools if they occur
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return global.postgresPool;
  }
}

export async function query(text, params) {
  const pool = getPool();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
