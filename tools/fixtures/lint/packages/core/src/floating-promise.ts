// Must fail: a promise nobody awaits.
async function save(): Promise<void> {}

export function run(): void {
  save();
}
