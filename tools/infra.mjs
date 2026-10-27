#!/usr/bin/env node
// Local infrastructure (US-003). Usage: node tools/infra.mjs <up|down|check> [--only postgres,redis,mailpit,s3]
//   Docker available → docker compose (postgres, redis, mailpit, s3 + bucket job).
//   No Docker        → "native" mode: PostgreSQL from the binaries already installed on this machine
//                      (PG_BIN or C:\Program Files\PostgreSQL\<version>\bin), in .tools/infra/postgres;
//                      on Windows with WSL, Valkey (Redis-compatible) from Ubuntu's signed archive,
//                      unpacked without root in .tools/infra/valkey. Mailpit and S3 need Docker.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { probeHttp, probePostgres, probeRedis } from './lib/probes.mjs';

const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(top);
for (const file of ['.env', '.env.example']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const env = (name, fallback) => process.env[name] ?? fallback;
const SERVICES = ['postgres', 'redis', 'mailpit', 's3'];
const PORTS = {
  postgres: Number(env('POSTGRES_PORT', '5432')),
  redis: Number(env('REDIS_PORT', '6379')),
  mailpitSmtp: Number(env('MAILPIT_SMTP_PORT', '1025')),
  mailpitUi: Number(env('MAILPIT_UI_PORT', '8025')),
  s3: Number(env('S3_PORT', '9000')),
};
const SUPERUSER_PASSWORD = 'torre_dev_postgres';
const NATIVE_DIR = join(top, '.tools', 'infra');
const NATIVE_PGDATA = join(NATIVE_DIR, 'postgres');
const INIT_DIR = join('infra', 'postgres', 'init');
const VALKEY_DIR = join(NATIVE_DIR, 'valkey');
// What `valkey-server` needs beyond the base system of Ubuntu 24.04 (apt-cache depends, 2026-10-27).
const VALKEY_PACKAGES = ['valkey-server', 'valkey-tools', 'libjemalloc2', 'liblzf1'];

const [command = 'check'] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !a.includes(','));
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > -1 ? process.argv[onlyArg + 1].split(',') : SERVICES;

const hasDocker = () => spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status === 0;

function pgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const base = 'C:\\Program Files\\PostgreSQL';
  if (process.platform === 'win32' && existsSync(base)) {
    const versions = readdirSync(base)
      .filter((v) => /^\d+$/.test(v))
      .sort((a, b) => Number(b) - Number(a));
    for (const v of versions) if (existsSync(join(base, v, 'bin', 'pg_ctl.exe'))) return join(base, v, 'bin');
  }
  return null;
}
const exe = (bin, name) => join(bin, process.platform === 'win32' ? `${name}.exe` : name);

function psql(sql, { database = 'torre' } = {}) {
  if (hasDocker()) {
    return execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', database, '-tAc', sql],
      {
        encoding: 'utf8',
      },
    );
  }
  const bin = pgBin();
  if (!bin) throw new Error('psql no encontrado: instala Docker o define PG_BIN');
  return execFileSync(
    exe(bin, 'psql'),
    ['-h', '127.0.0.1', '-p', String(PORTS.postgres), '-U', 'postgres', '-d', database, '-tAc', sql],
    {
      encoding: 'utf8',
      env: { ...process.env, PGPASSWORD: SUPERUSER_PASSWORD },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
    },
  );
}

const hasWsl = () =>
  process.platform === 'win32' && spawnSync('wsl', ['-e', 'true'], { stdio: 'ignore', timeout: 60_000 }).status === 0;
