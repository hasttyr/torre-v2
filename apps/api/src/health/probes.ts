import { Redis } from 'ioredis';
import pg from 'pg';

/** Resolves when the dependency answers, rejects otherwise. Never longer than its timeout. */
export type Probe = () => Promise<void>;

export const DATABASE_PROBE = Symbol('DATABASE_PROBE');
export const REDIS_PROBE = Symbol('REDIS_PROBE');

export const PROBE_TIMEOUT_MS = 2_000;

/** `SELECT 1` with the application role, on a short-lived connection (readiness, not pooling). */
export function postgresProbe(url: string, timeoutMs = PROBE_TIMEOUT_MS): Probe {
  return async () => {
    const client = new pg.Client({
      connectionString: url,
      connectionTimeoutMillis: timeoutMs,
      query_timeout: timeoutMs,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
    } finally {
      await client.end().catch(() => undefined);
    }
  };
}

/** `PING` on a short-lived connection that does not retry or queue commands. */
export function redisProbe(url: string, timeoutMs = PROBE_TIMEOUT_MS): Probe {
  return async () => {
    const client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: timeoutMs,
      commandTimeout: timeoutMs,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    // Connection errors are reported by connect(); without a listener ioredis would also print them.
    client.on('error', () => undefined);
    try {
      await client.connect();
      await client.ping();
    } finally {
      client.disconnect();
    }
  };
}
