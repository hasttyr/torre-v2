// `pnpm db:seed` (US-007:AC4): seeds the local database with the application role.
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfig } from '../config/app-config.js';
import { AppConfigModule } from '../config/config.module.js';
import { DatabaseModule } from './database.module.js';
import { DatabaseService } from './database.service.js';
import { assertSeedAllowed, seed } from './seed.js';

@Module({ imports: [await AppConfigModule.forRoot(), DatabaseModule] })
class SeedModule {}

const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
try {
  assertSeedAllowed(app.get(AppConfig).get('NODE_ENV'));
  const report = await seed(app.get(DatabaseService).client);
  console.log(
    `db:seed: instituciones demo — ${report.institutions.created} creadas, ${report.institutions.existing} ya existían`,
  );
} finally {
  await app.close();
}
