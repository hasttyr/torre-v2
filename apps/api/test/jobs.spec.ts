import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { stubExampleEnv } from '../src/__tests__/env.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { MaintenanceDatabase } from '../src/database/maintenance-database.js';
import { SYSTEM_ACTOR } from '../src/jobs/job-envelope.js';
import type { JobContext } from '../src/jobs/job-envelope.js';
import { JobsService } from '../src/jobs/jobs.service.js';
import type { JobStatus } from '../src/jobs/jobs.service.js';
import type { QueueName } from '../src/jobs/queues.js';
import { TenantJobProcessor } from '../src/jobs/tenant-processor.js';
import type { JobRun } from '../src/jobs/tenant-processor.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

const ORG = '0190c2a8-7a3b-7c1d-8e2f-3a4b5c6d7e8f';
const USER = '0190c2a8-7a3b-7c1d-9e2f-3a4b5c6d7e90';
const context = (organizationId: string | null, actor = SYSTEM_ACTOR): JobContext => ({
  organizationId,
  actor,
  correlationId: `test-${randomUUID()}`,
});

/** Fails its first two attempts, then succeeds (ratings: 3 attempts). */
@Injectable()
@Processor('ratings', { concurrency: 5 })
class FlakyProcessor extends TenantJobProcessor<{ id: string }> {
  readonly attempts = new Map<string, number>();
  constructor(database: DatabaseService) {
    super(database);
  }
  protected parse(payload: unknown) {
    return payload as { id: string };
  }
  protected handle(payload: { id: string }) {
    const attempt = (this.attempts.get(payload.id) ?? 0) + 1;
    this.attempts.set(payload.id, attempt);
    return attempt < 3 ? Promise.reject(new Error(`transient failure ${attempt}`)) : Promise.resolve({ attempt });
  }
}

/** Always fails (reports: 3 attempts). */
@Injectable()
@Processor('reports', { concurrency: 5 })
class BrokenProcessor extends TenantJobProcessor<unknown> {
  constructor(database: DatabaseService) {
    super(database);
  }
  protected parse(payload: unknown) {
    return payload;
  }
  protected handle(): Promise<never> {
    return Promise.reject(new Error('the PDF engine is down'));
  }
}

/** Returns the tenant settings that its transaction sees (projections-rebuild: 1 attempt). */
@Injectable()
@Processor('projections-rebuild', { concurrency: 5 })
class ContextProcessor extends TenantJobProcessor<unknown> {
  constructor(database: DatabaseService) {
    super(database);
  }
  protected parse(payload: unknown) {
    return payload;
  }
  protected handle(_payload: unknown, run: JobRun) {
    return run.transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ org: string; user: string }[]>`
        SELECT current_setting('app.organization_id', true) AS org, current_setting('app.user_id', true) AS user`;
      return row;
    });
  }
}

/** Takes a while, to be caught running by a shutdown (pairing: concurrency 1). */
@Injectable()
@Processor('pairing', { concurrency: 1 })
class SlowProcessor extends TenantJobProcessor<unknown> {
  static finished = 0;
  constructor(database: DatabaseService) {
    super(database);
  }
  protected parse(payload: unknown) {
    return payload;
  }
  protected async handle(_payload: unknown, _run: JobRun, job: Job) {
    await job.updateProgress(1);
    await new Promise((resolve) => setTimeout(resolve, 800));
    SlowProcessor.finished += 1;
    return 'done';
  }
}

let db: TestDatabase;

async function startWorker(): Promise<INestApplicationContext> {
  const app = await Test.createTestingModule({
    imports: [await AppModule.forRoot({ ignoreEnvFile: true, worker: true, prefix: `torre-test-${randomUUID()}` })],
    providers: [FlakyProcessor, BrokenProcessor, ContextProcessor, SlowProcessor],
  }).compile();
  // Lifecycle hooks run here: the noeviction check and the BullMQ workers start.
  await app.init();
  return app;
}

/** Polls a job until it reaches one of `states`. */
async function waitFor(jobs: JobsService, queue: QueueName, id: string, states: string[]): Promise<JobStatus> {
  for (let i = 0; i < 200; i++) {
    const status = await jobs.status(queue, id);
    if (status && states.includes(status.state)) return status;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`job ${id} of ${queue} never reached ${states.join('/')}`);
}

