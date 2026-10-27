import { Inject, Injectable } from '@nestjs/common';
import { apiError } from '../common/api-error.js';
import type { ApiError } from '../common/api-error.js';
import { counterKey, RateCounter } from '../common/counters.js';

/** The numbers of BR-AUTH-07: AUTH_THROTTLE_LIMIT, AUTH_THROTTLE_WINDOW and AUTH_LOCKOUT_DURATION. */
export interface AuthLimits {
  /** Attempts per window by address and by email, and failed logins in a row before the lock. */
  readonly attempts: number;
  readonly windowMs: number;
  readonly lockoutMs: number;
}

export const AUTH_LIMITS = Symbol('AUTH_LIMITS');

export type LimitedAction = 'login' | 'register';

const streakKey = (email: string) => counterKey('auth', 'login-failures', email);
const lockKey = (email: string) => counterKey('auth', 'login-lock', email);

const limited = (ms: number): ApiError =>
  apiError('RATE_LIMITED', { retryAfterSeconds: Math.max(1, Math.ceil(ms / 1000)) });

/**
 * Limits on registration and login (US-022:AC6, BR-AUTH-07, DEC-093). Every attempt counts against
 * the client address and against the email, whether or not an account has it: a limit or a lock that
 * only hit real accounts would tell which emails are registered. Failed logins in a row form a streak
 * that ends with a success or after a window without failures; reaching the limit locks the email for
 * AUTH_LOCKOUT_DURATION, a correct password included. Counters live in Redis and fail closed: if Redis
 * does not answer, the attempt fails (500).
 */
@Injectable()
export class AuthLimiter {
  constructor(
    @Inject(RateCounter) private readonly counter: RateCounter,
    @Inject(AUTH_LIMITS) private readonly limits: AuthLimits,
  ) {}

  /** Counts one attempt; 429 RATE_LIMITED with Retry-After past the limit or while the email is locked. */
  async attempt(action: LimitedAction, address: string, email: string): Promise<void> {
    if (action === 'login') {
      const lockedMs = await this.counter.ttl(lockKey(email));
      if (lockedMs > 0) throw limited(lockedMs);
    }
    const hits = await Promise.all([
      this.counter.hit(counterKey('auth', action, 'address', address), this.limits.windowMs),
      this.counter.hit(counterKey('auth', action, 'email', email), this.limits.windowMs),
    ]);
    const exceeded = hits.filter((hit) => hit.hits > this.limits.attempts);
    if (exceeded.length > 0) throw limited(Math.max(...exceeded.map((hit) => hit.resetMs)));
  }

  /** A wrong password (or unknown email) extends the streak; the last one allowed locks the email. */
  async failed(email: string): Promise<void> {
    const streak = await this.counter.extend(streakKey(email), this.limits.windowMs);
    if (streak < this.limits.attempts) return;
    await this.counter.lock(lockKey(email), this.limits.lockoutMs);
    await this.counter.clear(streakKey(email));
  }

  /** A successful login ends the streak of failures. */
  async succeeded(email: string): Promise<void> {
    await this.counter.clear(streakKey(email));
  }
}
