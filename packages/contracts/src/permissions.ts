import { ROLE_KEYS, ROLE_SCOPES } from './roles.js';
import type { RoleKey, ScopeType } from './roles.js';

/** Groups of the catalogue (AUTHORIZATION.md §4.1). */
export const PERMISSION_GROUPS = [
  'platform',
  'deletion',
  'organization',
  'rules',
  'players',
  'tournament',
  'registration',
  'teams',
  'rounds',
  'results',
  'reports',
  'claims',
  'account',
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

/** CASL subjects: the "Recurso" column of the matrix (AUTHORIZATION.md §4, §6.1). */
export type AuthzSubject =
  | 'Audit'
  | 'Championship'
  | 'Claim'
  | 'DataSubjectRequest'
  | 'Game'
  | 'Institution'
  | 'Lineup'
  | 'Membership'
  | 'Organization'
  | 'Pairing'
  | 'Participant'
  | 'Player'
  | 'Report'
  | 'Role'
  | 'RoleRequest'
  | 'Roster'
  | 'Round'
  | 'RuleSet'
  | 'Standing'
  | 'Subscription'
  | 'Team'
  | 'Tournament'
  | 'Trash'
  | 'User';

interface PermissionDefinition {
  readonly group: PermissionGroup;
  readonly subject: AuthzSubject;
  /** Only `platform_admin` holds it; giving it to any other role is `RESERVED_PERMISSION` (INV-T-6). */
  readonly reserved: boolean;
  /** Spanish description, the action of the matrix row. */
  readonly description: string;
  /**
   * Account permissions (every signed-in account, never a role): the field of the resource that must
   * hold the account's id.
   */
  readonly ownerField?: string;
}

const platform = (subject: AuthzSubject, description: string): PermissionDefinition => ({
  group: 'platform',
  subject,
  reserved: true,
  description,
});
const deletion = (subject: AuthzSubject, description: string): PermissionDefinition => ({
  group: 'deletion',
  subject,
  reserved: true,
  description,
});
const regular = (group: PermissionGroup, subject: AuthzSubject, description: string): PermissionDefinition => ({
  group,
  subject,
  reserved: false,
  description,
});
const own = (subject: AuthzSubject, ownerField: string, description: string): PermissionDefinition => ({
  group: 'account',
  subject,
  reserved: false,
  description,
  ownerField,
});

/**
 * The fixed catalogue of permissions (AUTHORIZATION.md §4.1, DEC-058). `permissions:sync` loads it into
 * the `permissions` table; removing a key needs a migration that takes it away from the roles first.
 */
export const PERMISSIONS = {
  // Platform (reserved).
  'institution.manage': platform('Institution', 'Gestionar el catálogo de instituciones'),
  'organization.create': platform('Organization', 'Crear organizaciones'),
  'role.manage': platform('Role', 'Gestionar roles y permisos'),
  'user.suspend': platform('User', 'Suspender y reactivar cuentas'),
  'trash.view': platform('Trash', 'Ver la papelera'),
  'trash.restore': platform('Trash', 'Restaurar desde la papelera'),
  'privacy.anonymize': platform('User', 'Anonimizar a un titular'),
  'privacy.resolve': platform('DataSubjectRequest', 'Resolver solicitudes de los titulares'),
  'tournament.archive': platform('Tournament', 'Archivar y desarchivar torneos'),
  // Logical deletion (reserved, DEC-059).
  'organization.delete': deletion('Organization', 'Borrar organizaciones'),
  'player.delete': deletion('Player', 'Borrar jugadores'),
  'ruleset.delete': deletion('RuleSet', 'Borrar reglamentos'),
  'championship.delete': deletion('Championship', 'Borrar campeonatos'),
  'institution.delete': deletion('Institution', 'Borrar instituciones'),
  'user.delete': deletion('User', 'Borrar cuentas'),
  'report.delete': deletion('Report', 'Borrar reportes'),
  'role.delete': deletion('Role', 'Borrar roles'),
  // Organization.
  'organization.view': regular('organization', 'Organization', 'Ver la organización'),
  'organization.update': regular('organization', 'Organization', 'Editar la organización'),
  'membership.grant': regular('organization', 'Membership', 'Otorgar y cambiar roles'),
  'membership.revoke': regular('organization', 'Membership', 'Revocar roles'),
  'role_request.review': regular('organization', 'RoleRequest', 'Ver y resolver solicitudes de rol'),
  'championship.manage': regular('organization', 'Championship', 'Gestionar campeonatos'),
  // Rules.
  'ruleset.create_draft': regular('rules', 'RuleSet', 'Crear versiones de reglamento en borrador'),
  'ruleset.approve': regular('rules', 'RuleSet', 'Aprobar y deprecar reglamentos'),
  // Players.
  'player.view': regular('players', 'Player', 'Ver jugadores'),
  'player.create': regular('players', 'Player', 'Crear jugadores'),
  'player.update': regular('players', 'Player', 'Editar jugadores'),
  'player.import': regular('players', 'Player', 'Importar jugadores'),
  'player.link': regular('players', 'Player', 'Vincular un jugador con una cuenta'),
  'rating.import': regular('players', 'Player', 'Importar ratings'),
  // Tournament.
  'tournament.create': regular('tournament', 'Tournament', 'Crear torneos'),
  'tournament.configure': regular('tournament', 'Tournament', 'Configurar el torneo'),
  'tournament.transition': regular(
    'tournament',
    'Tournament',
    'Abrir o cerrar la inscripción, iniciar, finalizar o cancelar',
  ),
  'tournament.close': regular('tournament', 'Tournament', 'Cerrar el torneo'),
  'tournament.reopen': regular('tournament', 'Tournament', 'Reabrir un torneo cerrado'),
  'tournament.view_private': regular('tournament', 'Tournament', 'Ver torneos privados y sus resultados'),
  'game.view_own': regular('tournament', 'Game', 'Ver las partidas, la mesa y la posición propias'),
  // Registration.
  'participant.register': regular('registration', 'Participant', 'Inscribir participantes'),
  'participant.withdraw': regular('registration', 'Participant', 'Retirar participantes'),
  'participant.reinstate': regular('registration', 'Participant', 'Reincorporar participantes'),
  'participant.seed_adjust': regular('registration', 'Participant', 'Ajustar la siembra'),
  'bye.request': regular('registration', 'Participant', 'Registrar o retirar un bye solicitado'),
  // Teams.
  'team.register': regular('teams', 'Team', 'Registrar equipos'),
  'roster.update': regular('teams', 'Roster', 'Editar la plantilla'),
  'lineup.submit': regular('teams', 'Lineup', 'Presentar la alineación'),
  // Rounds.
  'round.schedule': regular('rounds', 'Round', 'Programar rondas'),
  'round.checkin_manage': regular('rounds', 'Round', 'Abrir y cerrar el check-in de una ronda'),
  'participant.checkin_mark': regular('rounds', 'Participant', 'Marcar o deshacer el check-in de un participante'),
  'participant.checkin_self': regular('rounds', 'Participant', 'Marcar o deshacer el check-in propio'),
  'round.pair': regular('rounds', 'Round', 'Generar o descartar el borrador de una ronda'),
  'pairing.adjust': regular('rounds', 'Pairing', 'Ajustar emparejamientos en borrador'),
  'pairing.override': regular('rounds', 'Pairing', 'Forzar una violación absoluta'),
  'round.publish': regular('rounds', 'Round', 'Publicar rondas'),
  'round.close': regular('rounds', 'Round', 'Cerrar rondas'),
  'round.reopen': regular('rounds', 'Round', 'Reabrir rondas'),
  'round.stale_ack': regular('rounds', 'Round', 'Mantener una ronda desactualizada'),
  // Results.
  'game.record': regular('results', 'Game', 'Registrar resultados'),
  'game.correct': regular('results', 'Game', 'Corregir resultados'),
  'game.correct_admin': regular('results', 'Game', 'Corrección administrativa de resultados'),
  'game.forfeit': regular('results', 'Game', 'Registrar forfeits y byes'),
  'standing.draw_lots': regular('results', 'Standing', 'Desempatar por sorteo'),
  // Reports and audit.
  'report.generate': regular('reports', 'Report', 'Generar reportes'),
  'report.download': regular('reports', 'Report', 'Descargar reportes'),
  'audit.view': regular('reports', 'Audit', 'Ver la línea de tiempo de auditoría'),
  // Claims.
  'claim.file': regular('claims', 'Claim', 'Presentar reclamaciones'),
  'claim.resolve': regular('claims', 'Claim', 'Resolver reclamaciones'),
  // Own account: every signed-in account, never a role.
  'role_request.create': own('RoleRequest', 'requesterId', 'Solicitar un rol y retirar la solicitud propia'),
  'profile.update_own': own('User', 'id', 'Editar el perfil propio'),
  'subscription.manage_own': own('Subscription', 'userId', 'Gestionar las suscripciones propias'),
  'privacy.request_own': own('DataSubjectRequest', 'userId', 'Ejercer los derechos sobre los datos propios'),
} as const satisfies Record<string, PermissionDefinition>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Permissions every signed-in account holds on its own resources, whatever its memberships. */
export const ACCOUNT_PERMISSIONS = PERMISSION_KEYS.filter((key) => PERMISSIONS[key].group === 'account');

const keys = (...list: PermissionKey[]): readonly PermissionKey[] => list;

// The default permissions of each system role, row by row of the matrix (AUTHORIZATION.md §4). The test
// of INV-T-8 reads the matrix and compares; `platform_admin` editing a role does not change this seed.
const DIRECTION = keys(
  'tournament.configure',
  'round.checkin_manage',
  'participant.checkin_mark',
  'tournament.transition',
  'tournament.close',
  'participant.register',
  'participant.seed_adjust',
  'bye.request',
  'participant.withdraw',
  'participant.reinstate',
  'team.register',
  'roster.update',
  'lineup.submit',
  'round.schedule',
  'round.pair',
  'pairing.adjust',
  'pairing.override',
  'round.publish',
  'game.record',
  'game.correct',
  'game.correct_admin',
  'game.forfeit',
  'round.close',
  'round.reopen',
  'round.stale_ack',
  'standing.draw_lots',
  'report.generate',
  'report.download',
  'audit.view',
  'claim.file',
  'claim.resolve',
  'tournament.view_private',
  'organization.view',
  'membership.grant',
  'membership.revoke',
  'role_request.review',
  'ruleset.create_draft',
  'player.view',
  'player.create',
  'player.update',
  'player.import',
  'rating.import',
  'player.link',
);
const ORGANIZATION_ADMINISTRATION = keys(
  ...DIRECTION,
  'organization.update',
  'ruleset.approve',
  'tournament.create',
  'tournament.reopen',
  'championship.manage',
);

export const SYSTEM_ROLE_PERMISSIONS: Readonly<Record<RoleKey, readonly PermissionKey[]>> = {
  // Everything but the own account's permissions and the three rows where the matrix says "—".
  platform_admin: PERMISSION_KEYS.filter(
    (key) =>
      PERMISSIONS[key].group !== 'account' &&
      !keys('pairing.override', 'game.view_own', 'participant.checkin_self').includes(key),
  ),
  org_owner: ORGANIZATION_ADMINISTRATION,
  org_admin: ORGANIZATION_ADMINISTRATION,
  tournament_director: DIRECTION,
  arbiter: keys(
    'organization.view',
    'player.view',
    'participant.checkin_mark',
    'game.record',
    'game.correct',
    'game.forfeit',
    'report.generate',
    'report.download',
    'audit.view',
    'tournament.view_private',
  ),
  captain: keys(
    'organization.view',
    'player.view',
    'player.create',
    'player.update',
    'participant.register',
    'participant.withdraw',
    'team.register',
    'roster.update',
    'lineup.submit',
    'report.download',
    'claim.file',
    'tournament.view_private',
  ),
  player: keys(
    'organization.view',
    'player.link',
    'game.view_own',
    'participant.checkin_self',
    'report.download',
    'claim.file',
    'tournament.view_private',
  ),
};

/**
 * Scopes where a permission can be granted: those of the system roles that hold it by default
 * (`permissions.scope_types`). An organization's own role (US-108) only takes permissions of its scope;
 * account permissions go to no role.
 */
export function permissionScopeTypes(key: PermissionKey): ScopeType[] {
  const roles = ROLE_KEYS.filter((role) => SYSTEM_ROLE_PERMISSIONS[role].includes(key));
  return [...new Set(roles.map((role) => ROLE_SCOPES[role]))];
}
