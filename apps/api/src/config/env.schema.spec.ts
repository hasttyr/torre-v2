import { readFileSync } from 'node:fs';
import { parseEnv as parseDotenv } from 'node:util';
import { describe, expect, it } from 'vitest';
import { ENV_DEFAULTS, envSchema, InvalidEnvironmentError, parseEnv, SECRET_VARIABLES } from './env.schema.js';
import type { EnvIssue } from './env.schema.js';

const EXAMPLE_PATH = new URL('../../../../.env.example', import.meta.url);
const example = (): Record<string, string> => {
  const parsed = parseDotenv(readFileSync(EXAMPLE_PATH, 'utf8'));
  return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => e[1] !== undefined));
};

/** Variables the schema declares; the example also carries Docker ports and the web's VITE_* values. */
const SCHEMA_VARIABLES = Object.keys(envSchema.shape);
const NOT_FOR_THE_API = /^(VITE_|POSTGRES_PORT$|REDIS_PORT$|MAILPIT_|S3_PORT$|S3_CONSOLE_PORT$)/;
/** Optional on their own; `DATABASE_MAINTENANCE_URL` and `SMTP_URL` become required by another variable. */
const OPTIONAL = [
  'DATABASE_MIGRATION_URL',
  'DATABASE_MAINTENANCE_URL',
  'SMTP_URL',
  'SENTRY_DSN',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
];

const issuesOf = (env: Record<string, string>): EnvIssue[] => {
  try {
    parseEnv(env);
  } catch (error) {
    if (error instanceof InvalidEnvironmentError) return [...error.issues];
    throw error;
  }
  return [];
};
const messageOf = (env: Record<string, string>): string => {
  try {
    parseEnv(env);
  } catch (error) {
    if (error instanceof Error) return error.message;
  }
  return '';
};

