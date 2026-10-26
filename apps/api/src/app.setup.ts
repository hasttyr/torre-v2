import type { NestApplicationOptions } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { correlationIdMiddleware } from './common/correlation-id.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { AppConfig } from './config/app-config.js';

/** Health checks stay at the root, where load balancers look for them (ARCHITECTURE.md §9). */
export const API_PREFIX = 'api/v1';
const OUTSIDE_PREFIX = ['health/live', 'health/ready'];

/**
 * Options to create the application with, in `main.ts` and in the tests. Nest's own JSON parser is
 * off because its limit is 100 KB: `configureApp` installs one with `BODY_LIMIT`.
 */
export const APP_OPTIONS = { bodyParser: false, bufferLogs: true } as const satisfies NestApplicationOptions;

/**
 * The HTTP pipeline of the API, shared by `main.ts` and the tests so both run the same thing (US-006).
 * The application must be created with `APP_OPTIONS`.
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const config = app.get(AppConfig);
  app.useLogger(app.get(Logger));
  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.disable('x-powered-by');
  app.enableCors({
    origin: [...config.get('CORS_ORIGINS')],
    credentials: true,
    exposedHeaders: ['X-Correlation-Id', 'Retry-After'],
  });
  // JSON only, up to BODY_LIMIT (DEC-075); bigger bodies answer 413 PAYLOAD_TOO_LARGE.
  app.useBodyParser('json', { limit: config.get('BODY_LIMIT') });
  app.setGlobalPrefix(API_PREFIX, { exclude: OUTSIDE_PREFIX });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
  return app;
}
