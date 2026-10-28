import { Buffer } from 'node:buffer';
import { z } from 'zod';

/**
 * Environment of the API (ARCHITECTURE.md §16.2, US-005). Every variable arrives as text; the schema
 * turns it into typed values. Only the defaults documented in §16.2 exist: the rest is required.
 */

const UNIT_MS = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
const UNIT_BYTES = { b: 1, kb: 1_024, mb: 1_024 ** 2 } as const;
const DURATION = /^(\d+)(ms|s|m|h|d)$/;
const SIZE = /^(\d+)(b|kb|mb)$/;
const KEY_ID = /^[A-Za-z0-9_-]+$/;
const TWO_FACTOR_KEY_BYTES = 32; // AES-256-GCM (BR-AUTH-10)

const integer = (min: number, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .regex(/^\d+$/, 'must be a whole number')
    .transform(Number)
    .pipe(z.number().int().min(min, `must be at least ${min}`).max(max, `must be at most ${max}`));

const flag = z.enum(['true', 'false'], 'must be true or false').transform((value) => value === 'true');

/** `500ms`, `30s`, `15m`, `24h` or `7d`, in milliseconds. */
const duration = z
  .string()
  .regex(DURATION, 'must be a duration such as 500ms, 30s, 15m, 24h or 7d')
  .transform((value) => {
    const [, amount = '0', unit = 'ms'] = DURATION.exec(value) ?? [];
    return Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS];
  })
  .pipe(z.number().int().positive('must be longer than zero'));

/** `512kb` or `1mb`, in bytes (1 kb = 1 024 bytes, as in Express's body parser). */
const size = z
  .string()
  .regex(SIZE, 'must be a size such as 512kb or 1mb')
  .transform((value) => {
    const [, amount = '0', unit = 'b'] = SIZE.exec(value) ?? [];
    return Number(amount) * UNIT_BYTES[unit as keyof typeof UNIT_BYTES];
  })
  .pipe(z.number().int().positive('must be larger than zero'));

const urlWith = (protocols: readonly string[]) =>
  z.string().refine(
    (value) => {
      try {
        return protocols.includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    `must be a ${protocols.join(' or ')} URL`,
  );

/** An origin (scheme, host and port) as browsers send it in `Origin`, without path or trailing slash. */
const origin = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
  } catch {
    return false;
  }
}, 'must be an origin such as https://torre.example (scheme, host and optional port, no path)');

const secret = (minLength: number) => z.string().min(minLength, `must have at least ${minLength} characters`);

/** `id:base64,id:base64`: versioned 32-byte keys for the TOTP secrets (BR-AUTH-10). */
const twoFactorKeys = z.string().transform((value, ctx): ReadonlyMap<string, Buffer> => {
  const keys = new Map<string, Buffer>();
  for (const part of value.split(',')) {
    const [id = '', encoded = '', ...rest] = part.trim().split(':');
    const key = Buffer.from(encoded, 'base64');
    if (
      !KEY_ID.test(id) ||
      rest.length > 0 ||
      key.length !== TWO_FACTOR_KEY_BYTES ||
      key.toString('base64') !== encoded
    ) {
      ctx.addIssue({ code: 'custom', message: `each entry must be id:base64 of ${TWO_FACTOR_KEY_BYTES} bytes` });
      return z.NEVER;
    }
    if (keys.has(id)) {
      ctx.addIssue({ code: 'custom', message: `key id ${id} is repeated` });
      return z.NEVER;
    }
    keys.set(id, key);
  }
  return keys;
});

const list = (item: z.ZodType<string, string>) =>
  z
    .string()
    .transform((value) => value.split(',').map((entry) => entry.trim()))
    .pipe(z.array(item).min(1, 'must list at least one value'));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production'], 'must be development, test or production'),
  PORT: integer(1, 65_535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], 'must be a pino level'),
  WORKER: flag,

  DATABASE_URL: urlWith(['postgresql:', 'postgres:']),
  DATABASE_MIGRATION_URL: urlWith(['postgresql:', 'postgres:']).optional(),
  DATABASE_MAINTENANCE_URL: urlWith(['postgresql:', 'postgres:']).optional(),
  REDIS_URL: urlWith(['redis:', 'rediss:']),

  JWT_ACCESS_SECRET: secret(32),
  JWT_ACCESS_TTL: duration,
  REFRESH_TTL_HOURS: integer(1),
  COOKIE_SECURE: flag,
  ARGON2_MEMORY_KIB: integer(1),
  ARGON2_TIME_COST: integer(1),
  ARGON2_PARALLELISM: integer(1),
  TWO_FACTOR_ENCRYPTION_KEYS: twoFactorKeys,
  TWO_FACTOR_ACTIVE_KEY_ID: z.string().regex(KEY_ID, 'must be a key id'),
  PASSWORD_CONFIRMATION_TTL: duration,
  IP_HASH_SECRET: secret(32),

  AUTH_THROTTLE_LIMIT: integer(1),
  AUTH_THROTTLE_WINDOW: duration,
  AUTH_LOCKOUT_DURATION: duration,
  API_THROTTLE_LIMIT: integer(1),

  BODY_LIMIT: size,
  IMPORT_MAX_BYTES: integer(1),
  IMPORT_MAX_ROWS: integer(1),
  LOGO_MAX_BYTES: integer(1),
  WS_MAX_ROOMS: integer(1),
  WS_MAX_MESSAGE_BYTES: integer(1),
  WS_MAX_MESSAGES_PER_MINUTE: integer(1),

  IDEMPOTENCY_TTL_DAYS: integer(1),
  LIVE_COALESCE_MS: integer(0),
  METRICS_TOKEN: secret(16),
  E2E_TEST_HOOKS: flag,

  CORS_ORIGINS: list(origin),
  PUBLIC_WEB_URL: urlWith(['http:', 'https:']),

  S3_ENDPOINT: urlWith(['http:', 'https:']),
  S3_REGION: z.string().min(1, 'is required'),
  S3_BUCKET: z.string().min(1, 'is required'),
  S3_ACCESS_KEY: z.string().min(1, 'is required'),
  S3_SECRET_KEY: secret(8),

  MAIL_PROVIDER: z.enum(['smtp'], 'must be smtp'),
  MAIL_FROM: z.string().min(3, 'must be a sender such as "Torre <no-reply@example.org>"'),
  SMTP_URL: urlWith(['smtp:', 'smtps:']).optional(),

  SENTRY_DSN: urlWith(['https:', 'http:']).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: urlWith(['https:', 'http:']).optional(),
});

