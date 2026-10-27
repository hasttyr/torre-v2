import { UnrecoverableError } from 'bullmq';
import { z } from 'zod';

/** The system itself, when no user asked for the work (maintenance, scheduled jobs). */
export const SYSTEM_ACTOR = 'system';

/**
 * Who a job runs for (US-117:AC3, DEC-078): the tenant, the user who asked for it (or `system`) and
 * the correlation id of the request that queued it, so its logs join the request's.
 */
export const jobContextSchema = z.strictObject({
  organizationId: z.uuid().nullable(),
  actor: z.union([z.uuid(), z.literal(SYSTEM_ACTOR)]),
  correlationId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/),
});
export type JobContext = z.infer<typeof jobContextSchema>;

/** The data of every job: its context and the payload of its kind. */
export interface JobEnvelope<P> {
  readonly context: JobContext;
  readonly payload: P;
}

const envelopeSchema = z.strictObject({ context: jobContextSchema, payload: z.unknown() });

/** Reads the context of a job; a job without a valid one fails without retries (it would fail again). */
export function readEnvelope(data: unknown): { context: JobContext; payload: unknown } {
  const parsed = envelopeSchema.safeParse(data);
  if (!parsed.success) throw new InvalidJobError(parsed.error.issues.map((i) => i.path.join('.') || '(root)'));
  return parsed.data;
}

/** `UnrecoverableError`: BullMQ moves the job to `failed` at once instead of retrying it. */
export class InvalidJobError extends UnrecoverableError {
  constructor(readonly paths: readonly string[]) {
    super(`job data without a valid context: ${paths.join(', ')}`);
    this.name = 'InvalidJobError';
  }
}
