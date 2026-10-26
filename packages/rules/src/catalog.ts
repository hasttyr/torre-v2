/**
 * Tie-break catalogue of the RuleSet (BR-TIE-02), aligned with FIDE C.07 2026 (SRC-04). The definitions
 * and their calculation live in @torre/standings (US-013); this file only names what a RuleSet may list.
 */
export const TIEBREAK_IDS = [
  'WIN', // WIN, Art. 7.1
  'WON', // WON, Art. 7.2
  'BUCHHOLZ', // BH, Art. 8.1
  'BUCHHOLZ_CUT1', // BH-C1, Art. 14.1
  'BUCHHOLZ_CUT2', // BH-C2, Art. 14.2
  'BUCHHOLZ_MEDIAN1', // BH-M1, Art. 14.3
  'FORE_BUCHHOLZ', // FB, Art. 8.3
  'AVG_OPP_BUCHHOLZ', // AOB, Art. 8.2
  'SONNEBORN_BERGER', // SB, Art. 9.1
  'KOYA', // KS, Art. 9.2
  'PROGRESSIVE', // PS, Art. 7.5
  'DIRECT_ENCOUNTER', // DE, Art. 6
  'BLACK_GAMES', // BPG, Art. 7.3
  'BLACK_WINS', // BWG, Art. 7.4
  'ELECTED_ROUNDS', // REP, Art. 7.6
  'STANDARD_POINTS', // STD, Art. 7.7
  'AVG_OPPONENT_RATING', // ARO, Art. 10.1
  'TPR', // TPR, Art. 10.2
  'APRO', // APRO, Art. 10.4
  'APPO', // APPO, Art. 10.5
  'PTP', // PTP, Art. 10.3
] as const;
export type TiebreakId = (typeof TIEBREAK_IDS)[number];

/** Team-specific tie-breaks (C.07 Arts. 12–13); team events may also list the individual ones (Art. 13). */
export const TEAM_TIEBREAK_IDS = [
  'MPVGP', // Art. 13.1
  'EMMSB', // Art. 13.2.1
  'EMGSB', // Art. 13.2.2
  'EGMSB', // Art. 13.2.3
  'EGGSB', // Art. 13.2.4
  'EDE', // Art. 13.3
  'SSSC', // Art. 13.4
  'BOARD_COUNT', // BC, Art. 12.1
  'TOP_BOARD_RESULTS', // TBR, Art. 12.2
  'BOTTOM_BOARD_ELIMINATION', // BBE, Art. 12.3
] as const;
export type TeamTiebreakId = (typeof TEAM_TIEBREAK_IDS)[number];

/** Modifiers of C.07 Art. 14.1–14.4. */
export const TIEBREAK_MODIFIERS = ['CUT1', 'CUT2', 'MEDIAN1', 'MEDIAN2'] as const;
export type TiebreakModifier = (typeof TIEBREAK_MODIFIERS)[number];

/** Sum-based tie-breaks that Art. 14 lets a modifier apply to (14.1.1 names BH, ARO, PS and SB). */
export const MODIFIABLE_TIEBREAKS: readonly TiebreakId[] = [
  'BUCHHOLZ',
  'FORE_BUCHHOLZ',
  'SONNEBORN_BERGER',
  'PROGRESSIVE',
  'AVG_OPPONENT_RATING',
];

/** Type A tie-breaks may appear several times in the list (C.07 Art. 4.3). */
export const MULTI_LISTABLE_TIEBREAKS: readonly (TiebreakId | TeamTiebreakId)[] = ['DIRECT_ENCOUNTER', 'EDE'];
