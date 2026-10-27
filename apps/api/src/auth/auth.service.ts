import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PRIVACY_POLICY_VERSION } from '@torre/contracts';
import type { ApiInputs } from '@torre/contracts';
import { apiError } from '../common/api-error.js';
import { AppConfig } from '../config/app-config.js';
import { DatabaseService } from '../database/database.service.js';
import type { Transaction } from '../database/transaction.js';
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
    return this.issue(userId, session.id, refreshToken, refreshExpiresAt);
  }

  /**
   * Spends a refresh token and issues its successor (US-022:AC4). The successor expires with the
   * session, 24 hours after the login (DEC-062). Spending is a compare-and-set, so of two requests with
   * the same token only one wins; a token that was already spent leaked or raced, and the whole family
   * is revoked (INV-A-1, DEC-092). Unknown, expired, revoked and reused tokens all answer the same 401.
   */
  async rotate(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw apiError('UNAUTHENTICATED');
    const successorToken = newRefreshToken();
    const session = await this.db.withTransaction(async (tx) => {
      const now = new Date();
      const current = await tx.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        include: { family: true },
      });
      if (!current || current.family.revokedAt !== null || current.family.expiresAt <= now) return undefined;
      const spent = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (spent.count === 0) {
        // The revocation commits: this transaction returns instead of throwing.
        await revokeFamily(tx, current.familyId, now);
        return undefined;
      }
      const successor = await tx.refreshToken.create({
        data: {
          userId: current.userId,
          familyId: current.familyId,
          tokenHash: hashRefreshToken(successorToken),
          expiresAt: current.family.expiresAt,
        },
      });
      await tx.refreshToken.update({ where: { id: current.id }, data: { replacedBy: successor.id } });
      return tx.authSession.update({ where: { id: current.familyId }, data: { lastSeenAt: now } });
    });
    if (!session) throw apiError('UNAUTHENTICATED');
    return this.issue(session.userId, session.id, successorToken, session.expiresAt);
  }

  async account(userId: string): Promise<Account> {
    const user = await this.db.client.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw apiError('UNAUTHENTICATED');
    return toAccount(user);
  }

  private async issue(
    userId: string,
    sessionId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): Promise<IssuedSession> {
    const claims: AccessClaims = { sub: userId, sid: sessionId };
    return {
      accessToken: await this.jwt.signAsync({ ...claims }),
      expiresIn: Math.floor(this.config.get('JWT_ACCESS_TTL') / 1000),
      refreshToken,
      refreshExpiresAt,
    };
  }
}

/** Ends a session: the session row and every refresh token of its family still alive (INV-A-1). */
async function revokeFamily(tx: Transaction, familyId: string, now: Date): Promise<void> {
  await tx.authSession.updateMany({ where: { id: familyId, revokedAt: null }, data: { revokedAt: now } });
  await tx.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } });
}
