import type { INestApplication } from '@nestjs/common';
import { correlationIdMiddleware } from './common/correlation-id.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';

/** Health checks stay at the root, where load balancers look for them (ARCHITECTURE.md §9). */
export const API_PREFIX = 'api/v1';
const OUTSIDE_PREFIX = ['health/live', 'health/ready'];

/**
 * The HTTP pipeline of the API, shared by `main.ts` and the e2e tests so both run the same thing
 * (US-006).
 */
export function configureApp(app: INestApplication): INestApplication {
  app.use(correlationIdMiddleware);
  app.setGlobalPrefix(API_PREFIX, { exclude: OUTSIDE_PREFIX });
  app.useGlobalFilters(new ProblemDetailsFilter());
  return app;
}
