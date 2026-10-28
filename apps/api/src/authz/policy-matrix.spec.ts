import {
  PERMISSION_KEYS,
  PERMISSIONS,
  ROLE_KEYS,
  ROLE_SCOPES,
  SCOPE_TYPES,
  SYSTEM_ROLE_PERMISSIONS,
} from '@torre/contracts';
import type { PermissionKey, RoleKey } from '@torre/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { authzResource, defineAbilitiesFor, TOURNAMENT_CHANGES } from './abilities.js';
import type { AppAbility, Grant } from './abilities.js';

// Where each role holds its membership, and a place outside it. Readable ids keep the table stable.
const HOME = { organizationId: 'org-a', tournamentId: 'tournament-a', teamId: 'team-a' };
const AWAY = { organizationId: 'org-b', tournamentId: 'tournament-b', teamId: 'team-b' };
/** A resource of a running tournament: a published round, the next one not yet published. */
const OPEN = {
  tournamentStatus: 'IN_PROGRESS',
  roundStatus: 'PUBLISHED',
  nextRoundPublished: false,
  visibility: 'PRIVATE',
  archivedAt: null,
};
/** The states of AUTHORIZATION.md §5 that take a permission away (DEC-105). */
const BLOCKING = [
  ['ronda CLOSED', { roundStatus: 'CLOSED' }],
  ['siguiente publicada', { nextRoundPublished: true }],
  ['torneo CLOSED', { tournamentStatus: 'CLOSED' }],
  ['torneo CANCELLED', { tournamentStatus: 'CANCELLED' }],
] as const;

const ABBREVIATIONS: Record<RoleKey, string> = {
  platform_admin: 'PA',
  org_owner: 'OO',
  org_admin: 'OA',
  tournament_director: 'TD',
  arbiter: 'AR',
  captain: 'CP',
  player: 'PL',
};

const user = { id: 'user-1' };

/** The system role's default permissions, granted where `HOME` is. */
function grantsOf(role: RoleKey, permissions: readonly PermissionKey[] = SYSTEM_ROLE_PERMISSIONS[role]): Grant[] {
  const type = ROLE_SCOPES[role];
  const id = {
    PLATFORM: null,
    ORGANIZATION: HOME.organizationId,
    TOURNAMENT: HOME.tournamentId,
    TEAM: HOME.teamId,
  }[type];
  const organizationId = type === 'PLATFORM' ? null : HOME.organizationId;
  return permissions.map((permission) => ({ permission, scope: { type, id, organizationId } }));
}

const resource = (key: PermissionKey, attributes: Record<string, unknown>) =>
  authzResource(PERMISSIONS[key].subject, attributes);

interface Cell {
  readonly home: boolean;
  readonly away: boolean;
  readonly blockedBy: readonly string[];
}

function cell(ability: AppAbility, key: PermissionKey): Cell {
  const home = ability.can(key, resource(key, { ...HOME, ...OPEN }));
  return {
    home,
    away: ability.can(key, resource(key, { ...AWAY, ...OPEN })),
    blockedBy: home
      ? BLOCKING.filter(([, state]) => !ability.can(key, resource(key, { ...HOME, ...OPEN, ...state }))).map(
          ([name]) => name,
        )
      : [],
  };
}

const abilities = Object.fromEntries(
  ROLE_KEYS.map((role) => [role, defineAbilitiesFor(user, grantsOf(role))]),
) as Record<RoleKey, AppAbility>;
const roleKeys = PERMISSION_KEYS.filter((key) => PERMISSIONS[key].group !== 'account');

function render(c: Cell): string {
  if (!c.home) return c.away ? '✗ propio · ✓ ajeno' : '—';
  const where = c.away ? '✓ todos' : '✓';
  return c.blockedBy.length > 0 ? `${where} ⊘ ${c.blockedBy.join(', ')}` : where;
}

/** The generated policy matrix (US-024:AC5): versioned, so a policy change shows which cases change. */
function policyTable(): string {
  const header = `| Permiso | Sujeto | ${ROLE_KEYS.map((r) => ABBREVIATIONS[r]).join(' | ')} |`;
  const rows = roleKeys.map(
    (key) =>
      `| \`${key}\` | ${PERMISSIONS[key].subject} | ${ROLE_KEYS.map((role) => render(cell(abilities[role], key))).join(' | ')} |`,
  );
  return [
    '# Matriz de política generada',
    '',
    '> **Generada**, no se edita a mano: `apps/api/src/authz/policy-matrix.spec.ts` la calcula con `defineAbilitiesFor` y la semilla',
    '> de los roles del sistema (`US-024:AC5`). Si la política cambia, la prueba falla y `vitest -u` la regenera: el diff del PR',
    '> muestra qué casos cambiaron. La fuente de lo que *debe* ser es `docs/AUTHORIZATION.md` §4–§5.',
    '',
    'Cada rol tiene su membresía en la organización A (`OO`, `OA`), el torneo A (`TD`, `AR`, `PL`), el equipo A (`CP`) o la',
    'plataforma (`PA`). Leyenda: `✓` sobre un recurso de su alcance · `✓ todos` también fuera de él · `—` nunca ·',
    '`⊘` estados de AUTHORIZATION.md §5 que lo bloquean aunque tenga el permiso (`DEC-105`).',
    '',
    header,
    `|---|---|${ROLE_KEYS.map(() => '---').join('|')}|`,
    ...rows,
    '',
  ].join('\n');
}

