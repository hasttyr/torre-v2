import type { IncomingHttpHeaders } from 'node:http';
import { Logger, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { normalizeIp, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { accessTokenOptions } from '../auth/access-token.js';
import { AppConfig } from '../config/app-config.js';
import { counterKey, RateCounter } from './counters.js';

const ONE_MINUTE_MS = 60_000;

/** The record type the package does not export from its entry point. */
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const seconds = (ms: number): number => Math.max(1, Math.ceil(ms / 1000));

/**
 * The throttler's storage on the shared counters (DEC-062), so every instance sees the same counts.
 * Past the limit the client is blocked for `blockDuration` (the window, by default). If the counters
 * fail (Redis down), the request passes uncounted with a warning at most once a minute: the general
 * limit fails open, the authentication limits fail closed (DEC-090).
 */
export class CounterThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('Throttling');
  private lastWarningAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly counter: RateCounter) {}

  async increment(key: string, ttl: number, limit: number, blockDuration: number): Promise<ThrottlerStorageRecord> {
    try {
      return await this.count(key, ttl, limit, blockDuration);
    } catch (error) {
      if (Date.now() - this.lastWarningAt >= ONE_MINUTE_MS) {
        this.lastWarningAt = Date.now();
        this.logger.warn({ err: error }, 'Rate-limit counters unavailable; the general limit lets requests through');
      }
      return { totalHits: 0, timeToExpire: seconds(ttl), isBlocked: false, timeToBlockExpire: 0 };
    }
  }

  private async count(key: string, ttl: number, limit: number, blockDuration: number): Promise<ThrottlerStorageRecord> {
    const blockKey = `${key}:blocked`;
    const blockedMs = await this.counter.ttl(blockKey);
    if (blockedMs > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: seconds(blockedMs),
        isBlocked: true,
        timeToBlockExpire: seconds(blockedMs),
      };
    }
    const { hits, resetMs } = await this.counter.hit(key, ttl);
    if (hits <= limit)
      return { totalHits: hits, timeToExpire: seconds(resetMs), isBlocked: false, timeToBlockExpire: 0 };
    const blockMs = blockDuration > 0 ? blockDuration : resetMs;
    await this.counter.lock(blockKey, blockMs);
    return { totalHits: hits, timeToExpire: seconds(resetMs), isBlocked: true, timeToBlockExpire: seconds(blockMs) };
  }
}

/**
 * Who a request counts against (BR-AUTH-07: "per user or IP"): the user of a valid access token, or
 * else the client address (IPv6 grouped by /64, as the throttler does). A forged or expired token
 * counts against the address, so inventing tokens does not buy more requests.
 */
export async function requestTracker(
  req: { readonly ip?: string | undefined; readonly headers: IncomingHttpHeaders },
  jwt: JwtService,
): Promise<string> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (token) {
    const claims = await jwt.verifyAsync<{ sub?: unknown }>(token).catch(() => undefined);
    if (typeof claims?.sub === 'string') return `user:${claims.sub}`;
  }
  return `ip:${normalizeIp(req.ip ?? 'unknown')}`;
}

/**
 * General rate limit of the API (US-006:AC5, DEC-062): `API_THROTTLE_LIMIT` requests per minute per
 * user or IP, across all routes, with counters shared by every instance (`CountersModule`).
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [JwtModule.registerAsync({ inject: [AppConfig], useFactory: accessTokenOptions })],
      inject: [AppConfig, RateCounter, JwtService],
      useFactory: (config: AppConfig, counter: RateCounter, jwt: JwtService) => ({
        // `default` keeps the standard header names (`Retry-After`, `X-RateLimit-*`) without a suffix.
        throttlers: [{ name: 'default', ttl: ONE_MINUTE_MS, limit: config.get('API_THROTTLE_LIMIT') }],
        storage: new CounterThrottlerStorage(counter),
        getTracker: (req) => requestTracker(req as Parameters<typeof requestTracker>[0], jwt),
        // One counter per client for the whole API, not one per route.
        generateKey: (_context, tracker, name) => counterKey('api', name, tracker),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlingModule {}
