#!/usr/bin/env node
// Local infrastructure (US-003). Usage: node tools/infra.mjs <up|down|check> [--only postgres,redis,mailpit,s3]
//   Docker available → docker compose (postgres, redis, mailpit, s3 + bucket job).
//   No Docker        → "native" mode: PostgreSQL from the binaries already installed on this machine
//                      (PG_BIN or C:\Program Files\PostgreSQL\<version>\bin), in .tools/infra/postgres.
//                      Redis, Mailpit and S3 need Docker (docs/PROGRESS.md).
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
        'infra/postgres/init/01-roles-and-extensions.sql',
      ],
      {
        env: { ...process.env, PGPASSWORD: SUPERUSER_PASSWORD },
        stdio: ['ignore', 'ignore', 'inherit'],
        timeout: 15_000,
      },
    );
  }
  console.log(`infra (nativo): PostgreSQL en 127.0.0.1:${PORTS.postgres} (datos en .tools/infra/postgres)`);
  console.log('infra (nativo): Redis, Mailpit y S3 necesitan Docker; no se levantaron (docs/PROGRESS.md).');
}

function nativeDown() {
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
