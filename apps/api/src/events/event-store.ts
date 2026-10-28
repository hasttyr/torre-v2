import { apiError } from '../common/api-error.js';
import { Prisma } from '../database/generated/client.js';
import type { Transaction } from '../database/transaction.js';

/** Streams of the store (ARCHITECTURE.md §7.1): one per tournament. */
export const STREAM_TYPES = ['tournament'] as const;
export type StreamType = (typeof STREAM_TYPES)[number];

/** Who and why, beside the payload (ARCHITECTURE.md §7.2). Ids only, never personal data. */
export interface EventMetadata {
  readonly actor: { readonly userId: string; readonly role: string; readonly deviceId?: string };
  readonly correlationId: string;
  readonly causationId?: string;
  readonly idempotencyKey?: string;
  /** Required in corrections, reopenings and overrides (BR-AUD-01). */
  readonly reason?: string;
}

/** An event the domain decided, before the store gives it a sequence. */
export interface NewEvent {
  readonly type: string;
  readonly schemaVersion: number;
  readonly payload: Prisma.InputJsonValue;
  /** When it happened in the tournament; it may come from the client (offline). */
  readonly occurredAt: Date;
  readonly metadata: EventMetadata;
}

export interface StoredEvent {
  readonly globalPosition: bigint;
  readonly eventId: string;
  readonly organizationId: string;
  readonly streamType: StreamType;
  readonly streamId: string;
  readonly sequence: number;
  readonly type: string;
  readonly schemaVersion: number;
  readonly payload: unknown;
  readonly metadata: EventMetadata;
  readonly occurredAt: Date;
  readonly recordedAt: Date;
}

export interface AppendRequest {
  readonly organizationId: string;
  readonly streamType: StreamType;
  readonly streamId: string;
  /** The last sequence the caller saw (0 for a new stream). */
  readonly expectedSequence: number;
  readonly events: readonly NewEvent[];
}

interface Row {
  global_position: bigint;
  event_id: string;
  organization_id: string;
  stream_type: StreamType;
  stream_id: string;
  sequence: number;
  type: string;
  schema_version: number;
  payload: unknown;
  metadata: EventMetadata;
  occurred_at: Date;
  recorded_at: Date;
}

const COLUMNS = Prisma.sql`global_position, event_id, organization_id, stream_type, stream_id, sequence, type,
  schema_version, payload, metadata, occurred_at, recorded_at`;

const toStored = (r: Row): StoredEvent => ({
  globalPosition: r.global_position,
  eventId: r.event_id,
  organizationId: r.organization_id,
  streamType: r.stream_type,
  streamId: r.stream_id,
  sequence: r.sequence,
  type: r.type,
  schemaVersion: r.schema_version,
  payload: r.payload,
  metadata: r.metadata,
  occurredAt: r.occurred_at,
  recordedAt: r.recorded_at,
});

const versionConflict = (streamId: string, expected: number, actual?: number) =>
  apiError('VERSION_CONFLICT', {
    detail:
      actual === undefined
        ? `Stream ${streamId} changed while appending after sequence ${String(expected)}`
        : `Stream ${streamId} is at sequence ${String(actual)}, not ${String(expected)}`,
  });

/** Another writer took the same sequence first: the unique key (stream_id, sequence) refused this one. */
function isSequenceTaken(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify(error)}` : String(error);
  return /events_stream_id_sequence_key|23505/.test(text);
}

/**
 * Appends `events` to a stream in the caller's transaction (US-045:AC2), with optimistic concurrency: the
 * stream must still end at `expectedSequence`, or `VERSION_CONFLICT`. The events take the next sequences
 * with no gap (INV-E-1); if a concurrent writer takes them first, the unique key (stream_id, sequence)
 * refuses this append and it is a `VERSION_CONFLICT` too. All or nothing: one bad event writes none.
 *
 * The transaction must run in the tenant `organizationId` (RLS, US-025). Raw SQL, never the ORM, for the
 * append (story notes); parameters only.
 */
export async function appendEvents(tx: Transaction, request: AppendRequest): Promise<StoredEvent[]> {
  const { organizationId, streamType, streamId, expectedSequence, events } = request;
  if (!Number.isInteger(expectedSequence) || expectedSequence < 0) {
    throw new TypeError('appendEvents: expectedSequence must be a non-negative integer');
  }
  if (events.length === 0) return [];
  const [head] = await tx.$queryRaw<{ last: number }[]>`
    SELECT COALESCE(max(sequence), 0)::int AS last FROM events WHERE stream_id = ${streamId}::uuid`;
  const last = head?.last ?? 0;
  if (last !== expectedSequence) throw versionConflict(streamId, expectedSequence, last);
  const values = events.map(
    (e, i) => Prisma.sql`(${organizationId}::uuid, ${streamType}, ${streamId}::uuid, ${expectedSequence + i + 1},
      ${e.type}, ${e.schemaVersion}, ${JSON.stringify(e.payload)}::jsonb, ${JSON.stringify(e.metadata)}::jsonb,
      ${e.occurredAt})`,
  );
  try {
    const rows = await tx.$queryRaw<Row[]>`
      INSERT INTO events (organization_id, stream_type, stream_id, sequence, type, schema_version, payload, metadata,
        occurred_at)
      VALUES ${Prisma.join(values)}
      RETURNING ${COLUMNS}`;
    return rows.map(toStored).sort((a, b) => a.sequence - b.sequence);
  } catch (error) {
    if (isSequenceTaken(error)) throw versionConflict(streamId, expectedSequence);
    throw error;
  }
}

/** A stream from `fromSequence` on (1: the whole stream), in order (US-045:AC4). */
export async function readStream(tx: Transaction, streamId: string, fromSequence = 1): Promise<StoredEvent[]> {
  const rows = await tx.$queryRaw<Row[]>`
    SELECT ${COLUMNS} FROM events
    WHERE stream_id = ${streamId}::uuid AND sequence >= ${fromSequence}
    ORDER BY sequence`;
  return rows.map(toStored);
}
