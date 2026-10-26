// Dependency-free connectivity probes for `pnpm infra:check` (US-003).
import { connect } from 'node:net';

const DEFAULT_TIMEOUT_MS = 3000;

/** Opens a TCP socket, writes `request`, resolves with the first bytes received (or rejects). */
function exchange({ host, port, request, timeoutMs = DEFAULT_TIMEOUT_MS, done }) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let received = Buffer.alloc(0);
    const finish = (fn, value) => {
      socket.destroy();
      fn(value);
    };
    socket.setTimeout(timeoutMs, () => finish(reject, new Error(`timeout after ${timeoutMs} ms`)));
    socket.on('error', (e) => finish(reject, e));
    socket.on('connect', () => socket.write(request));
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      if (done(received)) finish(resolve, received);
    });
    socket.on('end', () => finish(resolve, received));
  });
}

/**
 * PostgreSQL: sends an SSLRequest (length 8, code 80877103). Any PostgreSQL server answers with a
 * single byte, 'S' or 'N', before authentication, which proves the protocol without credentials.
 */
export async function probePostgres({ host, port, timeoutMs }) {
  const request = Buffer.alloc(8);
  request.writeInt32BE(8, 0);
  request.writeInt32BE(80877103, 4);
  const reply = await exchange({ host, port, request, timeoutMs, done: (b) => b.length >= 1 });
  const first = String.fromCharCode(reply[0] ?? 0);
  if (first !== 'S' && first !== 'N') throw new Error(`not a PostgreSQL server (got ${JSON.stringify(first)})`);
  return { ok: true, detail: 'responde al protocolo de PostgreSQL' };
}

/** Encodes a command as a RESP array of bulk strings. */
export function encodeResp(args) {
  return Buffer.from(`*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join(''));
}

/**
 * Redis / Valkey: PING must answer +PONG, and maxmemory-policy must be noeviction, which BullMQ
 * requires (SRC-22).
 */
export async function probeRedis({ host, port, timeoutMs }) {
  const pong = (
    await exchange({ host, port, request: encodeResp(['PING']), timeoutMs, done: (b) => b.includes('\r\n') })
  ).toString();
  if (!pong.startsWith('+PONG')) throw new Error(`PING answered ${JSON.stringify(pong.trim())}`);
  const config = (
    await exchange({
      host,
      port,
      request: encodeResp(['CONFIG', 'GET', 'maxmemory-policy']),
      timeoutMs,
      done: (b) => (b.toString().match(/\r\n/g) ?? []).length >= 5,
    })
  ).toString();
  const policy = config.split('\r\n')[4];
  if (policy !== 'noeviction')
    throw new Error(`maxmemory-policy is ${JSON.stringify(policy)}, BullMQ needs noeviction`);
  return { ok: true, detail: 'PONG; maxmemory-policy=noeviction' };
}

/** HTTP: GET must answer 2xx. */
export async function probeHttp({ url, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`GET ${url} answered ${res.status}`);
  return { ok: true, detail: `GET ${new URL(url).pathname} → ${res.status}` };
}
