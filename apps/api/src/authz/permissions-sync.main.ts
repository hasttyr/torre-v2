// `pnpm permissions:sync` (US-024:AC1): loads the permission catalogue with the migration role. Run it
// after every `db:deploy` (ARCHITECTURE.md §16.5).
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfig } from '../config/app-config.js';
import { AppConfigModule } from '../config/config.module.js';
import { createPrismaClient } from '../database/prisma.js';
import { syncPermissions } from './permissions-sync.js';

@Module({ imports: [await AppConfigModule.forRoot()] })
class SyncModule {}

const app = await NestFactory.createApplicationContext(SyncModule, { logger: ['error', 'warn'] });
const url = app.get(AppConfig).get('DATABASE_MIGRATION_URL');
await app.close();
if (url === undefined) throw new Error('permissions:sync needs DATABASE_MIGRATION_URL (the migration role)');
const client = createPrismaClient(url);
try {
  const report = await syncPermissions(client);
  console.log(
    `permissions:sync: ${report.added.length} permisos nuevos, ${report.updated.length} actualizados, ` +
      `${report.granted} asignaciones de la matriz a los roles del sistema`,
  );
} finally {
  await client.$disconnect();
}
