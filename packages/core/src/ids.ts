/** A string that the type system keeps apart from other strings (CONVENTIONS.md §2). */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrganizationId = Brand<string, 'OrganizationId'>;
export type InstitutionId = Brand<string, 'InstitutionId'>;
export type TournamentId = Brand<string, 'TournamentId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type TeamId = Brand<string, 'TeamId'>;
/** Who competes: a player in individual events, a team in team events (BR-TEAM-08). */
export type CompetitorId = Brand<string, 'CompetitorId'>;
export type GameId = Brand<string, 'GameId'>;

/** Identifiers come from trusted sources (UUID v7, DEC-026); they only need to be non-empty. */
function brand<B extends string>(kind: B) {
  return (value: string): Brand<string, B> => {
    if (value.trim() === '') throw new RangeError(`${kind} must not be empty`);
    return value as Brand<string, B>;
  };
}

export const organizationId = brand('OrganizationId');
export const institutionId = brand('InstitutionId');
export const tournamentId = brand('TournamentId');
export const playerId = brand('PlayerId');
export const teamId = brand('TeamId');
export const competitorId = brand('CompetitorId');
export const gameId = brand('GameId');
