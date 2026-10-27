import type { Prisma, PrismaClient } from './generated/client.js';

/** The client inside a transaction: everything except opening another one. */
export type Transaction = Prisma.TransactionClient;

/**
 * Who the work runs for. US-025 turns `organizationId` into Row-Level Security; `userId` feeds the
 * per-user policies (role requests, notifications). Both come from the server, never from the body.
 */
export interface TransactionContext {
  readonly organizationId?: string;
  readonly userId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The single way to open a transaction (US-007:AC3; ESLint forbids `$transaction` elsewhere). Before
 * any query it sets `app.organization_id` and `app.user_id` with `set_config(…, true)`: they last until
 * the end of this transaction only, which also holds behind a pooler in transaction mode
 * (ARCHITECTURE.md §6.3, §16.5). A missing value is set to `''`, never inherited: policies read it with
 * `NULLIF(current_setting('app.organization_id', true), '')::uuid` and see no tenant.
 */
export async function withTransaction<T>(
  client: PrismaClient,
  work: (tx: Transaction) => Promise<T>,
  context: TransactionContext = {},
): Promise<T> {
  for (const [name, value] of Object.entries(context)) {
    if (value !== undefined && (typeof value !== 'string' || !UUID.test(value))) {
      throw new TypeError(`withTransaction: ${name} must be a UUID`);
    }
  }
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.organization_id', ${context.organizationId ?? ''}, true), set_config('app.user_id', ${context.userId ?? ''}, true)`;
    return work(tx);
  });
}