export type Env = z.output<typeof envSchema>;
export type EnvVariable = keyof Env;

/** The defaults ARCHITECTURE.md §16.2 documents, written as the text an operator would set. */
export const ENV_DEFAULTS: Readonly<Partial<Record<EnvVariable, string>>> = {
  PORT: '3000',
  LOG_LEVEL: 'info',
  WORKER: 'false',
  JWT_ACCESS_TTL: '5m',
  REFRESH_TTL_HOURS: '24',
  COOKIE_SECURE: 'true',
  ARGON2_MEMORY_KIB: '19456',
  ARGON2_TIME_COST: '2',
  ARGON2_PARALLELISM: '1',
  PASSWORD_CONFIRMATION_TTL: '15m',
  AUTH_THROTTLE_LIMIT: '10',
  AUTH_THROTTLE_WINDOW: '15m',
  AUTH_LOCKOUT_DURATION: '15m',
  API_THROTTLE_LIMIT: '300',
  BODY_LIMIT: '1mb',
  IMPORT_MAX_BYTES: '2097152',
  IMPORT_MAX_ROWS: '5000',
  LOGO_MAX_BYTES: '524288',
  WS_MAX_ROOMS: '10',
  WS_MAX_MESSAGE_BYTES: '4096',
  WS_MAX_MESSAGES_PER_MINUTE: '30',
  IDEMPOTENCY_TTL_DAYS: '7',
  LIVE_COALESCE_MS: '200',
  E2E_TEST_HOOKS: 'false',
};

/** Variables whose value must never reach a log, an error message or a serialised config (US-005:AC3). */
export const SECRET_VARIABLES: readonly EnvVariable[] = [
  'DATABASE_URL',
  'DATABASE_MIGRATION_URL',
  'DATABASE_MAINTENANCE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'TWO_FACTOR_ENCRYPTION_KEYS',
  'IP_HASH_SECRET',
  'METRICS_TOKEN',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'SMTP_URL',
  'SENTRY_DSN',
];

export interface EnvIssue {
  readonly variable: string;
  readonly message: string;
}

/** Lists every missing or invalid variable by name; values are never part of the message. */
export class InvalidEnvironmentError extends Error {
  constructor(readonly issues: readonly EnvIssue[]) {
    super(
      [
        `Invalid environment: ${issues.length} variable(s) missing or invalid (see .env.example and ARCHITECTURE.md §16.2)`,
        ...issues.map((i) => `  - ${i.variable}: ${i.message}`),
      ].join('\n'),
    );
    this.name = 'InvalidEnvironmentError';
  }
}

/**
 * Rules between variables, checked on the raw text so that one start-up reports every problem at once
 * (a Zod refinement would only run once every field is valid).
 */
function crossFieldIssues(input: Readonly<Record<string, string>>): EnvIssue[] {
  const issues: EnvIssue[] = [];
  if (input['E2E_TEST_HOOKS'] === 'true' && input['NODE_ENV'] === 'production') {
    issues.push({ variable: 'E2E_TEST_HOOKS', message: 'must be false in production' });
  }
  if (input['WORKER'] === 'true' && input['DATABASE_MAINTENANCE_URL'] === undefined) {
    issues.push({ variable: 'DATABASE_MAINTENANCE_URL', message: 'is required when WORKER is true (DEC-078)' });
  }
  if (input['MAIL_PROVIDER'] === 'smtp' && input['SMTP_URL'] === undefined) {
    issues.push({ variable: 'SMTP_URL', message: 'is required when MAIL_PROVIDER is smtp' });
  }
  const keyIds = (input['TWO_FACTOR_ENCRYPTION_KEYS'] ?? '').split(',').map((entry) => entry.trim().split(':')[0]);
  const active = input['TWO_FACTOR_ACTIVE_KEY_ID'];
  if (active !== undefined && !keyIds.includes(active)) {
    issues.push({
      variable: 'TWO_FACTOR_ACTIVE_KEY_ID',
      message: 'must be one of the ids in TWO_FACTOR_ENCRYPTION_KEYS',
    });
  }
  return issues;
}

/**
 * Validates the environment and returns it typed (US-005:AC1). Empty values count as unset, so
 * `SENTRY_DSN=` in a `.env` file means "not configured". Unknown variables are ignored.
 */
export function parseEnv(env: Readonly<Record<string, unknown>>): Env {
  const given = Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== '',
    ),
  );
  const input: Record<string, string> = { ...ENV_DEFAULTS, ...given };
  const result = envSchema.safeParse(input);
  const fieldIssues = result.success
    ? []
    : result.error.issues.map((issue): EnvIssue => {
        const variable = String(issue.path[0] ?? '(environment)');
        return { variable, message: input[variable] === undefined ? 'is required' : issue.message };
      });
  const issues = [...fieldIssues, ...crossFieldIssues(input)];
  if (result.success && issues.length === 0) return result.data;
  throw new InvalidEnvironmentError(issues);
}
