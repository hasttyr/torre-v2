// Lint fixture (US-007:AC3, AC6): unsafe raw SQL and transactions opened outside the database module.
interface Client {
  $queryRawUnsafe(sql: string): Promise<unknown>;
  $executeRawUnsafe(sql: string): Promise<number>;
  $transaction(work: () => Promise<void>): Promise<void>;
}

export async function hostile(client: Client, name: string): Promise<void> {
  await client.$queryRawUnsafe(`SELECT * FROM institutions WHERE name = '${name}'`);
  await client.$executeRawUnsafe(`UPDATE institutions SET name = '${name}'`);
  await client.$transaction(() => Promise.resolve());
}
