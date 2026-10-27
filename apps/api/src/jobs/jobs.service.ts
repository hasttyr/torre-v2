import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import type { JobsOptions, JobState, Queue } from 'bullmq';
import type { JobContext, JobEnvelope } from './job-envelope.js';
import { jobContextSchema } from './job-envelope.js';
import type { QueueName } from './queues.js';

export interface JobStatus {
  readonly id: string;
  readonly state: JobState;
  readonly attemptsMade: number;
  /** Why the last attempt failed; shown to operators only (it may name internals). */
  readonly failedReason: string | null;
}

/** Producer side of the queues, used by the API and the worker alike (US-117:AC1). */
@Injectable()
export class JobsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  queue(name: QueueName): Queue {
    return this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
  }

  /**
   * Adds a job with its context (US-117:AC3). `jobId` makes the enqueue idempotent: BullMQ ignores a
   * second job with the same id while the first one exists (pairing uses `tournamentId:round`, DEC-079).
   */
  async enqueue<P>(
    queue: QueueName,
    name: string,
    payload: P,
    context: JobContext,
    options: Pick<JobsOptions, 'jobId' | 'delay'> = {},
  ): Promise<string> {
    const data: JobEnvelope<P> = { context: jobContextSchema.parse(context), payload };
    const job = await this.queue(queue).add(name, data, options);
    if (job.id === undefined) throw new Error(`BullMQ returned no id for a job of ${queue}`);
    return job.id;
  }

  /** The state of a job, for `GET` endpoints that answered `202` (DEC-079). */
  async status(queue: QueueName, id: string): Promise<JobStatus | null> {
    // State first: a finished state implies the data already carries its outcome (BullMQ writes both in
    // one script), while data read first could predate the state.
    const state = await this.queue(queue).getJobState(id);
    const job = await this.queue(queue).getJob(id);
    if (!job || state === 'unknown') return null;
    return { id, state, attemptsMade: job.attemptsMade, failedReason: job.failedReason || null };
  }

  /** Manual reprocessing of a failed job (US-117:AC6): it runs again with its full number of attempts. */
  async retry(queue: QueueName, id: string): Promise<void> {
    const job = await this.queue(queue).getJob(id);
    if (!job) throw new Error(`job ${id} not found in ${queue}`);
    await job.retry('failed', { resetAttemptsMade: true });
  }
}
