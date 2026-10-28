import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
const envExample = readFileSync(join(root, '.env.example'), 'utf8');

/**
 * The blocks under a top-level key of docker-compose.yml, by name. The file is plain YAML with
 * two-space indentation, so a block runs until the next key at its level (no YAML parser needed).
 */
function blocksUnder(topLevelKey) {
  const lines = compose.split(/\r?\n/);
  const start = lines.indexOf(`${topLevelKey}:`);
  const blocks = new Map();
  let current;
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const key = line.match(/^ {2}([a-z0-9-]+):\s*$/);
    if (key) blocks.set((current = key[1]), []);
    else if (current) blocks.get(current).push(line);
  }
  return new Map([...blocks].map(([name, body]) => [name, body.join('\n')]));
}

const services = blocksUnder('services');
const namedVolumes = [...blocksUnder('volumes').keys()];
const SERVICES = ['postgres', 'redis', 'mailpit', 's3'];
const bucket = envExample.match(/^S3_BUCKET=(.+)$/m)?.[1];

describe('docker-compose.yml (US-003)', () => {
  it('[US-003:AC1] should define postgres, redis, mailpit and s3, each with a healthcheck', () => {
    for (const name of SERVICES) {
      expect(services.has(name), name).toBe(true);
      expect(services.get(name), name).toMatch(/\n {4}healthcheck:\n {6}test: /);
    }
  });

  it('[US-003:AC1] should keep the data of postgres, redis and s3 in named volumes declared at the top level', () => {
    for (const name of ['postgres', 'redis', 's3']) {
      const mounts = [...services.get(name).matchAll(/^ {6}- ([^:/.\s]+):\//gm)].map((m) => m[1]);
      expect(mounts.length, name).toBeGreaterThan(0);
      for (const volume of mounts) expect(namedVolumes, `${name} → ${volume}`).toContain(volume);
    }
  });

  it('[US-003:AC3] should create the bucket of .env.example once s3 is healthy, only when it is missing', () => {
    const job = services.get('s3-init');

    expect(bucket).toBeTruthy();
    expect(job).toMatch(/depends_on:\n {6}s3:\n {8}condition: service_healthy/);
    expect(job).toContain(`s3api head-bucket --bucket ${bucket} ||`);
    expect(job).toContain(`s3api create-bucket --bucket ${bucket}`);
    expect(job).toMatch(/restart: 'no'/);
  });
});
