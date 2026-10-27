import { describe, expect, it } from 'vitest';
import { commonPasswords, passwordProblems } from './password-policy.js';
import { hashRefreshToken, newRefreshToken, refreshCookie } from './tokens.js';

const none = new Set<string>();

describe('password policy (BR-AUTH-09)', () => {
  it('[US-022:AC1] should accept 15 to 64 characters of any kind, without composition rules', () => {
    expect(passwordProblems('a'.repeat(15), { list: none })).toEqual([]);
    expect(passwordProblems('frase larga con espacios y tildes ñ', { list: none })).toEqual([]);
    expect(passwordProblems('🐴'.repeat(15), { list: none })).toEqual([]);
    expect(passwordProblems('a'.repeat(64), { list: none })).toEqual([]);
  });

  it('[US-022:AC1] should reject passwords that are short, long, unprintable or common', () => {
    expect(passwordProblems('a'.repeat(14), { list: none })).toEqual(['too_short']);
    expect(passwordProblems('a'.repeat(65), { list: none })).toEqual(['too_long']);
    expect(passwordProblems(`${'a'.repeat(15)}\u0007`, { list: none })).toEqual(['not_printable']);
    expect(passwordProblems('CorrectHorseBatteryStaple', { list: new Set(['correcthorsebatterystaple']) })).toEqual([
      'common',
    ]);
  });

  it('[US-022:AC1] should allow 8 characters once two-factor authentication is on', () => {
    expect(passwordProblems('a'.repeat(8), { twoFactor: true, list: none })).toEqual([]);
    expect(passwordProblems('a'.repeat(7), { twoFactor: true, list: none })).toEqual(['too_short']);
  });

  it('[US-022:AC1] should load the pinned list of common passwords (8 to 64 characters)', () => {
    const list = commonPasswords();

    expect(list.size).toBeGreaterThan(40_000);
    expect(list.has('password123')).toBe(true);
    expect([...list].every((p) => [...p].length >= 8 && [...p].length <= 64)).toBe(true);
  });
});

describe('refresh tokens and cookie (BR-AUTH-02)', () => {
  it('[US-022:AC3] should be opaque random values stored only as a SHA-256 hash', () => {
    const token = newRefreshToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newRefreshToken()).not.toBe(token);
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken(token)).not.toContain(token);
  });

  it('[US-022:AC3] should use a __Host- cookie, HttpOnly, Secure, SameSite=Strict and Path=/', () => {
    expect(refreshCookie(true)).toEqual({
      name: '__Host-refresh',
      options: { httpOnly: true, secure: true, sameSite: 'strict', path: '/' },
    });
    expect(refreshCookie(false).name).not.toMatch(/^__Host-/);
  });
});