describe('the generated policy matrix (US-024)', () => {
  it('[US-024:AC5][TC-150] should keep the generated matrix of role × permission × scope × state versioned', async () => {
    await expect(policyTable()).toMatchFileSnapshot('./policy-matrix.md');
  });

  it('[US-024:AC5][INV-T-8] should grant inside the scope exactly the seed, and outside it only to platform_admin', () => {
    for (const role of ROLE_KEYS) {
      for (const key of roleKeys) {
        const c = cell(abilities[role], key);
        expect(c.home, `${role} ${key}`).toBe(SYSTEM_ROLE_PERMISSIONS[role].includes(key));
        expect(c.away, `${role} ${key}`).toBe(role === 'platform_admin' && c.home);
      }
    }
  });

  it('[US-024:AC5] should give an account without memberships none of the permissions of the roles', () => {
    const viewer = defineAbilitiesFor(user, []);

    for (const key of roleKeys) expect(cell(viewer, key).home, key).toBe(false);
    expect(viewer.can('tournament.view_private', resource('tournament.view_private', { ...HOME, ...OPEN }))).toBe(
      false,
    );
    expect(viewer.can('report.download', resource('report.download', { ...HOME, ...OPEN }))).toBe(false);
  });
});

describe('IDOR: changing the id does not reach another scope (US-024)', () => {
  const game = (where: typeof HOME) => authzResource('Game', { ...where, ...OPEN });

  it('[US-024:AC6][INV-T-3] should not let a captain touch the roster or lineup of another team', () => {
    const captain = abilities.captain;
    const otherTeam = { ...HOME, teamId: 'team-b' };

    expect(captain.can('roster.update', authzResource('Roster', { ...HOME, ...OPEN }))).toBe(true);
    expect(captain.can('roster.update', authzResource('Roster', { ...otherTeam, ...OPEN }))).toBe(false);
    expect(captain.can('lineup.submit', authzResource('Lineup', { ...otherTeam, ...OPEN }))).toBe(false);
  });

  it('[US-024:AC6][INV-T-3] should not let an arbiter of one tournament record results in another', () => {
    const otherTournament = { ...HOME, tournamentId: 'tournament-b' };

    expect(abilities.arbiter.can('game.record', game(HOME))).toBe(true);
    expect(abilities.arbiter.can('game.record', game(otherTournament))).toBe(false);
  });

  it('[US-024:AC6][INV-T-3] should not let a director configure a tournament of another organization', () => {
    const tournament = (where: typeof HOME) => authzResource('Tournament', { ...where, ...OPEN });

    expect(abilities.tournament_director.can('tournament.configure', tournament(HOME))).toBe(true);
    expect(abilities.tournament_director.can('tournament.configure', tournament(AWAY))).toBe(false);
    expect(abilities.org_admin.can('tournament.configure', tournament(AWAY))).toBe(false);
  });
});

describe('rules of state (US-024)', () => {
  const game = (state: Record<string, unknown>) => authzResource('Game', { ...HOME, ...OPEN, ...state });

  it('[US-024:AC7][TC-150] should let nobody record, correct or forfeit in a CLOSED round, only correct it administratively', () => {
    for (const role of ROLE_KEYS) {
      const ability = abilities[role];
      for (const key of ['game.record', 'game.correct', 'game.forfeit'] as const) {
        expect(ability.can(key, game({ roundStatus: 'CLOSED' })), `${role} ${key}`).toBe(false);
      }
      expect(ability.can('game.correct_admin', game({ roundStatus: 'CLOSED' })), role).toBe(
        SYSTEM_ROLE_PERMISSIONS[role].includes('game.correct_admin'),
      );
    }
  });

  it('[US-024:AC7] should leave only the administrative correction once the next round is published (DEC-051)', () => {
    const published = game({ nextRoundPublished: true });

    expect(abilities.arbiter.can('game.correct', game({}))).toBe(true);
    expect(abilities.arbiter.can('game.correct', published)).toBe(false);
    expect(abilities.tournament_director.can('game.correct_admin', published)).toBe(true);
  });

  it('[US-024:AC7] should keep a CLOSED or CANCELLED tournament read-only, but reopenable and reportable', () => {
    for (const status of ['CLOSED', 'CANCELLED']) {
      const closed = (key: PermissionKey) => resource(key, { ...HOME, ...OPEN, tournamentStatus: status });
      for (const key of TOURNAMENT_CHANGES) expect(abilities.org_owner.can(key, closed(key)), key).toBe(false);
      for (const key of ['tournament.reopen', 'report.generate', 'audit.view'] as const) {
        expect(abilities.org_owner.can(key, closed(key)), key).toBe(true);
      }
    }
  });

  it('[US-024:AC7][INV-T-7] should not let any set of permissions, in any scope, skip a rule of state', () => {
    fc.assert(
      fc.property(fc.subarray([...PERMISSION_KEYS]), fc.constantFrom(...SCOPE_TYPES), (permissions, type) => {
        const grants: Grant[] = permissions.map((permission) => ({
          permission,
          scope: { type, id: type === 'PLATFORM' ? null : 'scope-a', organizationId: 'org-a' },
        }));
        const ability = defineAbilitiesFor(user, grants);
        const where = { organizationId: 'org-a', tournamentId: 'scope-a', teamId: 'scope-a' };
        for (const key of ['game.record', 'game.correct', 'game.forfeit'] as const) {
          expect(ability.can(key, authzResource('Game', { ...where, ...OPEN, roundStatus: 'CLOSED' }))).toBe(false);
        }
        expect(
          ability.can('game.correct', authzResource('Game', { ...where, ...OPEN, nextRoundPublished: true })),
        ).toBe(false);
        for (const key of TOURNAMENT_CHANGES) {
          for (const status of ['CLOSED', 'CANCELLED']) {
            expect(ability.can(key, resource(key, { ...where, ...OPEN, tournamentStatus: status }))).toBe(false);
          }
        }
      }),
    );
  });
});
