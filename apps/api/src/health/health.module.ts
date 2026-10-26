import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfig } from '../config/app-config.js';
import { HealthController } from './health.controller.js';
import { DATABASE_PROBE, postgresProbe, REDIS_PROBE, redisProbe } from './probes.js';

@Module({
  // Terminus logs failed checks itself with their full error; HealthController logs a scrubbed reason.
  imports: [TerminusModule.forRoot({ logger: false })],
  controllers: [HealthController],
  providers: [
    {
      provide: DATABASE_PROBE,
      inject: [AppConfig],
      useFactory: (c: AppConfig) => postgresProbe(c.get('DATABASE_URL')),
    },
    { provide: REDIS_PROBE, inject: [AppConfig], useFactory: (c: AppConfig) => redisProbe(c.get('REDIS_URL')) },
  ],
})
export class HealthModule {}
