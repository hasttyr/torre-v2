// Must fail: Node I/O in the domain (ARCHITECTURE.md §5).
import { readFileSync } from 'node:fs';

export const read = (path: string): string => readFileSync(path, 'utf8');
