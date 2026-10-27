import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../common/api-error.js';
import { MemoryRateCounter } from '../common/counters.js';
import { AuthLimiter } from './auth-limiter.js';

const MINUTE = 60_000;
// BR-AUTH-07: 10 attempts every 15 minutes, a 15-minute lock after 10 failures in a row.
const LIMITS = { attempts: 10, windowMs: 15 * MINUTE, lockoutMs: 15 * MINUTE };

let limiter: AuthLimiter;

/** The answer to one attempt: `ok`, or the Retry-After seconds of the 429. */
async function tryLogin(email: string, address = '203.0.113.1'): Promise<'ok' | number> {
  try {
    await limiter.attempt('login', address, email);
    return 'ok';
  } catch (error) {
    if (error instanceof ApiError && error.code === 'RATE_LIMITED') return error.options.retryAfterSeconds ?? 0;
    throw error;
  }
}

async function failLogins(times: number, email: string, address = (i: number) => `198.51.100.${i}`) {
  for (let i = 0; i < times; i += 1) {
    expect(await tryLogin(email, address(i))).toBe('ok');
    await limiter.failed(email);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  limiter = new AuthLimiter(new MemoryRateCounter(), LIMITS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('authentication limits (BR-AUTH-07)', () => {
  it('[US-022:AC6][TC-104] should answer 429 on the 11th attempt from one address within 15 minutes', async () => {
    for (let i = 0; i < 10; i += 1) expect(await tryLogin(`user${i}@example.org`)).toBe('ok');

    expect(await tryLogin('another@example.org')).toBe(15 * 60);
    vi.advanceTimersByTime(15 * MINUTE);
    expect(await tryLogin('another@example.org')).toBe('ok');
  });

  it('[US-022:AC6][TC-104] should count attempts per email across addresses, so spreading them does not help', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect(await tryLogin('victim@example.org', `198.51.100.${i}`)).toBe('ok');
      await limiter.succeeded('victim@example.org');
    }

    expect(await tryLogin('victim@example.org', '192.0.2.200')).toBeGreaterThan(0);
  });

  it('[US-022:AC6][DEC-093] should lock an email for 15 minutes after 10 failures in a row, even past the window', async () => {
    await failLogins(9, 'ana@example.org');
    vi.advanceTimersByTime(14 * MINUTE);
    await failLogins(1, 'ana@example.org', () => '192.0.2.10');
    // The attempt window (opened at minute 0) has closed: only the lock still answers 429.
    vi.advanceTimersByTime(2 * MINUTE);

    expect(await tryLogin('ana@example.org', '192.0.2.99')).toBe(13 * 60);
    vi.advanceTimersByTime(13 * MINUTE);
    expect(await tryLogin('ana@example.org', '192.0.2.99')).toBe('ok');
  });

  it('[US-022:AC6][DEC-093] should end the streak with a success or after 15 minutes without failures', async () => {
    await failLogins(9, 'ana@example.org');
    await limiter.succeeded('ana@example.org');
    vi.advanceTimersByTime(15 * MINUTE);
    await failLogins(9, 'ana@example.org');
    vi.advanceTimersByTime(15 * MINUTE);
    await failLogins(9, 'ana@example.org');

    expect(await tryLogin('ana@example.org', '192.0.2.99')).toBe('ok');
  });

  it('[US-022:AC6][BR-AUTH-07] should keep registration counters apart from login ones, without a lock', async () => {
    for (let i = 0; i < 10; i += 1) await limiter.attempt('register', '203.0.113.5', `new${i}@example.org`);

    await expect(limiter.attempt('register', '203.0.113.5', 'new10@example.org')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(await tryLogin('new10@example.org', '203.0.113.5')).toBe('ok');
  });
});
