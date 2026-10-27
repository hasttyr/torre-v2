import { Controller, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { apiContract } from '@torre/contracts';
import { AuthContext } from './auth-context.js';
import { AuthService } from './auth.service.js';

const { user } = apiContract;

/**
 * The sessions of the signed-in account (US-022:AC9, Fortify's `sessions` feature). Both routes need an
 * access token; it says which session is the current one.
 */
@Controller()
export class SessionsController {
  constructor(
    @Inject(AuthService) private readonly service: AuthService,
    @Inject(AuthContext) private readonly context: AuthContext,
  ) {}

  @Implement(user.sessions)
  sessions() {
    return implement(user.sessions).handler(() => {
      const { userId, sessionId } = this.context.principal();
      return this.service.sessions(userId, sessionId);
    });
  }

  @Implement(user.revokeOtherSessions)
  revokeOtherSessions() {
    return implement(user.revokeOtherSessions).handler(async () => {
      const { userId, sessionId } = this.context.principal();
      await this.service.revokeOtherSessions(userId, sessionId);
      return { status: 204 as const };
    });
  }
}
