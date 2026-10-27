import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { normalizeIp } from '@nestjs/throttler';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { AppConfig } from '../config/app-config.js';
import type { WithCorrelationId } from './correlation-id.js';

type Request = WithCorrelationId & { ip?: string };

/**
 * The client address as Express sees it (`trust proxy` decides it behind a proxy, US-105), with IPv6
 * grouped by /64 like the limits (BR-AUTH-07).
 */
export const clientAddressOf = (req: { ip?: string } | undefined): string => normalizeIp(req?.ip ?? 'unknown');

/**
 * HMAC-SHA-256 of an address with IP_HASH_SECRET (DEC-096): two hashes compare, but without the key
 * nobody can enumerate the 2³² IPv4 addresses back to the one that was hashed.
 */
export const hashAddress = (address: string, secret: string): string =>
  createHmac('sha256', secret).update(address).digest('hex');

/** Where the current request comes from, as sessions and the audit trail keep it (DEC-096). */
@Injectable()
export class RequestMeta {
  constructor(
    @Inject(ClsService) private readonly cls: ClsService,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  /** The hashed client address, or null outside a request (a job of the worker). */
  ipHash(): string | null {
    const req = this.request();
    return req ? hashAddress(clientAddressOf(req), this.config.get('IP_HASH_SECRET')) : null;
  }

  /** The id the correlation middleware gave the request (US-006), or null outside a request. */
  correlationId(): string | null {
    return this.request()?.correlationId ?? null;
  }

  private request(): Request | undefined {
    return this.cls.isActive() ? this.cls.get<Request | undefined>(CLS_REQ) : undefined;
  }
}
