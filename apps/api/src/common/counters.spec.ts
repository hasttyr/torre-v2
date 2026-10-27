import { JwtService } from '@nestjs/jwt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exampleEnv } from '../__tests__/env.js';
import { counterKey, MemoryRateCounter } from './counters.js';
import { CounterThrottlerStorage, requestTracker } from './throttling.module.js';

// The documented example secret (.env.example), not a value written here.
const SECRET = exampleEnv()['JWT_ACCESS_SECRET'] ?? '';
const jwt = new JwtService({
  secret: SECRET,
  signOptions: { algorithm: 'HS256' },
  verifyOptions: { algorithms: ['HS256'] },
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rate counters', () => {
  it('[DEC-062] should count hits in a fixed window that starts with the first hit', async () => {
    vi.useFakeTimers();
    const counter = new MemoryRateCounter();

    const first = await counter.hit('k', 1_000);
    vi.advanceTimersByTime(600);
    const second = await counter.hit('k', 1_000);
    vi.advanceTimersByTime(400);
    const afterWindow = await counter.hit('k', 1_000);

    expect(first).toEqual({ hits: 1, resetMs: 1_000 });
    expect(second).toEqual({ hits: 2, resetMs: 400 });
    expect(afterWindow).toEqual({ hits: 1, resetMs: 1_000 });
  });

  it('[DEC-062] should end a streak only after a pause, and expire locks', async () => {
    vi.useFakeTimers();
    const counter = new MemoryRateCounter();

    await counter.extend('streak', 1_000);
    vi.advanceTimersByTime(900);
    const kept = await counter.extend('streak', 1_000);
    vi.advanceTimersByTime(1_000);
    const restarted = await counter.extend('streak', 1_000);
    await counter.lock('lock', 500);
    const locked = await counter.ttl('lock');
    vi.advanceTimersByTime(500);

    expect(kept).toBe(2);
    expect(restarted).toBe(1);
    expect(locked).toBe(500);
    expect(await counter.ttl('lock')).toBe(0);
    await counter.clear('streak');
    expect(await counter.ttl('streak')).toBe(0);
  });

  it('[INV-PRIV-2] should name counters by a hash that never shows an email or an address', () => {
    const key = counterKey('login', 'ana@example.org');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('ana');
    // Parts stay apart: ('ab', 'c') and ('a', 'bc') are different counters.
    expect(counterKey('ab', 'c')).not.toBe(counterKey('a', 'bc'));
  });
});

describe('throttler storage', () => {
  it('[US-006:AC5] should block past the limit for the block duration, then count again', async () => {
    vi.useFakeTimers();
    const storage = new CounterThrottlerStorage(new MemoryRateCounter());
    const hit = () => storage.increment('client', 60_000, 2, 30_000);

    const allowed = [await hit(), await hit()];
    const blocked = await hit();
    vi.advanceTimersByTime(29_000);
    const stillBlocked = await hit();
    vi.advanceTimersByTime(31_000);
    const again = await hit();

    expect(allowed.map((r) => r.isBlocked)).toEqual([false, false]);
    expect(blocked).toMatchObject({ isBlocked: true, timeToBlockExpire: 30 });
    expect(stillBlocked).toMatchObject({ isBlocked: true, timeToBlockExpire: 1 });
    expect(again).toMatchObject({ isBlocked: false, totalHits: 1 });
  });

  it('[DEC-090] should let requests through when the counters fail (the general limit fails open)', async () => {
    const broken = new MemoryRateCounter();
    vi.spyOn(broken, 'ttl').mockRejectedValue(new Error('Connection is closed.'));
    const storage = new CounterThrottlerStorage(broken);

    await expect(storage.increment('client', 60_000, 1, 0)).resolves.toMatchObject({ isBlocked: false });
    await expect(storage.increment('client', 60_000, 1, 0)).resolves.toMatchObject({ isBlocked: false });
  });
});

describe('request tracker', () => {
  it('[BR-AUTH-07] should count a signed-in user by id and anyone else by address', async () => {
    const token = await jwt.signAsync({ sub: 'user-1', sid: 'session-1' });
    const forged = await new JwtService({ secret: SECRET.split('').reverse().join('') }).signAsync({
      sub: 'user-1',
    });

    expect(await requestTracker({ ip: '203.0.113.7', headers: { authorization: `Bearer ${token}` } }, jwt)).toBe(
      'user:user-1',
    );
    expect(await requestTracker({ ip: '203.0.113.7', headers: { authorization: `Bearer ${forged}` } }, jwt)).toBe(
      'ip:203.0.113.7',
    );
    expect(await requestTracker({ ip: '203.0.113.7', headers: {} }, jwt)).toBe('ip:203.0.113.7');
    // IPv6 clients are grouped by /64, as the throttler does.
    expect(await requestTracker({ ip: '2001:db8:1:2:3:4:5:6', headers: {} }, jwt)).toBe(
      await requestTracker({ ip: '2001:db8:1:2:ffff::1', headers: {} }, jwt),
    );
  });
});
