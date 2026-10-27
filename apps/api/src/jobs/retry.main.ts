// `pnpm --filter @torre/api jobs:retry <queue> <jobId>` (US-117:AC6): puts a failed job back in its
// queue with its full number of attempts. Failed jobs stay 7 days (DEC-086).
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigModule } from '../config/config.module.js';
import { JobsModule } from './jobs.module.js';
import { JobsService } from './jobs.service.js';
import { QUEUE_NAMES } from './queues.js';
import type { QueueName } from './queues.js';

const [queue, id] = process.argv.slice(2);
const isQueue = (name: string | undefined): name is QueueName => QUEUE_NAMES.some((q) => q === name);
if (!isQueue(queue) || id === undefined) {
  console.error(`uso: jobs:retry <${QUEUE_NAMES.join('|')}> <jobId>`);
  process.exit(2);
}

@Module({ imports: [await AppConfigModule.forRoot(), JobsModule.forRoot({ worker: false })] })
class RetryModule {}

const app = await NestFactory.createApplicationContext(RetryModule, { logger: ['error', 'warn'] });
try {
  const jobs = app.get(JobsService);
  await jobs.retry(queue, id);
  console.log(`jobs:retry: ${queue}/${id} vuelve a la cola (${(await jobs.status(queue, id))?.state ?? '?'})`);
} finally {
  await app.close();
}
