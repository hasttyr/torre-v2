import type { JobsOptions } from 'bullmq';

/** Every queue of the platform (ARCHITECTURE.md §11). */
export const QUEUE_NAMES = ['pairing', 'emails', 'reports', 'ratings', 'projections-rebuild', 'maintenance'] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

interface QueuePolicy {
  /** Attempts in total, the first one included (ARCHITECTURE.md §11). */
  readonly attempts: number;
  /** Jobs a worker runs at the same time (DEC-086). */
  readonly concurrency: number;
}

/**
 * Per-queue policy. Pairing runs one job at a time per worker: it uses the CPU and holds the event loop
 * (DEC-079); the rest run five at a time (DEC-086).
 */
export const QUEUE_POLICIES: Readonly<Record<QueueName, QueuePolicy>> = {
  pairing: { attempts: 3, concurrency: 1 },
  emails: { attempts: 5, concurrency: 5 },
  reports: { attempts: 3, concurrency: 5 },
  ratings: { attempts: 3, concurrency: 5 },
  'projections-rebuild': { attempts: 1, concurrency: 5 },
  maintenance: { attempts: 3, concurrency: 5 },
};

/** Exponential backoff from 1 s: 1 s, 2 s, 4 s… between attempts (DEC-086). */
export const BACKOFF_BASE_MS = 1_000;
/** Completed jobs: the last 1 000 or 24 hours (DEC-086). */
export const KEEP_COMPLETED = { age: 24 * 60 * 60, count: 1_000 } as const;
/** Failed jobs stay 7 days for manual reprocessing, like idempotency keys (DEC-086, DEC-062). */
export const KEEP_FAILED = { age: 7 * 24 * 60 * 60 } as const;
/** How long a worker waits for its running jobs on SIGTERM before it exits (DEC-086). */
export const SHUTDOWN_GRACE_MS = 30_000;

/** Default options of every job added to `queue`. */
export function jobOptions(queue: QueueName): JobsOptions {
  return {
    attempts: QUEUE_POLICIES[queue].attempts,
    backoff: { type: 'exponential', delay: BACKOFF_BASE_MS },
    removeOnComplete: KEEP_COMPLETED,
    removeOnFail: KEEP_FAILED,
  };
}
