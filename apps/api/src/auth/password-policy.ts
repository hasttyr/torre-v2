import { readFileSync } from 'node:fs';

/** BR-AUTH-09 (NIST SP 800-63B-4, DEC-062): length in characters, without composition rules. */
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_MIN_LENGTH = 15;
/** Accounts with two-factor authentication may use shorter passwords (US-107). */
export const PASSWORD_MIN_LENGTH_WITH_2FA = 8;

export type PasswordProblem = 'too_short' | 'too_long' | 'not_printable' | 'common';

const COMMON_LIST = new URL('../../assets/common-passwords.txt', import.meta.url);
let common: ReadonlySet<string> | undefined;

/**
 * The local list of common passwords (SecLists NCSC, ADR-0001), loaded once and compared without case:
 * `Password123` is as guessable as `password123`.
 */
export function commonPasswords(): ReadonlySet<string> {
  common ??= new Set(
    readFileSync(COMMON_LIST, 'utf8')
      .split('\n')
      .filter((line) => line !== '' && !line.startsWith('#'))
      .map((line) => line.toLowerCase()),
  );
  return common;
}

/**
 * What is wrong with a password, if anything. Characters are code points, so emoji and accents count
 * as one; every printable character and the space are allowed, control characters are not.
 */
export function passwordProblems(
  password: string,
  { twoFactor = false, list = commonPasswords() }: { twoFactor?: boolean; list?: ReadonlySet<string> } = {},
): PasswordProblem[] {
  const length = [...password].length;
  const problems: PasswordProblem[] = [];
  if (length < (twoFactor ? PASSWORD_MIN_LENGTH_WITH_2FA : PASSWORD_MIN_LENGTH)) problems.push('too_short');
  if (length > PASSWORD_MAX_LENGTH) problems.push('too_long');
  if (/\p{Cc}/u.test(password)) problems.push('not_printable');
  if (list.has(password.toLowerCase())) problems.push('common');
  return problems;
}
