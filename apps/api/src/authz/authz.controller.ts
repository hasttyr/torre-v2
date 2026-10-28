import { Controller, Inject } from '@nestjs/common';
import { packRules } from '@casl/ability/extra';
import { Implement, implement } from '@orpc/nest';
import { apiContract } from '@torre/contracts';
import { AuthContext } from '../auth/auth-context.js';
import { AuthorizationService } from './authorization.service.js';

const { authz } = apiContract;

/** The account's abilities for the web (US-024:AC8); the API still checks every action. */
@Controller()
export class AuthzController {
  constructor(
    @Inject(AuthorizationService) private readonly service: AuthorizationService,
    @Inject(AuthContext) private readonly context: AuthContext,
  ) {}

  @Implement(authz.abilities)
  abilities() {
    return implement(authz.abilities).handler(async () => {
      const ability = await this.service.abilityFor(this.context.principal().userId);
      return { rules: packRules(ability.rules) };
    });
  }
}
