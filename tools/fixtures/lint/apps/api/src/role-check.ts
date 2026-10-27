// Lint fixture (TC-064, CLAUDE.md rule 13): decisions taken from the name of a role.
export function canCorrect(role: string): boolean {
  if (role === 'arbiter') return true;
  switch (role) {
    case 'org_owner':
      return true;
    default:
      return 'platform_admin' == role;
  }
}

// Defining roles is fine.
export const SYSTEM_ROLES = ['org_owner', 'arbiter'] as const;
