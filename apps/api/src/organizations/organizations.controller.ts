import { Controller, Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { apiContract } from '@torre/contracts';
import { AuthContext } from '../auth/auth-context.js';
import { RequirePermission } from '../authz/require-permission.js';
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
  @RequirePermission('organization.create')
  create() {
    return implement(organizations.create).handler(({ input }) =>
      this.service.create(this.context.principal().userId, input),
    );
  }

  @Implement(organizations.list)
  list() {
    return implement(organizations.list).handler(() => this.service.mine(this.context.principal().userId));
  }

  @Implement(organizations.get)
  @RequirePermission('organization.view')
  get() {
    return implement(organizations.get).handler(({ input }) =>
      this.service.get(this.context.principal().userId, input.id),
    );
  }

  @Implement(organizations.memberships)
  memberships() {
    return implement(organizations.memberships).handler(() =>
      this.service.memberships(this.context.principal().userId),
    );
  }
}
