import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';
import { stdSerializers } from 'pino';
import type { DestinationStream } from 'pino';
import type { Options } from 'pino-http';
import { AppConfig } from '../config/app-config.js';
import { correlationIdOf } from './correlation-id.js';
import type { WithCorrelationId } from './correlation-id.js';

export const REDACTED = '[redacted]';

/**
 * Second line of defence (DEC-080, INV-PRIV-2): the serializers below never log headers or bodies, but
 * anything that does reach a log under these names is censored.
 */
const SENSITIVE_FIELDS = [
  'password',
  'currentPassword',
  'newPassword',
  'passwordConfirmation',
  'token',
  'accessToken',
  'refreshToken',
  'totp',
  'totpCode',
  'twoFactorCode',
  'recoveryCode',
  'recoveryCodes',
  'secret',
  'email',
];
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...SENSITIVE_FIELDS,
  ...SENSITIVE_FIELDS.map((field) => `*.${field}`),
];

/** `scheme://user:password@host` → `scheme://[redacted]@host`, for messages of third-party errors. */
export const scrubCredentials = (text: string): string =>
  text.replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, `$1${REDACTED}@`);

/** The path only: query strings carry tokens and emails (reset links, filters). */
const pathOf = (url: string | undefined): string => (url ?? '').split('?')[0] ?? '';

type Request = WithCorrelationId & { id?: unknown };

function pinoHttpOptions(config: AppConfig): Options<IncomingMessage, ServerResponse> {
  return {
    level: config.get('LOG_LEVEL'),
    // Same id as the response header: the middleware may have set it already (US-006:AC1).
    genReqId: (req: Request) => {
      req.correlationId ??= correlationIdOf(req);
      return req.correlationId;
    },
    // On every line written while the request runs, including the ones of Nest's Logger.
    customProps: (req: Request) => ({ correlationId: req.correlationId }),
    // Load balancers poll the health checks every few seconds: those requests are not logged.
    autoLogging: { ignore: (req: Request) => pathOf(req.url).startsWith('/health/') },
    redact: { paths: REDACT_PATHS, censor: REDACTED },
    serializers: {
      req: (req: Request) => ({ method: req.method, url: pathOf(req.url) }),
      res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
      err: (err: Error) => {
        const serialized = stdSerializers.err(err);
        return {
          ...serialized,
          message: scrubCredentials(serialized.message),
          stack: scrubCredentials(serialized.stack),
        };
      },
    },
  };
}

export interface LoggingOptions {
  /** Where the JSON lines go; tests capture them. Standard output by default. */
  readonly stream?: DestinationStream;
}

/** Structured JSON logs with the correlation id and only ids, never personal data (US-006:AC1). */
@Module({})
export class LoggingModule {
  static forRoot(options: LoggingOptions = {}): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRootAsync({
          inject: [AppConfig],
          useFactory: (config: AppConfig): Params => ({
            pinoHttp:
              options.stream === undefined ? pinoHttpOptions(config) : [pinoHttpOptions(config), options.stream],
          }),
        }),
      ],
    };
  }
}