describe('parseEnv', () => {
  it('[US-005:AC1] should accept the example environment and type every value', () => {
    const env = parseEnv(example());

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      WORKER: false,
      COOKIE_SECURE: false,
      JWT_ACCESS_TTL: 5 * 60_000,
      AUTH_THROTTLE_WINDOW: 15 * 60_000,
      BODY_LIMIT: 1_048_576,
      IMPORT_MAX_BYTES: 2_097_152,
      CORS_ORIGINS: ['http://localhost:5173'],
      E2E_TEST_HOOKS: false,
    });
    expect(env.TWO_FACTOR_ENCRYPTION_KEYS.get('dev1')).toHaveLength(32);
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it('[US-005:AC1] should apply only the defaults documented in ARCHITECTURE.md §16.2', () => {
    const given = example();
    for (const variable of Object.keys(ENV_DEFAULTS)) delete given[variable];
    const env = parseEnv(given);

    expect(env).toMatchObject({
      PORT: 3000,
      LOG_LEVEL: 'info',
      COOKIE_SECURE: true,
      JWT_ACCESS_TTL: 300_000,
      REFRESH_TTL_HOURS: 24,
      ARGON2_MEMORY_KIB: 19_456,
      PASSWORD_CONFIRMATION_TTL: 900_000,
      AUTH_THROTTLE_LIMIT: 10,
      AUTH_LOCKOUT_DURATION: 900_000,
      API_THROTTLE_LIMIT: 300,
      BODY_LIMIT: 1_048_576,
      IMPORT_MAX_ROWS: 5_000,
      LOGO_MAX_BYTES: 524_288,
      WS_MAX_ROOMS: 10,
      WS_MAX_MESSAGE_BYTES: 4_096,
      WS_MAX_MESSAGES_PER_MINUTE: 30,
      IDEMPOTENCY_TTL_DAYS: 7,
      LIVE_COALESCE_MS: 200,
    });
  });

  it('[US-005:AC1] should list every missing variable at once, by name', () => {
    const required = SCHEMA_VARIABLES.filter((v) => !(v in ENV_DEFAULTS) && !OPTIONAL.includes(v));
    const issues = issuesOf({});

    expect(issues.filter((i) => i.message === 'is required').map((i) => i.variable)).toEqual(
      expect.arrayContaining(required),
    );
    expect(issues.filter((i) => i.message === 'is required')).toHaveLength(required.length);
    expect(messageOf({})).toContain(`${required.length} variable(s) missing or invalid`);
  });

  it('[US-005:AC1] should treat an empty value as unset', () => {
    expect(issuesOf({ ...example(), JWT_ACCESS_SECRET: '  ' })).toEqual([
      { variable: 'JWT_ACCESS_SECRET', message: 'is required' },
    ]);
  });

  it('[US-005:AC1] should report every value of the wrong type in one error', () => {
    const issues = issuesOf({
      ...example(),
      NODE_ENV: 'staging',
      PORT: '70000',
      LOG_LEVEL: 'verbose',
      WORKER: 'yes',
      IMPORT_MAX_ROWS: '5k',
      JWT_ACCESS_TTL: '5 minutes',
      AUTH_THROTTLE_WINDOW: '0m',
      BODY_LIMIT: '1gb',
      CORS_ORIGINS: 'http://localhost:5173/app',
      DATABASE_URL: 'mysql://localhost/torre',
      REDIS_URL: 'not a url',
      TWO_FACTOR_ENCRYPTION_KEYS: 'dev1:c2hvcnQ=',
      MAIL_PROVIDER: 'carrier-pigeon',
    });

    expect(Object.fromEntries(issues.map((i) => [i.variable, i.message]))).toEqual({
      NODE_ENV: 'must be development, test or production',
      PORT: 'must be at most 65535',
      LOG_LEVEL: 'must be a pino level',
      WORKER: 'must be true or false',
      IMPORT_MAX_ROWS: 'must be a whole number',
      JWT_ACCESS_TTL: 'must be a duration such as 500ms, 30s, 15m, 24h or 7d',
      AUTH_THROTTLE_WINDOW: 'must be longer than zero',
      BODY_LIMIT: 'must be a size such as 512kb or 1mb',
      CORS_ORIGINS: 'must be an origin such as https://torre.example (scheme, host and optional port, no path)',
      DATABASE_URL: 'must be a postgresql: or postgres: URL',
      REDIS_URL: 'must be a redis: or rediss: URL',
      TWO_FACTOR_ENCRYPTION_KEYS: 'each entry must be id:base64 of 32 bytes',
      MAIL_PROVIDER: 'must be smtp',
    });
  });

  it('[US-005:AC1][BR-AUTH-10] should check the rules between variables in the same run', () => {
    const issues = issuesOf({
      ...example(),
      PORT: 'abc',
      NODE_ENV: 'production',
      E2E_TEST_HOOKS: 'true',
      WORKER: 'true',
      DATABASE_MAINTENANCE_URL: '',
      TWO_FACTOR_ACTIVE_KEY_ID: 'dev2',
      SMTP_URL: '',
    });

    expect(issues.map((i) => i.variable)).toEqual([
      'PORT',
      'E2E_TEST_HOOKS',
      'DATABASE_MAINTENANCE_URL',
      'SMTP_URL',
      'TWO_FACTOR_ACTIVE_KEY_ID',
    ]);
    expect(
      issuesOf({ ...example(), WORKER: 'true', DATABASE_MAINTENANCE_URL: 'postgresql://m@localhost/torre' }),
    ).toEqual([]);
  });

  it('[US-005:AC1][BR-AUTH-10] should accept several two-factor keys and refuse a repeated id', () => {
    const key = example()['TWO_FACTOR_ENCRYPTION_KEYS'] ?? '';
    const second = `dev2:${Buffer.alloc(32, 7).toString('base64')}`;

    expect(
      parseEnv({ ...example(), TWO_FACTOR_ENCRYPTION_KEYS: `${key},${second}` }).TWO_FACTOR_ENCRYPTION_KEYS.size,
    ).toBe(2);
    expect(issuesOf({ ...example(), TWO_FACTOR_ENCRYPTION_KEYS: `${key},${key}` })).toEqual([
      { variable: 'TWO_FACTOR_ENCRYPTION_KEYS', message: 'key id dev1 is repeated' },
    ]);
  });

  it('[US-005:AC3] should never put a value in the error message', () => {
    const values = {
      JWT_ACCESS_SECRET: 'tooShort-S3CR3T',
      DATABASE_URL: 'mysql://admin:TOPSECRET-PASSWORD@db.internal/torre',
      S3_SECRET_KEY: 'k3y',
      METRICS_TOKEN: 'tiny-tok3n',
      TWO_FACTOR_ENCRYPTION_KEYS: 'dev1:TOPSECRETKEYMATERIAL',
    };
    const message = messageOf({ ...example(), ...values });

    expect(message).toContain('JWT_ACCESS_SECRET');
    for (const value of Object.values(values)) expect(message).not.toContain(value);
    expect(message).not.toContain('TOPSECRET');
  });
});

describe('.env.example', () => {
  it('[US-005:AC4] should declare exactly the variables of the schema, plus Docker ports and VITE_*', () => {
    const keys = Object.keys(example());

    expect(SCHEMA_VARIABLES.filter((v) => !keys.includes(v))).toEqual([]);
    expect(keys.filter((k) => !NOT_FOR_THE_API.test(k) && !SCHEMA_VARIABLES.includes(k))).toEqual([]);
  });

  it('[US-005:AC3] should mark every credential of the schema as secret', () => {
    const secrets: readonly string[] = SECRET_VARIABLES;
    const credentialLike = SCHEMA_VARIABLES.filter((v) => /SECRET|TOKEN|KEYS?$|_URL$|DSN/.test(v));

    expect(secrets.every((v) => SCHEMA_VARIABLES.includes(v))).toBe(true);
    // The public web address is a link printed in emails, not a credential.
    expect(credentialLike.filter((v) => !secrets.includes(v))).toEqual(['PUBLIC_WEB_URL']);
  });
});
