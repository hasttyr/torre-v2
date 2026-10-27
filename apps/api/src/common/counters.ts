import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';

/** One hit counted in a fixed window. */
export interface Hit {
  /** Hits in the current window, this one included. */
  readonly hits: number;
  /** Milliseconds until the window resets. */
  readonly resetMs: number;
}

/**
 * Counters behind the rate limits (DEC-062, ARCHITECTURE.md §14): fixed windows, streaks that end
 * after a pause and timed locks. Every API instance must see the same counts, so production keeps them
 * in Redis; the in-memory store serves unit tests that run without Redis.
 */
export abstract class RateCounter {
  /** Counts a hit on `key`; the window starts with the first hit and lasts `windowMs`. */
  abstract hit(key: string, windowMs: number): Promise<Hit>;
  /** Counts one more in a streak that ends `idleMs` after its last hit. */
  abstract extend(key: string, idleMs: number): Promise<number>;
  /** Sets `key` for `ttlMs` (a lock). */
  abstract lock(key: string, ttlMs: number): Promise<void>;
  /** Milliseconds `key` still lives, or 0 when it does not exist. */
  abstract ttl(key: string): Promise<number>;
  abstract clear(key: string): Promise<void>;
}

/**
 * Keys never carry an email or an IP address in clear (INV-PRIV-2): callers name a counter with its
 * parts and the store keeps their SHA-256.
 */
export const counterKey = (...parts: readonly string[]): string =>
  createHash('sha256').update(parts.join('\u0000')).digest('hex');

// INCR and the expiry in one step, so concurrent hits never leave a key without a TTL.
const HIT = `
local hits = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {hits, redis.call('PTTL', KEYS[1])}`;

const EXTEND = `
local hits = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[1])
return hits`;

/** Counters shared by every instance through Redis; each operation is atomic (Lua scripts). */
export class RedisRateCounter extends RateCounter {
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
  ) {
    super();
  }

  async hit(key: string, windowMs: number): Promise<Hit> {
    const [hits, resetMs] = (await this.redis.eval(HIT, 1, this.key(key), windowMs)) as [number, number];
    return { hits, resetMs };
  }

  async extend(key: string, idleMs: number): Promise<number> {
    return (await this.redis.eval(EXTEND, 1, this.key(key), idleMs)) as number;
  }

  async lock(key: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(key), '1', 'PX', ttlMs);
  }

  async ttl(key: string): Promise<number> {
    return Math.max(0, await this.redis.pttl(this.key(key)));
  }

  async clear(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  private key(key: string): string {
    return `${this.prefix}:rate:${key}`;
  }
}

/** Counters of one process, for unit tests without Redis. Not valid with more than one instance. */
export class MemoryRateCounter extends RateCounter {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();

  hit(key: string, windowMs: number): Promise<Hit> {
    const entry = this.live(key) ?? { count: 0, expiresAt: Date.now() + windowMs };
    entry.count += 1;
    this.entries.set(key, entry);
    return Promise.resolve({ hits: entry.count, resetMs: entry.expiresAt - Date.now() });
  }

  extend(key: string, idleMs: number): Promise<number> {
    const count = (this.live(key)?.count ?? 0) + 1;
    this.entries.set(key, { count, expiresAt: Date.now() + idleMs });
    return Promise.resolve(count);
  }

  lock(key: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { count: 1, expiresAt: Date.now() + ttlMs });
    return Promise.resolve();
  }

  ttl(key: string): Promise<number> {
    const entry = this.live(key);
    return Promise.resolve(entry ? entry.expiresAt - Date.now() : 0);
  }

  clear(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }

  private live(key: string): { count: number; expiresAt: number } | undefined {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= Date.now()) this.entries.delete(key);
    return entry && entry.expiresAt > Date.now() ? entry : undefined;
  }
}
