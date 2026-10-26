// Must fail: explicit any (CLAUDE.md rule 3).
export const parse = (value: any): unknown => value;
