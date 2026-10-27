import type { INestApplicationContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/**
 * Closes the application (workers finish their running jobs, US-117:AC2) unless it takes longer than
 * `graceMs`; then the caller exits anyway and BullMQ hands the unfinished jobs to another worker as
 * stalled.
 */
export async function closeWithin(close: () => Promise<void>, graceMs: number): Promise<'closed' | 'timeout'> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), graceMs);
  });
  try {
    return await Promise.race([close().then(() => 'closed' as const), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** SIGTERM and SIGINT close the worker within `graceMs` and end the process. */
export function exitOnSignals(app: INestApplicationContext, graceMs: number): void {
  const logger = new Logger('Worker');
  const stop = (signal: NodeJS.Signals) => {
    logger.log({ signal }, 'Stopping: waiting for running jobs');
    void closeWithin(() => app.close(), graceMs).then((outcome) => {
      logger.log({ outcome }, 'Worker stopped');
      process.exit(outcome === 'closed' ? 0 : 1);
    });
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}