/** Runs `script` with `sh` in the default WSL distribution; `args` arrive as $1, $2… (no shell quoting). */
const wsl = (script, args = []) =>
  execFileSync('wsl', ['-e', 'sh', '-c', script, 'sh', ...args], {
    encoding: 'utf8',
    timeout: 180_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
const VALKEY_ENV = 'export LD_LIBRARY_PATH="$1/root/usr/lib/x86_64-linux-gnu"';

/**
 * Valkey on Windows without Docker (decided by the project owner on 2026-10-27): the packages come
 * from the signed archive of the WSL distribution (`apt-get download` checks them against its index)
 * and are unpacked with `dpkg -x`, so nothing is installed and no root is needed. Same engine as
 * docker-compose.yml and the deployment, with noeviction and AOF as BullMQ requires (SRC-22).
 */
async function nativeValkeyUp() {
  if (!hasWsl()) return console.log('infra (nativo): sin Docker ni WSL; Redis no se levantó (docs/PROGRESS.md).');
  mkdirSync(join(VALKEY_DIR, 'debs'), { recursive: true });
  mkdirSync(join(VALKEY_DIR, 'data'), { recursive: true });
  const dir = wsl('wslpath -a "$1"', [resolve(VALKEY_DIR)]).trim();
  if (!existsSync(join(VALKEY_DIR, 'root', 'usr', 'bin', 'valkey-server'))) {
    wsl(
      'd="$1"; shift; cd "$d/debs" && apt-get download "$@" && for p in "$d"/debs/*.deb; do dpkg -x "$p" "$d/root"; done',
      [dir, ...VALKEY_PACKAGES],
    );
  }
  const answers = () =>
    probeRedis({ host: '127.0.0.1', port: PORTS.redis, timeoutMs: 1000 }).then(
      () => true,
      () => false,
    );
  if (!(await answers())) {
    wsl(
      `${VALKEY_ENV}; "$1/root/usr/bin/valkey-server" --bind 127.0.0.1 --port "$2" --maxmemory-policy noeviction --appendonly yes --dir "$1/data" --daemonize yes --logfile "$1/valkey.log" --pidfile "$1/valkey.pid"`,
      [dir, String(PORTS.redis)],
    );
  }
  let ready = await answers();
  for (let i = 0; i < 40 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 250));
    ready = await answers();
  }
  if (!ready)
    throw new Error(`Valkey no quedó listo en 127.0.0.1:${PORTS.redis}; revisa .tools/infra/valkey/valkey.log`);
  const version = /v=(\S+)/.exec(wsl(`${VALKEY_ENV}; "$1/root/usr/bin/valkey-server" --version`, [dir]))?.[1] ?? '?';
  console.log(`infra (nativo): Valkey ${version} en 127.0.0.1:${PORTS.redis} (WSL, datos en .tools/infra/valkey)`);
}

function nativeValkeyDown() {
  if (!existsSync(join(VALKEY_DIR, 'root', 'usr', 'bin', 'valkey-cli')) || !hasWsl()) return;
  const dir = wsl('wslpath -a "$1"', [resolve(VALKEY_DIR)]).trim();
  spawnSync(
    'wsl',
    ['-e', 'sh', '-c', `${VALKEY_ENV}; "$1/root/usr/bin/valkey-cli" -p "$2" shutdown`, 'sh', dir, String(PORTS.redis)],
    {
      stdio: 'ignore',
      timeout: 30_000,
    },
  );
  console.log('infra (nativo): Valkey detenido');
}

async function nativeUp() {
  const bin = pgBin();
  if (!bin) throw new Error('sin Docker ni binarios de PostgreSQL: instala Docker Desktop o define PG_BIN');
  mkdirSync(NATIVE_DIR, { recursive: true });
  if (!existsSync(join(NATIVE_PGDATA, 'PG_VERSION'))) {
    const pwfile = join(NATIVE_DIR, 'pwfile.tmp');
    writeFileSync(pwfile, SUPERUSER_PASSWORD);
    try {
      execFileSync(
        exe(bin, 'initdb'),
        [
          '-D',
          NATIVE_PGDATA,
          '-U',
          'postgres',
          '-A',
          'scram-sha-256',
          `--pwfile=${pwfile}`,
          '-E',
          'UTF8',
          '--locale=C',
        ],
        {
          stdio: 'ignore',
        },
      );
    } finally {
      rmSync(pwfile, { force: true });
    }
  }
  const answers = (timeoutMs) =>
    probePostgres({ host: '127.0.0.1', port: PORTS.postgres, timeoutMs }).then(
      () => true,
      () => false,
    );
  const running = await answers(1000);
  if (!running) {
    // Detached and without inherited stdio: pg_ctl's server child must not hold this terminal.
    const child = spawn(
      exe(bin, 'pg_ctl'),
      [
        '-D',
        NATIVE_PGDATA,
        '-l',
        join(NATIVE_DIR, 'postgres.log'),
        '-o',
        `-p ${PORTS.postgres} -c listen_addresses=127.0.0.1`,
        'start',
      ],
      { detached: true, stdio: 'ignore', windowsHide: true },
    );
    child.unref();
  }
  // The protocol answers while the server is still starting up; pg_isready succeeds only when it
  // accepts queries (for example after crash recovery).
  const isReady = () =>
    spawnSync(exe(bin, 'pg_isready'), ['-h', '127.0.0.1', '-p', String(PORTS.postgres), '-q'], { stdio: 'ignore' })
      .status === 0;
  let ready = isReady();
  for (let i = 0; i < 120 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 250));
    ready = isReady();
  }
  if (!ready)
    throw new Error(`PostgreSQL no quedó listo en 127.0.0.1:${PORTS.postgres}; revisa .tools/infra/postgres.log`);
  if (psql("select 1 from pg_database where datname = 'torre'", { database: 'postgres' }).trim() !== '1') {
    psql('create database torre', { database: 'postgres' });
    // Same order as the Docker entrypoint: every init script, sorted by name.
    for (const script of readdirSync(INIT_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      execFileSync(
        exe(bin, 'psql'),
        [
          '-h',
          '127.0.0.1',
          '-p',
          String(PORTS.postgres),
          '-U',
          'postgres',
          '-d',
          'torre',
          '-v',
          'ON_ERROR_STOP=1',
          '-f',
          join(INIT_DIR, script),
        ],
        {
          env: { ...process.env, PGPASSWORD: SUPERUSER_PASSWORD },
          stdio: ['ignore', 'ignore', 'inherit'],
          timeout: 15_000,
        },
      );
    }
  }
  console.log(`infra (nativo): PostgreSQL en 127.0.0.1:${PORTS.postgres} (datos en .tools/infra/postgres)`);
  if (only.includes('redis')) await nativeValkeyUp();
  console.log('infra (nativo): Mailpit y S3 necesitan Docker; no se levantaron (docs/PROGRESS.md).');
}

