import { Inject, Injectable } from '@nestjs/common';
import { RequestMeta } from '../common/request-meta.js';
import { DatabaseService } from '../database/database.service.js';
import type { Prisma } from '../database/generated/client.js';
import type { Transaction } from '../database/transaction.js';

/**
 * What the trail records (DEC-095). Authentication: a login that opened a session, failed or was refused
 * for the state of the account; a refresh token used twice or refused; a logout; the other sessions
 * ended at once (BR-AUTH-07, BR-AUTH-08).
 */
export type AuditAction =
  | 'auth.login.succeeded'
  | 'auth.login.failed'
  | 'auth.login.refused'
  | 'auth.refresh.reused'
  | 'auth.refresh.refused'
  | 'auth.logout'
  | 'auth.sessions.revoked_others';

export type AuditTarget = 'user' | 'auth_session';

/** One row of `audit_log`: ids and counts only, never an email, a name or an address (DEC-077). */
export interface AuditEntry {
  readonly action: AuditAction;
  readonly actorUserId?: string | null;
  readonly targetType?: AuditTarget;
  readonly targetId?: string | null;
  readonly organizationId?: string | null;
  readonly reason?: string;
  readonly changes?: Prisma.InputJsonObject;
}

/**
 * The append-only audit trail (ARCHITECTURE.md §8.1, DEC-077). Each entry carries the hashed client
 * address and the correlation id of the request that caused it.
 */
@Injectable()
export class AuditLog {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(RequestMeta) private readonly meta: RequestMeta,
  ) {}

  /**
   * Appends an entry. Pass the transaction of the action it records, so both commit or neither does;
   * without one, the entry is written on its own.
   */
  async record(entry: AuditEntry, tx?: Transaction): Promise<void> {
    await (tx ?? this.db.client).auditLog.create({
      data: { ...entry, ipHash: this.meta.ipHash(), correlationId: this.meta.correlationId() },
    });
  }
}
