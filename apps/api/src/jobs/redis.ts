import type { RedisOptions } from 'bullmq';

/**
 * Connection options for BullMQ from `REDIS_URL` (`redis://` or `rediss://`, optional user, password
 * and database index). Workers wait for Redis forever instead of failing a command
 * (`maxRetriesPerRequest: null`, required by BullMQ, SRC-22); the API fails fast so a request never
 * hangs on a queue that is down.
 */
export function redisConnection(url: string, { worker }: { worker: boolean }): RedisOptions {
  const parsed = new URL(url);
  const db = parsed.pathname.replace('/', '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(db ? { db: Number(db) } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: worker ? null : 1,
    enableOfflineQueue: worker,
  };
}

/** What `assertNoEviction` needs from a Redis client. */
export interface ConfigReader {
  config(subcommand: 'GET', parameter: string): Promise<unknown>;
}

/**
 * BullMQ loses jobs if Redis evicts keys, so the worker refuses to start unless the policy is
 * `noeviction` (US-117:AC5, SRC-22).
 */
export async function assertNoEviction(client: ConfigReader): Promise<void> {
  const answer = await client.config('GET', 'maxmemory-policy');
  const policy = Array.isArray(answer) ? String(answer[1]) : String(answer);
  if (policy !== 'noeviction') {
    throw new Error(`Redis maxmemory-policy is "${policy}"; BullMQ needs "noeviction" (SRC-22)`);
  }
}
