import { describe, expect, it } from 'vitest';
import { InvalidJobError, readEnvelope } from './job-envelope.js';
import { jobOptions, QUEUE_NAMES, QUEUE_POLICIES } from './queues.js';
import { assertNoEviction, redisConnection } from './redis.js';
import { closeWithin } from './worker.js';

const ORG = '0190c2a8-7a3b-7c1d-8e2f-3a4b5c6d7e8f';

describe('queue policies (US-117, DEC-086)', () => {
  it('[US-117:AC1] should retry with exponential backoff from 1 s and keep failed jobs 7 days', () => {
    expect(jobOptions('emails')).toEqual({
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800 },
    });
    expect(QUEUE_NAMES.map((q) => [q, QUEUE_POLICIES[q].attempts, QUEUE_POLICIES[q].concurrency])).toEqual([
      ['pairing', 3, 1],
      ['emails', 5, 5],
      ['reports', 3, 5],
      ['ratings', 3, 5],
      ['projections-rebuild', 1, 5],
      ['maintenance', 3, 5],
    ]);
  });

  it('[US-117:AC1] should connect workers without a retry limit and the API failing fast', () => {
    const url = 'rediss://user:p%40ss@cache.example:6380/2';

    expect(redisConnection(url, { worker: true })).toEqual({
      host: 'cache.example',
      port: 6380,
      username: 'user',
      password: 'p@ss',
      db: 2,
      tls: {},
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
    });
    expect(redisConnection('redis://localhost', { worker: false })).toEqual({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  });
});

describe('noeviction (US-117:AC5)', () => {
  const reader = (policy: string) => ({ config: () => Promise.resolve(['maxmemory-policy', policy]) });

  it('[US-117:AC5] should refuse a Redis that may evict keys', async () => {
    await expect(assertNoEviction(reader('allkeys-lru'))).rejects.toThrow('needs "noeviction"');
    await expect(assertNoEviction(reader('noeviction'))).resolves.toBeUndefined();
  });
});

describe('job context (US-117:AC3)', () => {
  it('[US-117:AC3] should read the tenant, the actor and the correlation id of a job', () => {
    const data = { context: { organizationId: ORG, actor: 'system', correlationId: 'req-1' }, payload: { n: 1 } };

    expect(readEnvelope(data)).toEqual(data);
  });

  it('[US-117:AC3] should fail a job without a valid context, without retries', () => {
    const missing = () => readEnvelope({ payload: {} });
    const badTenant = () =>
      readEnvelope({ context: { organizationId: 'x', actor: 'system', correlationId: 'c' }, payload: 1 });

    expect(missing).toThrow(InvalidJobError);
    expect(badTenant).toThrow('context.organizationId');
  });
});

describe('graceful shutdown (US-117:AC2)', () => {
  it('[US-117:AC2] should wait for the close up to the grace period, then give up', async () => {
    const quick = await closeWithin(() => new Promise((r) => setTimeout(r, 10)), 1_000);
    const stuck = await closeWithin(() => new Promise(() => undefined), 50);

    expect(quick).toBe('closed');
    expect(stuck).toBe('timeout');
  });
});
