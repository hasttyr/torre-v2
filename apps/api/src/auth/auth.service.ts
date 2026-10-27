import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PRIVACY_POLICY_VERSION } from '@torre/contracts';
import type { ApiInputs } from '@torre/contracts';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';
import { DatabaseService } from '../database/database.service.js';
import type { AccessClaims } from './jwt.strategy.js';
import { passwordProblems } from './password-policy.js';
import { PasswordService } from './password.service.js';
import { hashRefreshToken, newRefreshToken } from './tokens.js';

const PROBLEM_MESSAGES = {
  too_short: 'Shorter than the minimum length',
  too_long: 'Longer than 64 characters',
  not_printable: 'Contains control characters',
  common: 'Appears in the list of common passwords',
} as const;

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly locale: 'es';
}

export interface IssuedSession {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

const toAccount = (user: { id: string; email: string; displayName: string }): Account => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  locale: 'es',
});

/** Registration, credentials and sessions (Fortify-style actions, BR-AUTH-01..03, US-022). */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AppConfig) private readonly config: AppConfig,
  ) {}

  /** A viewer account, without memberships (BR-ROLE-01), with the accepted policy version (BR-AUTH-03). */
  async register(input: ApiInputs['auth']['register']): Promise<Account> {
    if (input.acceptedPrivacyPolicyVersion !== PRIVACY_POLICY_VERSION) {
      throw apiError('VALIDATION_FAILED', {
        errors: [{ path: 'acceptedPrivacyPolicyVersion', code: 'outdated', message: 'Not the current policy' }],
      });
    }
    const problems = passwordProblems(input.password);
    if (problems.length > 0) {
      throw apiError('PASSWORD_POLICY_VIOLATION', {
        errors: problems.map((code) => ({ path: 'password', code, message: PROBLEM_MESSAGES[code] })),
      });
    }
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.db.client.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          locale: input.locale,
          privacyPolicyVersion: input.acceptedPrivacyPolicyVersion,
          privacyAcceptedAt: new Date(),
        },
      });
      return toAccount(user);
    } catch (error) {
      if ((error as { code?: unknown }).code === 'P2002') {
        throw apiError('VALIDATION_FAILED', {
          errors: [{ path: 'email', code: 'taken', message: 'An account already uses this email' }],
        });
      }
      throw error;
    }
  }

  /** The live account with these credentials, or null; the time is the same either way. */
  async verifyCredentials(email: string, password: string): Promise<Account | null> {
    const user = await this.db.client.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return this.passwords.verifyNothing(password).then(() => null);
    return (await this.passwords.verify(user.passwordHash, password)) ? toAccount(user) : null;
  }

  /**
   * A new session (refresh family) with its first refresh token and an access token (US-022:AC3). The
   * session lasts REFRESH_TTL_HOURS from now, whatever the later rotations (DEC-062).
   */
  async startSession(userId: string, userAgent: string | null): Promise<IssuedSession> {
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.get('REFRESH_TTL_HOURS') * 3_600_000);
    const session = await this.db.withTransaction(async (tx) => {
      const created = await tx.authSession.create({ data: { userId, expiresAt: refreshExpiresAt, userAgent } });
      await tx.refreshToken.create({
        data: { userId, familyId: created.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshExpiresAt },
      });
      return created;
    });
    const claims: AccessClaims = { sub: userId, sid: session.id };
    return {
      accessToken: await this.jwt.signAsync({ ...claims }),
      expiresIn: Math.floor(this.config.get('JWT_ACCESS_TTL') / 1000),
      refreshToken,
      refreshExpiresAt,
    };
  }

  async account(userId: string): Promise<Account> {
    const user = await this.db.client.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw apiError('UNAUTHENTICATED');
    return toAccount(user);
  }
}
