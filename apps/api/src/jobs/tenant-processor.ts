import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { DatabaseService } from '../database/database.service.js';
import type { Transaction } from '../database/transaction.js';
import { readEnvelope, SYSTEM_ACTOR } from './job-envelope.js';
import type { JobContext } from './job-envelope.js';

/** What a job handler gets besides its payload. */
export interface JobRun {
  readonly context: JobContext;
  /** A transaction with the job's tenant and actor set, so RLS applies as in the API (DEC-078). */
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * Base of every processor except `maintenance` (US-117:AC3): it reads the job's context, logs with the
 * correlation id of the request that queued it, and opens every transaction with that tenant. A
 * subclass declares its queue with `@Processor(queue, { concurrency: QUEUE_POLICIES[queue].concurrency })`.
 */
export abstract class TenantJobProcessor<P> extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(private readonly database: DatabaseService) {
    super();
  }

  /** Validates `payload`; the envelope itself is already valid. */
  protected abstract parse(payload: unknown): P;

  protected abstract handle(payload: P, run: JobRun, job: Job): Promise<unknown>;

  async process(job: Job): Promise<unknown> {
    const { context, payload } = readEnvelope(job.data);
    const { organizationId, actor, correlationId } = context;
    const run: JobRun = {
      context,
      transaction: (work) =>
        this.database.withTransaction(work, {
          ...(organizationId === null ? {} : { organizationId }),
          ...(actor === SYSTEM_ACTOR ? {} : { userId: actor }),
        }),
    };
    this.logger.log(
      { correlationId, jobId: job.id, queue: job.queueName, attempt: job.attemptsMade + 1 },
      'Job started',
    );
    return this.handle(this.parse(payload), run, job);
  }
}
