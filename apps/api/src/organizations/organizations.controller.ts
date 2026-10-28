import { Controller, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { apiContract } from '@torre/contracts';
import { AuthContext } from '../auth/auth-context.js';
import { OrganizationsService } from './organizations.service.js';

const { organizations } = apiContract;

/** Organizations and the account's memberships (US-023). Every route needs an access token. */
@Controller()
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService) private readonly service: OrganizationsService,
    @Inject(AuthContext) private readonly context: AuthContext,
  ) {}

  @Implement(organizations.create)
  create() {
    return implement(organizations.create).handler(({ input }) =>
      this.service.create(this.context.principal().userId, input),
    );
  }

  @Implement(organizations.list)
  list() {
    return implement(organizations.list).handler(() => this.service.mine(this.context.principal().userId));
  }

  @Implement(organizations.memberships)
  memberships() {
    return implement(organizations.memberships).handler(() =>
      this.service.memberships(this.context.principal().userId),
    );
  }
}
