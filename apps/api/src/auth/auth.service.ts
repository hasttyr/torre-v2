import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PRIVACY_POLICY_VERSION } from '@torre/contracts';
import type { ApiInputs, ApiOutputs } from '@torre/contracts';
import { AuditLog } from '../audit/audit-log.js';
import { apiError } from '../common/api-error.js';
import { RequestMeta } from '../common/request-meta.js';
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

/** An account whose password matched, and whether its state lets it sign in (BR-AUTH-08). */
export interface VerifiedCredentials {
  readonly userId: string;
  readonly active: boolean;
}

export interface IssuedSession {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

type Rotation =
  | { readonly outcome: 'rotated'; readonly userId: string; readonly sessionId: string; readonly expiresAt: Date }
  | { readonly outcome: 'invalid' }
  | { readonly outcome: 'suspended' };

/** Only ACTIVE accounts sign in and renew; SUSPENDED and ANONYMIZED ones never do (BR-AUTH-08). */
const ACTIVE = 'ACTIVE';

const toAccount = (user: { id: string; email: string; displayName: string }): Account => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  locale: 'es',
});

/** Registration, credentials and sessions (Fortify-style actions, BR-AUTH-01..03, BR-AUTH-08, US-022). */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(AuditLog) private readonly audit: AuditLog,
    @Inject(RequestMeta) private readonly meta: RequestMeta,
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

  /**
   * The live account with these credentials, or null; the time is the same either way. A failure is a
   * security event (US-022:AC7): it names the account when one has this email, never the email itself.
   */
  async verifyCredentials(email: string, password: string): Promise<VerifiedCredentials | null> {
    const user = await this.db.client.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      await this.passwords.verifyNothing(password);
      await this.audit.record({ action: 'auth.login.failed' });
      return null;
    }
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      await this.audit.record({ action: 'auth.login.failed', targetType: 'user', targetId: user.id });
      return null;
    }
    return { userId: user.id, active: user.status === ACTIVE };
  }

  /** The right password for an account that may not sign in (US-022:AC10): recorded, then refused. */
  async refuseLogin(userId: string): Promise<never> {
    await this.audit.record({
      action: 'auth.login.refused',
      actorUserId: userId,
      targetType: 'user',
      targetId: userId,
    });
    throw apiError('ACCOUNT_SUSPENDED');
  }

  /**
   * A new session (refresh family) with its first refresh token and an access token (US-022:AC3). The
   * session lasts REFRESH_TTL_HOURS from now, whatever the later rotations (DEC-062), and keeps the
   * client address only as a keyed hash (DEC-096).
   */
  async startSession(userId: string, userAgent: string | null): Promise<IssuedSession> {
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.get('REFRESH_TTL_HOURS') * 3_600_000);
    const session = await this.db.withTransaction(async (tx) => {
      const created = await tx.authSession.create({
        data: { userId, expiresAt: refreshExpiresAt, userAgent, ipHash: this.meta.ipHash() },
      });
      await tx.refreshToken.create({
        data: { userId, familyId: created.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshExpiresAt },
      });
      await this.audit.record(
        { action: 'auth.login.succeeded', actorUserId: userId, targetType: 'auth_session', targetId: created.id },
        tx,
      );
      return created;
    });
    return this.issue(userId, session.id, refreshToken, refreshExpiresAt);
  }

  /**
   * Spends a refresh token and issues its successor (US-022:AC4). The successor expires with the
   * session, 24 hours after the login (DEC-062). Spending is a compare-and-set, so of two requests with
   * the same token only one wins; a token that was already spent leaked or raced, and the whole family
   * is revoked (INV-A-1, DEC-092). Unknown, expired, revoked and reused tokens all answer the same 401;
   * an account that may no longer sign in loses the session and gets ACCOUNT_SUSPENDED (US-022:AC10).
   */
  async rotate(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw apiError('UNAUTHENTICATED');
    const successorToken = newRefreshToken();
    // The revocations commit: the transaction returns an outcome instead of throwing.
    const rotation = await this.db.withTransaction(async (tx): Promise<Rotation> => {
      const now = new Date();
      const current = await tx.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        include: { family: true, user: { select: { status: true } } },
      });
      if (!current || current.family.revokedAt !== null || current.family.expiresAt <= now)
        return { outcome: 'invalid' };
      const event = { actorUserId: current.userId, targetType: 'auth_session', targetId: current.familyId } as const;
      if (current.user.status !== ACTIVE) {
        await revokeFamily(tx, current.familyId, now);
        await this.audit.record({ action: 'auth.refresh.refused', ...event }, tx);
        return { outcome: 'suspended' };
      }
      const spent = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (spent.count === 0) {
        await revokeFamily(tx, current.familyId, now);
        await this.audit.record({ action: 'auth.refresh.reused', ...event }, tx);
        return { outcome: 'invalid' };
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
      const session = await tx.authSession.update({ where: { id: current.familyId }, data: { lastSeenAt: now } });
      return { outcome: 'rotated', userId: session.userId, sessionId: session.id, expiresAt: session.expiresAt };
    });
    if (rotation.outcome === 'suspended') throw apiError('ACCOUNT_SUSPENDED');
    if (rotation.outcome === 'invalid') throw apiError('UNAUTHENTICATED');
    return this.issue(rotation.userId, rotation.sessionId, successorToken, rotation.expiresAt);
  }

  /**
   * Ends the session of a refresh token in any state, revoking its whole family (US-022:AC5). Only a
   * session that was still open leaves a logout in the audit trail, so repeating it adds nothing.
   */
  async endSession(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.db.withTransaction(async (tx) => {
      const token = await tx.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        select: { familyId: true, userId: true },
      });
      if (!token || !(await revokeFamily(tx, token.familyId, new Date()))) return;
      await this.audit.record(
        { action: 'auth.logout', actorUserId: token.userId, targetType: 'auth_session', targetId: token.familyId },
        tx,
      );
    });
  }

  /** The live sessions of an account, most recently used first (US-022:AC9). */
  async sessions(userId: string, currentSessionId: string): Promise<ApiOutputs['user']['sessions']> {
    const rows = await this.db.client.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      userAgent: s.userAgent,
      current: s.id === currentSessionId,
    }));
  }

  /**
   * Ends every live session of the account but the current one, with their refresh tokens (US-022:AC9).
   * The current session must itself be open: an access token that outlived its session cannot do it.
   */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await this.db.withTransaction(
      async (tx) => {
        const now = new Date();
        const live = { userId, revokedAt: null, expiresAt: { gt: now } };
        if ((await tx.authSession.count({ where: { ...live, id: currentSessionId } })) === 0) {
          throw apiError('UNAUTHENTICATED');
        }
        const others = await tx.authSession.findMany({
          where: { ...live, id: { not: currentSessionId } },
          select: { id: true },
        });
        for (const { id } of others) await revokeFamily(tx, id, now);
        await this.audit.record(
          {
            action: 'auth.sessions.revoked_others',
            actorUserId: userId,
            targetType: 'user',
            targetId: userId,
            changes: { revokedSessions: others.length },
          },
          tx,
        );
      },
      { userId },
    );
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

/**
 * Ends a session: the session row and every refresh token of its family still alive (INV-A-1). True
 * when the session was still open.
 */
async function revokeFamily(tx: Transaction, familyId: string, now: Date): Promise<boolean> {
  const ended = await tx.authSession.updateMany({ where: { id: familyId, revokedAt: null }, data: { revokedAt: now } });
  await tx.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: now } });
  return ended.count > 0;
}