function nativeDown() {
  nativeValkeyDown();
  const bin = pgBin();
  if (!bin || !existsSync(join(NATIVE_PGDATA, 'PG_VERSION'))) return console.log('infra (nativo): nada que detener');
  spawnSync(exe(bin, 'pg_ctl'), ['-D', NATIVE_PGDATA, '-m', 'fast', 'stop'], { stdio: 'ignore' });
  console.log('infra (nativo): PostgreSQL detenido');
}

const CHECKS = {
  async postgres() {
    const tcp = await probePostgres({ host: '127.0.0.1', port: PORTS.postgres });
    const extensions = psql(
      "select string_agg(extname, ',' order by extname) from pg_extension where extname in ('pg_trgm','unaccent')",
    ).trim();
    if (extensions !== 'pg_trgm,unaccent') throw new Error(`faltan extensiones (hay: ${extensions || 'ninguna'})`);
    const roles = psql(
      "select string_agg(rolname || ':' || rolbypassrls::text || ':' || rolsuper::text, ',' order by rolname) from pg_roles where rolname in ('torre_app','torre_migrator')",
    ).trim();
    if (roles !== 'torre_app:false:false,torre_migrator:false:false')
      throw new Error(`roles inesperados: ${roles || 'ninguno'}`);
    return `${tcp.detail}; pg_trgm y unaccent; torre_app y torre_migrator sin BYPASSRLS`;
  },
  async redis() {
    return (await probeRedis({ host: '127.0.0.1', port: PORTS.redis })).detail;
  },
  async mailpit() {
    return (await probeHttp({ url: `http://127.0.0.1:${PORTS.mailpitUi}/livez` })).detail;
  },
  async s3() {
    const health = await probeHttp({ url: `http://127.0.0.1:${PORTS.s3}/health` });
    if (hasDocker()) {
      execFileSync(
        'docker',
        [
          'compose',
          'run',
          '--rm',
          '--no-deps',
          's3-init',
          `aws --endpoint-url http://s3:9000 s3api head-bucket --bucket ${env('S3_BUCKET', 'torre-dev')}`,
        ],
        { stdio: 'ignore' },
      );
      return `${health.detail}; bucket ${env('S3_BUCKET', 'torre-dev')} existe`;
    }
    return health.detail;
  },
};

async function check() {
  let failed = 0;
  for (const name of only) {
    try {
      console.log(`  ✔ ${name}: ${await CHECKS[name]()}`);
    } catch (e) {
      failed++;
      console.log(`  ✖ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (failed > 0) {
    console.error(`infra:check: ${failed} servicio(s) no disponibles`);
    process.exit(1);
  }
  console.log('infra:check: todos los servicios sanos');
}

try {
  if (command === 'up') {
    if (hasDocker()) execFileSync('docker', ['compose', 'up', '-d', '--wait'], { stdio: 'inherit' });
    else await nativeUp();
  } else if (command === 'down') {
    if (hasDocker()) execFileSync('docker', ['compose', 'down'], { stdio: 'inherit' });
    else nativeDown();
  } else if (command === 'check') {
    console.log(`infra:check (${hasDocker() ? 'docker' : 'nativo'}): ${only.join(', ')}`);
    await check();
  } else {
    console.error(`comando desconocido: ${command} (usa up, down o check)`);
    process.exit(2);
  }
} catch (e) {
  console.error('infra: ' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
