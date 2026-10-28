import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { authzResource as subject, defineAbilitiesFor } from './abilities.js';
import type { Grant } from './abilities.js';

const orgA = randomUUID();
const orgB = randomUUID();
const tournamentA1 = randomUUID();
const tournamentA2 = randomUUID();
const user = { id: randomUUID() };

const game = (organizationId: string, tournamentId: string) =>
  subject('Game', { organizationId, tournamentId, id: randomUUID() });
const tournament = (organizationId: string, id: string, visibility = 'PRIVATE', archivedAt: Date | null = null) =>
  subject('Tournament', { organizationId, tournamentId: id, id, visibility, archivedAt });

describe('defineAbilitiesFor (US-024)', () => {
  it('[US-024:AC1] should limit an organization grant to that organization and everything inside it', () => {
    const grants: Grant[] = [
      { permission: 'game.record', scope: { type: 'ORGANIZATION', id: orgA, organizationId: orgA } },
    ];
    const ability = defineAbilitiesFor(user, grants);

    expect(ability.can('game.record', game(orgA, tournamentA1))).toBe(true);
    expect(ability.can('game.record', game(orgA, tournamentA2))).toBe(true);
    expect(ability.can('game.record', game(orgB, randomUUID()))).toBe(false);
    // A permission is not another: game.correct was never granted.
    expect(ability.can('game.correct', game(orgA, tournamentA1))).toBe(false);
  });

  it('[US-024:AC1] should limit a tournament grant to that tournament (INV-T-3)', () => {
    const grants: Grant[] = [
      { permission: 'game.record', scope: { type: 'TOURNAMENT', id: tournamentA1, organizationId: orgA } },
    ];
    const ability = defineAbilitiesFor(user, grants);

    expect(ability.can('game.record', game(orgA, tournamentA1))).toBe(true);
    expect(ability.can('game.record', game(orgA, tournamentA2))).toBe(false);
  });

  it('[US-024:AC2] should let any membership in an organization see it, and only that one', () => {
    const grants: Grant[] = [
      { permission: 'organization.view', scope: { type: 'TOURNAMENT', id: tournamentA1, organizationId: orgA } },
    ];
    const ability = defineAbilitiesFor(user, grants);

    expect(ability.can('organization.view', subject('Organization', { organizationId: orgA }))).toBe(true);
    expect(ability.can('organization.view', subject('Organization', { organizationId: orgB }))).toBe(false);
  });

  it('[US-024:AC1] should let a platform grant act anywhere', () => {
    const grants: Grant[] = [
      { permission: 'tournament.archive', scope: { type: 'PLATFORM', id: null, organizationId: null } },
    ];
    const ability = defineAbilitiesFor(user, grants);

    expect(ability.can('tournament.archive', tournament(orgA, tournamentA1))).toBe(true);
    expect(ability.can('tournament.archive', tournament(orgB, randomUUID()))).toBe(true);
  });

  it('[US-024:AC1] should deny a scoped grant that lost its scope id instead of widening it', () => {
    const grants: Grant[] = [
      { permission: 'game.record', scope: { type: 'TOURNAMENT', id: null, organizationId: orgA } },
    ];

    expect(defineAbilitiesFor(user, grants).can('game.record', game(orgA, tournamentA1))).toBe(false);
  });

  it('[US-024:AC1] should let anyone read public and unlisted tournaments, and nothing else, without grants', () => {
    for (const who of [null, user]) {
      const ability = defineAbilitiesFor(who, []);
      expect(ability.can('read', tournament(orgA, tournamentA1, 'PUBLIC'))).toBe(true);
      expect(ability.can('read', tournament(orgA, tournamentA1, 'UNLISTED'))).toBe(true);
      expect(ability.can('read', tournament(orgA, tournamentA1, 'PRIVATE'))).toBe(false);
      expect(ability.can('read', tournament(orgA, tournamentA1, 'PUBLIC', new Date()))).toBe(false);
      expect(ability.can('game.record', game(orgA, tournamentA1))).toBe(false);
    }
  });

  it('[US-024:AC1] should give every signed-in account its own resources and nobody else’s', () => {
    const ability = defineAbilitiesFor(user, []);
    const anonymous = defineAbilitiesFor(null, []);
    const mine = subject('RoleRequest', { requesterId: user.id });
    const theirs = subject('RoleRequest', { requesterId: randomUUID() });

    expect(ability.can('role_request.create', mine)).toBe(true);
    expect(ability.can('role_request.create', theirs)).toBe(false);
    expect(ability.can('profile.update_own', subject('User', { id: user.id }))).toBe(true);
    expect(ability.can('profile.update_own', subject('User', { id: randomUUID() }))).toBe(false);
    expect(anonymous.can('role_request.create', mine)).toBe(false);
  });
});
