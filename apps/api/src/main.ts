// Entry point of @torre/api: the HTTP API, or the worker with WORKER=true (same code, another process;
// ARCHITECTURE.md §11, US-117).
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { APP_OPTIONS, configureApp } from './app.setup.js';
import { AppConfig } from './config/app-config.js';
import { isWorkerProcess } from './config/process-role.js';
import { SHUTDOWN_GRACE_MS } from './jobs/queues.js';
import { exitOnSignals } from './jobs/worker.js';

async function bootstrap(): Promise<void> {
  if (isWorkerProcess()) {
    const worker = await NestFactory.createApplicationContext(await AppModule.forRoot({ worker: true }), {
      bufferLogs: true,
    });
    worker.useLogger(worker.get(Logger));
    exitOnSignals(worker, SHUTDOWN_GRACE_MS);
    return;
  }
  const app = configureApp(await NestFactory.create<NestExpressApplication>(await AppModule.forRoot(), APP_OPTIONS));
  await app.listen(app.get(AppConfig).get('PORT'));
}

await bootstrap();
