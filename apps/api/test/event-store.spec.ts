import { randomUUID } from 'node:crypto';
import fc from 'fast-check';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../src/database/prisma.js';
import type { PrismaClient } from '../src/database/prisma.js';
import { withTransaction } from '../src/database/transaction.js';
import { appendEvents, readStream } from '../src/events/event-store.js';
import type { NewEvent } from '../src/events/event-store.js';
import { createTestDatabase } from './support/test-database.js';
import type { TestDatabase } from './support/test-database.js';

let db: TestDatabase;
let migrator: PrismaClient;

beforeAll(async () => {
  db = await createTestDatabase();
  migrator = createPrismaClient(db.migrationUrl);
});

afterAll(async () => {
  await migrator.$disconnect();
  await db.dispose();
});

const metadata = { actor: { userId: randomUUID(), role: 'tournament_director' }, correlationId: randomUUID() };
const event = (type: string, n: number): NewEvent => ({
  type,
  schemaVersion: 1,
  payload: { n },
  occurredAt: new Date('2026-10-28T12:00:00Z'),
  metadata,
});

/** Appends as the application role, inside the tenant (RLS, US-025). */
const append = (organizationId: string, streamId: string, expectedSequence: number, events: NewEvent[]) =>
  withTransaction(
    db.prisma,
    (tx) => appendEvents(tx, { organizationId, streamType: 'tournament', streamId, expectedSequence, events }),
    { organizationId },
  );

const read = (organizationId: string, streamId: string, from?: number) =>
  withTransaction(db.prisma, (tx) => readStream(tx, streamId, from), { organizationId });

describe('the event store (US-045)', () => {
  it('[US-045:AC2] should append a batch atomically with the next sequences', async () => {
    const [org, stream] = [randomUUID(), randomUUID()];

    const first = await append(org, stream, 0, [event('TournamentCreated', 1), event('TournamentConfigured', 2)]);
    const second = await append(org, stream, 2, [event('RegistrationOpened', 3)]);

    expect(first.map((e) => [e.sequence, e.type])).toEqual([
      [1, 'TournamentCreated'],
      [2, 'TournamentConfigured'],
    ]);
    expect(second.map((e) => e.sequence)).toEqual([3]);
    expect(first[0]).toMatchObject({ organizationId: org, streamId: stream, streamType: 'tournament', metadata });
    expect(first[0]?.eventId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[US-045:AC2] should answer VERSION_CONFLICT to a stale or early expected sequence and write nothing', async () => {
    const [org, stream] = [randomUUID(), randomUUID()];
    await append(org, stream, 0, [event('TournamentCreated', 1), event('TournamentConfigured', 2)]);

    for (const expected of [0, 1, 3]) {
      await expect(
        append(org, stream, expected, [event('RegistrationOpened', 9)]),
        String(expected),
      ).rejects.toMatchObject({
        code: 'VERSION_CONFLICT',
      });
    }
    expect((await read(org, stream)).map((e) => e.sequence)).toEqual([1, 2]);
  });

  it('[US-045:AC2] should write none of a batch when one event is refused', async () => {
    const [org, stream] = [randomUUID(), randomUUID()];

    // A type outside the format of the table (events_type_format) makes the whole batch fail.
    await expect(append(org, stream, 0, [event('TournamentCreated', 1), event('not-an-event', 2)])).rejects.toThrow();
    expect(await read(org, stream)).toEqual([]);
  });

  it('[US-045:AC2][TC-030][INV-E-1] should let exactly one of N concurrent writers win a sequence', async () => {
    const [org, stream] = [randomUUID(), randomUUID()];
    await append(org, stream, 0, [event('TournamentCreated', 1)]);

    const writers = Array.from({ length: 8 }, (_, i) => append(org, stream, 1, [event('RegistrationOpened', i)]));
    const outcomes = await Promise.allSettled(writers);

    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    for (const o of outcomes.filter((x) => x.status === 'rejected')) {
      expect(o.reason).toMatchObject({ code: 'VERSION_CONFLICT' });
    }
    expect((await read(org, stream)).map((e) => e.sequence)).toEqual([1, 2]);
  });

  it('[US-045:AC4][INV-E-1] should read a whole stream or from a sequence, in order and without gaps', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 6 }), async (batches) => {
        const [org, stream] = [randomUUID(), randomUUID()];
        let last = 0;
        for (const size of batches) {
          await append(
            org,
            stream,
            last,
            Array.from({ length: size }, (_, i) => event('RoundScheduled', last + i)),
          );
          last += size;
        }

        const all = await read(org, stream);
        expect(all.map((e) => e.sequence)).toEqual(Array.from({ length: last }, (_, i) => i + 1));
        expect([...all].sort((a, b) => Number(a.globalPosition - b.globalPosition))).toEqual(all);
        const from = Math.ceil(last / 2);
        expect((await read(org, stream, from)).map((e) => e.sequence)).toEqual(
          all.slice(from - 1).map((e) => e.sequence),
        );
      }),
      { numRuns: 25 },
    );
  });

  it('[US-045:AC1][TC-032][INV-E-4] should refuse to update, delete or truncate events, to the application and to the owner', async () => {
    const [org, stream] = [randomUUID(), randomUUID()];
    await append(org, stream, 0, [event('TournamentCreated', 1)]);
    const inTenant = <T>(work: Parameters<typeof withTransaction<T>>[1]) =>
      withTransaction(db.prisma, work, { organizationId: org });

    await expect(
      inTenant((tx) => tx.event.updateMany({ where: { streamId: stream }, data: { type: 'Rewritten' } })),
    ).rejects.toThrow(/permission denied/);
    await expect(inTenant((tx) => tx.event.deleteMany({ where: { streamId: stream } }))).rejects.toThrow(
      /permission denied/,
    );
    // The owner has every privilege and, inside the tenant, sees the row (FORCE RLS); the trigger still refuses.
    const asOwner = <T>(work: Parameters<typeof withTransaction<T>>[1]) =>
      withTransaction(migrator, work, { organizationId: org });
    await expect(
      asOwner((tx) => tx.event.updateMany({ where: { streamId: stream }, data: { type: 'Rewritten' } })),
    ).rejects.toThrow(/append-only/);
    await expect(asOwner((tx) => tx.event.deleteMany({ where: { streamId: stream } }))).rejects.toThrow(/append-only/);
    await expect(migrator.$executeRaw`TRUNCATE events`).rejects.toThrow(/append-only/);
    expect((await read(org, stream)).map((e) => e.type)).toEqual(['TournamentCreated']);
  });

  it('[US-045:AC1][INV-T-1] should keep each tenant to its own streams', async () => {
    const [orgA, orgB, stream] = [randomUUID(), randomUUID(), randomUUID()];
    await append(orgA, stream, 0, [event('TournamentCreated', 1)]);

    expect(await read(orgB, stream)).toEqual([]);
    expect(await db.prisma.event.count()).toBe(0);
    // Another tenant cannot write into the stream either: its sequences are taken.
    await expect(append(orgB, stream, 0, [event('TournamentCreated', 1)])).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
    expect(await db.admin.event.count({ where: { streamId: stream } })).toBe(1);
  });
});
