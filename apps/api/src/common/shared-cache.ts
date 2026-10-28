import type { Redis } from 'ioredis';

/**
 * Short-lived values every API instance must see the same (DEC-104): today the permissions of each
 * account and the version that invalidates them (US-024:AC4). Production keeps them in Redis; the
 * in-memory store serves unit tests that run without Redis. A cache, never the source of truth.
 */
export abstract class SharedCache {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlMs: number): Promise<void>;
  /** Adds one to a counter that never expires and returns the new value. */
  abstract increment(key: string): Promise<number>;
}

export class RedisSharedCache extends SharedCache {
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
  ) {
    super();
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(this.key(key));
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(key), value, 'PX', ttlMs);
  }

  increment(key: string): Promise<number> {
    return this.redis.incr(this.key(key));
  }

  private key(key: string): string {
    return `${this.prefix}:cache:${key}`;
  }
}

/** One process only, for unit tests without Redis. */
export class MemorySharedCache extends SharedCache {
  private readonly entries = new Map<string, { value: string; expiresAt: number }>();

  get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= Date.now()) this.entries.delete(key);
    return Promise.resolve(entry && entry.expiresAt > Date.now() ? entry.value : null);
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    return Promise.resolve();
  }

  increment(key: string): Promise<number> {
    const next = Number(this.entries.get(key)?.value ?? '0') + 1;
    this.entries.set(key, { value: String(next), expiresAt: Number.POSITIVE_INFINITY });
    return Promise.resolve(next);
  }
}
