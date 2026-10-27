import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

/** Data access shared by every module (ARCHITECTURE.md §6.2, US-007). */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
