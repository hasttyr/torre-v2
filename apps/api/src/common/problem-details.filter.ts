import type { ServerResponse } from 'node:http';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { ERROR_CATALOG, PROBLEM_CONTENT_TYPE } from '@torre/contracts';
import type { ErrorCode, FieldError, ProblemDetails } from '@torre/contracts';
import { ApiError } from './api-error.js';
import { correlationIdOf } from './correlation-id.js';
import type { WithCorrelationId } from './correlation-id.js';

/** HTTP statuses raised by Nest or by Express middleware (body parser, throttler) and their code. */
const CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMITED',
};

interface Mapped {
  readonly code: ErrorCode;
  readonly detail?: string;
  readonly errors?: readonly FieldError[];
  /** Unexpected: logged with its stack, answered without details. */
  readonly unexpected?: true;
}

/** An `http-errors` error (Express body parser): `expose` says its message is safe for the client. */
const httpErrorStatus = (exception: unknown): number | undefined => {
  if (typeof exception !== 'object' || exception === null) return undefined;
  const { status, expose } = exception as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && expose === true ? status : undefined;
};

function mapException(exception: unknown): Mapped {
  if (exception instanceof ApiError) return { code: exception.code, ...exception.options };
  const status = exception instanceof HttpException ? exception.getStatus() : httpErrorStatus(exception);
  const code = status === undefined ? undefined : CODE_BY_STATUS[status];
  // Framework errors (unknown route, unreadable body, rate limit) keep only their code: their messages
  // describe internals.
  return code === undefined ? { code: 'INTERNAL_ERROR', unexpected: true } : { code };
}

/**
 * Every error leaves the API as `application/problem+json` with a stable code and the correlation id
 * (US-006:AC2, CONVENTIONS.md §6). Unexpected errors answer 500 without internal details; the details
 * go to the log only (ARCHITECTURE.md §6.4).
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<WithCorrelationId>();
    const res = http.getResponse<ServerResponse>();
    const correlationId = req.correlationId ?? correlationIdOf(req);
    const mapped = mapException(exception);
    const { status, title } = ERROR_CATALOG[mapped.code];
    if (mapped.unexpected) {
      this.logger.error({ correlationId, err: exception }, 'Unexpected error');
    }
    const body: ProblemDetails = {
      type: 'about:blank',
      title,
      status,
      code: mapped.code,
      ...(mapped.detail === undefined ? {} : { detail: mapped.detail }),
      correlationId,
      ...(mapped.errors === undefined ? {} : { errors: mapped.errors }),
    };
    if (res.headersSent) return;
    res.statusCode = status;
    res.setHeader('content-type', `${PROBLEM_CONTENT_TYPE}; charset=utf-8`);
    res.setHeader('x-correlation-id', correlationId);
    res.end(JSON.stringify(body));
  }
}
