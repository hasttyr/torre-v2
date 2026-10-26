import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { encodeResp, probeHttp, probePostgres, probeRedis } from './lib/probes.mjs';

const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((r) => s.close(r))));
});

/** Starts a TCP server on a random port whose handler answers each received chunk. */
async function fakeTcp(answer) {
  const server = createServer((socket) => socket.on('data', (chunk) => socket.write(answer(chunk))));
  servers.push(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server.address().port;
}

async function fakeHttp(status) {
  const server = createHttpServer((_req, res) => res.writeHead(status).end());
  servers.push(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server.address().port;
}

const redisAnswering = (policy) => (chunk) => {
  const text = chunk.toString();
  if (text.includes('PING')) return '+PONG\r\n';
  return `*2\r\n$16\r\nmaxmemory-policy\r\n$${policy.length}\r\n${policy}\r\n`;
};

describe('infra:check probes (US-003)', () => {
  it('[US-003:AC4][TC-080] should recognise a PostgreSQL server by its SSLRequest answer', async () => {
    const port = await fakeTcp((chunk) => (chunk.readInt32BE(4) === 80877103 ? 'N' : 'X'));

    await expect(probePostgres({ host: '127.0.0.1', port })).resolves.toMatchObject({ ok: true });
  });

  it('[US-003:AC4] should reject a server that does not speak the PostgreSQL protocol', async () => {
    const port = await fakeTcp(() => 'HTTP/1.1 400 Bad Request\r\n\r\n');

    await expect(probePostgres({ host: '127.0.0.1', port })).rejects.toThrow('not a PostgreSQL server');
  });

  it('[US-003:AC4][TC-080] should accept Redis/Valkey with PONG and the noeviction policy', async () => {
    const port = await fakeTcp(redisAnswering('noeviction'));

    await expect(probeRedis({ host: '127.0.0.1', port })).resolves.toMatchObject({ ok: true });
  });

  it('[US-003:AC4] should reject Redis/Valkey with an eviction policy BullMQ cannot use', async () => {
    const port = await fakeTcp(redisAnswering('allkeys-lru'));

    await expect(probeRedis({ host: '127.0.0.1', port })).rejects.toThrow('noeviction');
  });

  it('[US-003:AC4] should report a closed port as unavailable', async () => {
    const port = await fakeTcp(() => '');
    await new Promise((r) => servers.pop().close(r));

    await expect(probeRedis({ host: '127.0.0.1', port })).rejects.toThrow();
  });

  it('[US-003:AC4] should accept 2xx and reject other HTTP statuses', async () => {
    const healthy = await fakeHttp(200);
    const broken = await fakeHttp(503);

    await expect(probeHttp({ url: `http://127.0.0.1:${healthy}/livez` })).resolves.toMatchObject({ ok: true });
    await expect(probeHttp({ url: `http://127.0.0.1:${broken}/livez` })).rejects.toThrow('503');
  });

  it('[US-003:AC4] should encode commands as RESP arrays', () => {
    expect(encodeResp(['CONFIG', 'GET', 'maxmemory-policy']).toString()).toBe(
      '*3\r\n$6\r\nCONFIG\r\n$3\r\nGET\r\n$16\r\nmaxmemory-policy\r\n',
    );
  });
});
