import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isWorkerProcess } from './process-role.js';

describe('process role (US-117:AC2)', () => {
  const file = (content: string) => {
    const path = join(mkdtempSync(join(tmpdir(), 'torre-env-')), '.env');
    writeFileSync(path, content);
    return path;
  };

  it('[US-117:AC2] should run the worker with WORKER=true from the environment or the first .env that sets it', () => {
    const worker = file('WORKER=true\n');
    const api = file('WORKER=false\n');

    expect(isWorkerProcess({ WORKER: 'true' }, [])).toBe(true);
    expect(isWorkerProcess({}, [worker, api])).toBe(true);
    expect(isWorkerProcess({}, [api, worker])).toBe(false);
    expect(isWorkerProcess({ WORKER: 'false' }, [worker])).toBe(false);
    expect(isWorkerProcess({}, [])).toBe(false);
  });
});
