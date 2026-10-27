import { describe, expect, it } from 'vitest';
import { isSameSiteRequest } from './same-site.guard.js';

const TRUSTED = new Set(['https://torre.example']);
const check = (headers: Record<string, string>) => isSameSiteRequest(headers, TRUSTED);

describe('same-site check of the refresh cookie routes (INV-A-4)', () => {
  it('[US-022:AC11] should follow Sec-Fetch-Site when the browser sends it', () => {
    expect(check({ 'sec-fetch-site': 'same-origin' })).toBe(true);
    expect(check({ 'sec-fetch-site': 'cross-site' })).toBe(false);
    // A trusted Origin does not rescue a request the browser itself calls cross-site.
    expect(check({ 'sec-fetch-site': 'cross-site', origin: 'https://torre.example' })).toBe(false);
  });

  it('[US-022:AC11][DEC-091] should ask same-site and none requests for a trusted origin', () => {
    expect(check({ 'sec-fetch-site': 'same-site', origin: 'https://torre.example' })).toBe(true);
    expect(check({ 'sec-fetch-site': 'same-site', origin: 'https://evil.torre.example' })).toBe(false);
    expect(check({ 'sec-fetch-site': 'none' })).toBe(false);
  });

  it('[US-022:AC11] should fall back to Origin, then Referer, without Sec-Fetch-Site', () => {
    expect(check({ origin: 'https://torre.example' })).toBe(true);
    expect(check({ origin: 'https://evil.example' })).toBe(false);
    expect(check({ referer: 'https://torre.example/torneos/1' })).toBe(true);
    expect(check({ referer: 'https://evil.example/' })).toBe(false);
    // Origin wins over Referer when both are present.
    expect(check({ origin: 'https://evil.example', referer: 'https://torre.example/' })).toBe(false);
  });

  it('[US-022:AC11][DEC-091] should reject a request that proves nothing (no headers, Origin: null)', () => {
    expect(check({})).toBe(false);
    expect(check({ origin: 'null' })).toBe(false);
    expect(check({ origin: 'null', referer: 'https://torre.example/' })).toBe(false);
    expect(check({ referer: 'not a url' })).toBe(false);
  });
});