beforeAll(async () => {
  db = await createTestDatabase();
  stubExampleEnv({
    DATABASE_URL: db.appUrl,
    DATABASE_MAINTENANCE_URL: db.maintenanceUrl,
    REDIS_URL: inject('redis').url,
    WORKER: 'true',
    LOG_LEVEL: 'silent',
  });
});

afterAll(async () => {
  await db.dispose();
  vi.unstubAllEnvs();
});

describe('worker (US-117)', () => {
  let worker: INestApplicationContext;
  let jobs: JobsService;

  beforeAll(async () => {
    // Boots only if Redis has maxmemory-policy noeviction (US-117:AC5).
    worker = await startWorker();
    jobs = worker.get(JobsService);
  });

  afterAll(async () => {
    await worker.close();
  });

  it('[US-117:AC1] should retry a failing job with backoff until it succeeds', async () => {
    const id = await jobs.enqueue('ratings', 'recalculate', { id: 'r1' }, context(ORG));
    const status = await waitFor(jobs, 'ratings', id, ['completed', 'failed']);

    expect(status.state).toBe('completed');
    expect(worker.get(FlakyProcessor).attempts.get('r1')).toBe(3);
  });

  it('[US-117:AC6] should leave a job that keeps failing in failed with its reason, ready to retry by hand', async () => {
    const id = await jobs.enqueue('reports', 'pdf', {}, context(ORG));
    const failed = await waitFor(jobs, 'reports', id, ['failed']);

    expect(failed).toMatchObject({ attemptsMade: 3, failedReason: 'the PDF engine is down' });
    await jobs.retry('reports', id);
    expect((await jobs.status('reports', id))?.state).toMatch(/waiting|active|delayed|prioritized/);
  });

  it('[US-117:AC3] should open the job transactions with its tenant and actor, and with none for the system', async () => {
    const withTenant = await jobs.enqueue('projections-rebuild', 'rebuild', {}, context(ORG, USER));
    const withoutTenant = await jobs.enqueue('projections-rebuild', 'rebuild', {}, context(null));
    await waitFor(jobs, 'projections-rebuild', withTenant, ['completed']);
    await waitFor(jobs, 'projections-rebuild', withoutTenant, ['completed']);

    const queue = jobs.queue('projections-rebuild');
    expect((await queue.getJob(withTenant))?.returnvalue).toEqual({ org: ORG, user: USER });
    expect((await queue.getJob(withoutTenant))?.returnvalue).toEqual({ org: '', user: '' });
  });

  it('[US-117:AC3] should fail at once a job queued without a valid context', async () => {
    const job = await jobs.queue('ratings').add('recalculate', { payload: { id: 'x' } });
    const status = await waitFor(jobs, 'ratings', String(job.id), ['failed']);

    // UnrecoverableError: failed on the first attempt, never retried (BullMQ does not count it).
    expect(status.attemptsMade).toBeLessThanOrEqual(1);
    expect(status.failedReason).toContain('without a valid context');
  });

  it('[US-117:AC4] should give the maintenance role BYPASSRLS but no access to other tables', async () => {
    const maintenance = worker.get(MaintenanceDatabase).client;
    const [role] = await maintenance.$queryRaw<{ bypass: boolean }[]>`
      SELECT rolbypassrls AS bypass FROM pg_roles WHERE rolname = current_user`;

    expect(role?.bypass).toBe(true);
    await expect(maintenance.institution.findMany()).rejects.toThrow(/permission denied/i);
  });
});

describe('shutdown (US-117:AC2)', () => {
  it('[US-117:AC2] should let the running job finish before the worker closes', async () => {
    const worker = await startWorker();
    const jobs = worker.get(JobsService);
    const id = await jobs.enqueue('pairing', 'pair', {}, context(ORG));
    await waitFor(jobs, 'pairing', id, ['active']);
    const before = SlowProcessor.finished;

    await worker.close();

    expect(SlowProcessor.finished).toBe(before + 1);
  });
});
