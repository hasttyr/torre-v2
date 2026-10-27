import { Controller, Get, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { apiContract } from '@torre/contracts';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';
import { openApiDocument } from './openapi.js';

@Controller()
export class SystemController {
  @Implement(apiContract.system.ping)
  ping() {
    return implement(apiContract.system.ping).handler(() => ({ pong: true as const }));
  }
}

/** Outside the contracts on purpose: it serves them. Never in production (US-008:AC4). */
@Controller('api/docs')
export class DocsController {
  constructor(@Inject(AppConfig) private readonly config: AppConfig) {}

  @Get()
  document(): Promise<unknown> {
    if (this.config.get('NODE_ENV') === 'production') throw apiError('NOT_FOUND');
    return openApiDocument();
  }
}
