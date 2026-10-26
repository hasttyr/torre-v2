import type { ServerResponse } from 'node:http';
import { Catch, Controller, Get, Inject, Logger, ServiceUnavailableException, UseFilters } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import type { HealthCheckResult, HealthIndicatorResult } from '@nestjs/terminus';
import { scrubCredentials } from '../common/logging.module.js';
import { DATABASE_PROBE, REDIS_PROBE } from './probes.js';
import type { Probe } from './probes.js';

/**
 * A failed readiness check is an answer, not an API error: 503 with Terminus' body (status, info, error,
 * details) so load balancers and operators see which dependency is down.
 */
@Catch(ServiceUnavailableException)
class HealthUnavailableFilter implements ExceptionFilter {
  catch(exception: ServiceUnavailableException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<ServerResponse>();
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(exception.getResponse()));
  }
}

/** Why a probe failed, for the log: the message, or the error code when there is none (`ECONNREFUSED`). */
function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown';
  const { code } = error as { code?: unknown };
  return scrubCredentials(error.message || (typeof code === 'string' ? code : error.name));
}

/** `/health/live` (the process answers) and `/health/ready` (database and Redis), US-006:AC4. */
@Controller('health')
@UseFilters(HealthUnavailableFilter)
export class HealthController {
  private readonly logger = new Logger('Health');

  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(HealthIndicatorService) private readonly indicators: HealthIndicatorService,
    @Inject(DATABASE_PROBE) private readonly database: Probe,
    @Inject(REDIS_PROBE) private readonly redis: Probe,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.probe('database', this.database), () => this.probe('redis', this.redis)]);
  }

  /** The public answer only says up or down; the reason goes to the log, without credentials. */
  private async probe(key: string, probe: Probe): Promise<HealthIndicatorResult> {
    const indicator = this.indicators.check(key);
    try {
      await probe();
      return indicator.up();
    } catch (error) {
      this.logger.warn({ dependency: key, reason: reasonOf(error) }, 'Dependency not ready');
      return indicator.down();
    }
  }
}
