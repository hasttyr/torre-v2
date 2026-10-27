import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';

export { PrismaClient };

/**
 * A Prisma Client over node-postgres (Prisma 7 needs a driver adapter). It connects on the first
 * query, so the API starts even when the database is down (readiness reports it, US-006).
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
