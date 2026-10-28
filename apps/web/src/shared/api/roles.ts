import type { RoleKey, ScopeType } from '@torre/contracts';

/** The i18n key of a role's name: `roles.<key>` (US-023:AC3, GLOSSARY.md §5). */
export const roleLabelKey = (role: RoleKey): string => `roles.${role}`;

/** The i18n key of a scope's name: `scopes.<SCOPE>` (US-023:AC3, AUTHORIZATION.md §2). */
export const scopeLabelKey = (scope: ScopeType): string => `scopes.${scope}`;
