// Lint fixture (US-007:AC3): the database module is the one place that opens transactions.
interface Client {
  $transaction(work: () => Promise<void>): Promise<void>;
}

export async function open(client: Client): Promise<void> {
  await client.$transaction(() => Promise.resolve());
}
