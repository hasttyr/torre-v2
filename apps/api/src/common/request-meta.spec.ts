import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { describe, expect, it } from 'vitest';
import { exampleEnv } from '../__tests__/env.js';
import { AppConfig } from '../config/app-config.js';
import { clientAddressOf, hashAddress, RequestMeta } from './request-meta.js';

// The documented example secret (.env.example), not a value written here.
const SECRET = exampleEnv()['IP_HASH_SECRET'] ?? '';
const cls = new ClsService(new AsyncLocalStorage());
const meta = new RequestMeta(cls, new AppConfig(new ConfigService({ IP_HASH_SECRET: SECRET })));

describe('request metadata (DEC-096)', () => {
  it('[US-022:AC7] should hash the address with HMAC-SHA-256 under IP_HASH_SECRET, never keeping it readable', () => {
    const hash = hashAddress('203.0.113.7', SECRET);

    expect(SECRET.length).toBeGreaterThanOrEqual(32);
    expect(hash).toBe(createHmac('sha256', SECRET).update('203.0.113.7').digest('hex'));
    expect(hash).toBe(hashAddress('203.0.113.7', SECRET));
    expect(hash).not.toBe(hashAddress('203.0.113.8', SECRET));
    expect(hash).not.toBe(hashAddress('203.0.113.7', `${SECRET}-rotated`));
    expect(hash).not.toContain('203.0.113.7');
  });

  it('[US-022:AC7] should group IPv6 by /64 like the limits, so one network hashes alike', () => {
    expect(clientAddressOf({ ip: '2001:db8:1:2:aaaa::1' })).toBe(clientAddressOf({ ip: '2001:db8:1:2:bbbb::9' }));
    expect(clientAddressOf(undefined)).toBe('unknown');
  });

  it('[US-022:AC7] should give the hash and correlation id of the request, and nothing outside one', () => {
    const inRequest = cls.run(() => {
      cls.set(CLS_REQ, { ip: '203.0.113.7', correlationId: 'abc-123' });
      return { ipHash: meta.ipHash(), correlationId: meta.correlationId() };
    });

    expect(inRequest).toEqual({ ipHash: hashAddress('203.0.113.7', SECRET), correlationId: 'abc-123' });
    expect(meta.ipHash()).toBeNull();
    expect(meta.correlationId()).toBeNull();
  });
});
