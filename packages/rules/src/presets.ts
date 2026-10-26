import type { ProvenanceEntry, RuleSet } from './schema.js';

/**
 * Platform presets (US-010:AC4, DEC-047). Every value cites its source in `provenance`: confirmed values
 * come from a current official text, `[ASCUN-2012]` values stay unconfirmed until OQ-001, and values no
 * source fixes are MISSING instead of being invented (CLAUDE.md rule 1, BR-GEN-03). All are DRAFT.
 */

const confirmed = (source: string, note?: string): ProvenanceEntry => ({
  status: 'CONFIRMED',
  source,
  ...(note === undefined ? {} : { note }),
});
const ascun2012 = (article: string, note?: string): ProvenanceEntry => ({
  status: 'UNCONFIRMED',
  source: `SRC-01 ${article}`,
  question: 'OQ-001',
  ...(note === undefined ? {} : { note }),
});
const missing = (question: string | undefined, note: string): ProvenanceEntry => ({
  status: 'MISSING',
  ...(question === undefined ? {} : { question }),
  note,
});

/** Laws of Chess Art. 10.1 (SRC-15): win or forfeit win 1, loss or forfeit 0, draw ½ — in half-point units. */
const LAWS_OF_CHESS_SCORING: RuleSet['scoring'] = {
  win: 2,
  draw: 1,
  loss: 0,
  forfeitWin: 2,
  forfeitLoss: 0,
  doubleForfeit: 0,
  pairingBye: 2,
  halfPointBye: 1,
  zeroPointBye: 0,
};

export const FIDE_DUTCH_2026: RuleSet = {
  key: 'fide-dutch-2026',
  version: 1,
  status: 'DRAFT',
  organizationId: null,
  demo: false,
  source: {
    authority: 'FIDE',
    document: 'FIDE Handbook: C.04.1, C.04.2 y C.04.3 (Dutch), C.07 y Leyes del Ajedrez',
    documentVersion: 'C.04 2026-02-01; C.07 2026-03-01; Leyes 2023-01-01',
    url: 'https://handbook.fide.com/chapter/C0403202602',
    retrievedAt: '2026-10-26',
    sourceId: 'SRC-05',
  },
  provenance: {
    format: confirmed('SRC-05', 'Sistema individual'),
    system: confirmed('SRC-05'),
    roundsPolicy: missing(undefined, 'Cada torneo declara su número de rondas antes de empezar (SRC-11 Art. 1)'),
    gamesPerPairing: confirmed('SRC-11'),
    'scoring.win': confirmed('SRC-15 Art. 10.1'),
    'scoring.draw': confirmed('SRC-15 Art. 10.1'),
    'scoring.loss': confirmed('SRC-15 Art. 10.1'),
    'scoring.forfeitWin': confirmed('SRC-15 Art. 10.1'),
    'scoring.forfeitLoss': confirmed('SRC-15 Art. 10.1'),
    'scoring.doubleForfeit': confirmed('SRC-15 Art. 10.1', 'Quien pierde por forfeit no suma'),
    'scoring.pairingBye': confirmed('SRC-11 Art. 3', 'Los puntos de una victoria, salvo regla del torneo'),
    'scoring.halfPointBye': confirmed('SRC-04 Art. 16.1.1'),
    'scoring.zeroPointBye': confirmed('SRC-04 Art. 16.1.1'),
    requestedByes: {
      status: 'UNCONFIRMED',
      note: 'FIDE no regula los byes solicitados: los fija el reglamento de cada torneo',
    },
    'swiss.variant': confirmed('SRC-05'),
    'swiss.ruleVersion': confirmed('SRC-05', 'Aplicado desde el 2026-02-01'),
    'swiss.initialColour': confirmed('SRC-05 Art. 5.1'),
    tiebreaks: missing(undefined, 'El organizador elige la lista (SRC-04 Art. 4.1)'),
    'tiebreakPolicy.unplayedRounds': confirmed('SRC-04 Arts. 15–16'),
    'tiebreakPolicy.restartOnPartialSplit': confirmed('SRC-04 Art. 4.2'),
    'tiebreakPolicy.unresolved': confirmed('SRC-04 Art. 4.2', 'Agotada la lista, se sortea'),
    'eligibility.mode': { status: 'UNCONFIRMED', note: 'Lo define cada competencia' },
    'seeding.order': confirmed('SRC-12 Arts. 2.1–2.2'),
    'corrections.noticeDeadline': missing(
      undefined,
      'Se fija de antemano según el calendario del torneo (SRC-12 Art. 4.3)',
    ),
    'rating.computePlatformElo': confirmed('DEC-049'),
    'rating.initialRating': confirmed('DEC-070'),
  },
  format: 'INDIVIDUAL',
  system: 'SWISS',
  gamesPerPairing: 1,
  scoring: LAWS_OF_CHESS_SCORING,
  requestedByes: { allowed: false, requiresJustification: false },
  swiss: { variant: 'FIDE_DUTCH', ruleVersion: '2026-02-01', initialColour: 'DRAW_LOTS' },
  tiebreakPolicy: { unplayedRounds: 'FIDE_C07_2026', restartOnPartialSplit: false, unresolved: 'DRAW_LOTS' },
  eligibility: { mode: 'NONE' },
  seeding: { order: ['FIDE_RATING'] },
  corrections: {},
  rating: { computePlatformElo: true, initialRating: 1500 },
};

export const DEMO_ROUND_ROBIN: RuleSet = {
  key: 'demo-round-robin',
  version: 1,
  status: 'DRAFT',
  organizationId: null,
  demo: true,
  source: {
    authority: 'Torre',
    document: 'Preset de demostración: no rige torneos oficiales (BR-GEN-03)',
    sourceId: 'SRC-15',
  },
  provenance: {
    'scoring.win': confirmed('SRC-15 Art. 10.1'),
    'scoring.draw': confirmed('SRC-15 Art. 10.1'),
    'scoring.loss': confirmed('SRC-15 Art. 10.1'),
    tiebreaks: { status: 'UNCONFIRMED', note: 'Lista de demostración' },
    'tiebreakPolicy.unplayedRounds': confirmed('SRC-04 Art. 15.2'),
    'tiebreakPolicy.unresolved': { status: 'UNCONFIRMED', note: 'Valor de demostración' },
    'seeding.order': { status: 'UNCONFIRMED', note: 'Valor de demostración' },
  },
  format: 'INDIVIDUAL',
  system: 'ROUND_ROBIN',
  roundsPolicy: { kind: 'ALL_PLAY_ALL' },
  gamesPerPairing: 1,
  scoring: LAWS_OF_CHESS_SCORING,
  requestedByes: { allowed: false, requiresJustification: false },
  tiebreaks: [{ id: 'DIRECT_ENCOUNTER' }, { id: 'SONNEBORN_BERGER' }, { id: 'WIN' }],
  tiebreakPolicy: { unplayedRounds: 'FIDE_C07_2026', restartOnPartialSplit: false, unresolved: 'SHARE_RANK' },
  eligibility: { mode: 'NONE' },
  seeding: { order: ['PLATFORM_RATING'] },
  corrections: {},
  rating: { computePlatformElo: false, initialRating: 1500 },
};

const ASCUN_SOURCE: RuleSet['source'] = {
  authority: 'ASCUN Deportes',
  document:
    'Reglamentos Técnicos por Disciplina Deportiva, Juegos Universitarios Nacionales — Reglamento Técnico de Ajedrez',
  documentVersion: '2012-10',
  url: 'https://caribe2014.ascundeportes.org/uploads/item/1-Consolidado%20Reglamentos%20Deportivos%20ASCUN-Deportes%20pdf.pdf',
  retrievedAt: '2026-10-25',
  sourceId: 'SRC-01',
};

/** Values shared by both ASCUN presets, all from the 2012 text or FIDE as its supplementary rule (Art. 21). */
const ascunCommon = {
  organizationId: null,
  demo: false,
  source: ASCUN_SOURCE,
  format: 'INDIVIDUAL',
  system: 'SWISS',
  scoring: LAWS_OF_CHESS_SCORING,
  swiss: { variant: 'FIDE_DUTCH', ruleVersion: '2026-02-01', initialColour: 'DRAW_LOTS' },
  tiebreakPolicy: { unplayedRounds: 'FIDE_C07_2026', restartOnPartialSplit: false },
  eligibility: { mode: 'EXTERNAL_VERIFICATION' },
  seeding: { order: ['FIDE_RATING', 'NATIONAL_RATING'] },
  corrections: {},
  rating: { computePlatformElo: true, initialRating: 1500 },
} as const satisfies Partial<RuleSet>;

const ascunCommonProvenance: Record<string, ProvenanceEntry> = {
  system: ascun2012('Art. 2'),
  'scoring.win': ascun2012('Art. 9'),
  'scoring.draw': ascun2012('Art. 9'),
  'scoring.loss': ascun2012('Art. 9'),
  'scoring.forfeitWin': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-15 Art. 10.1)'),
  'scoring.forfeitLoss': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-15 Art. 10.1)'),
  'scoring.doubleForfeit': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-15 Art. 10.1)'),
  'scoring.pairingBye': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-11 Art. 3)'),
  'scoring.halfPointBye': ascun2012('Art. 11'),
  'scoring.zeroPointBye': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-04 Art. 16.1.1)'),
  'swiss.variant': ascun2012('Art. 5', 'Swiss Perfect o Swiss Manager → FIDE Dutch (DEC-043)'),
  'swiss.ruleVersion': ascun2012('Art. 5', 'Versión vigente de FIDE (SRC-05)'),
  'swiss.initialColour': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-05 Art. 5.1)'),
  tiebreaks: {
    status: 'MISSING',
    source: 'SRC-01 Art. 13',
    question: 'OQ-023',
    note: '"De acuerdo con las características técnicas del software"',
  },
  'tiebreakPolicy.unplayedRounds': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-04 Art. 16)'),
  'tiebreakPolicy.restartOnPartialSplit': ascun2012('Art. 21', 'FIDE como norma supletoria (SRC-04 Art. 4.2)'),
  'tiebreakPolicy.unresolved': {
    status: 'MISSING',
    question: 'OQ-023',
    note: 'ASCUN no dice si los empates finales se comparten o se sortean',
  },
  'eligibility.mode': confirmed('SRC-02 Arts. 12–16', 'Verificación externa (DEC-048)'),
  'seeding.order': ascun2012('Art. 15'),
  'rating.computePlatformElo': confirmed('DEC-049'),
  'rating.initialRating': confirmed('DEC-070'),
};

export const ASCUN_CHESS_CLASSICAL: RuleSet = {
  ...ascunCommon,
  key: 'ascun-chess-classical',
  version: 1,
  status: 'DRAFT',
  provenance: {
    ...ascunCommonProvenance,
    roundsPolicy: ascun2012('Art. 6'),
    gamesPerPairing: ascun2012('Art. 6'),
    requestedByes: ascun2012(
      'Art. 11',
      'Solo bye de medio punto en la primera ronda de Clásico, por caso fortuito comprobado',
    ),
    'entryQuota.perNode': ascun2012('Art. 4'),
    timeControl: ascun2012('Arts. 6 y 10', '90 min + 30 s por jugada; W.O. con 0 minutos de espera'),
    'schedule.maxRoundsPerDay': ascun2012('Art. 14'),
  },
  roundsPolicy: { kind: 'FIXED', rounds: 6 },
  gamesPerPairing: 1,
  requestedByes: { allowed: true, kind: 'HALF_POINT', allowedRounds: [1], requiresJustification: true },
  entryQuota: { perNode: { male: 6, female: 5 } },
  timeControl: { modality: 'CLASSICAL', baseMinutes: 90, incrementSeconds: 30, forfeitToleranceMinutes: 0 },
  schedule: { maxRoundsPerDay: 2 },
};

export const ASCUN_CHESS_BLITZ: RuleSet = {
  ...ascunCommon,
  key: 'ascun-chess-blitz',
  version: 1,
  status: 'DRAFT',
  provenance: {
    ...ascunCommonProvenance,
    roundsPolicy: ascun2012('Art. 7'),
    gamesPerPairing: ascun2012(
      'Art. 7',
      'Doble partida con colores invertidos; cada partida puntúa (OQ-025, decisión de producto)',
    ),
    requestedByes: ascun2012('Art. 11', 'El bye solicitado solo existe en Clásico'),
    timeControl: ascun2012('Arts. 7 y 10', '3 min + 2 s por jugada; W.O. con 0 minutos de espera'),
  },
  roundsPolicy: { kind: 'FIXED', rounds: 6 },
  gamesPerPairing: 2,
  requestedByes: { allowed: false, requiresJustification: false },
  timeControl: { modality: 'BLITZ', baseMinutes: 3, incrementSeconds: 2, forfeitToleranceMinutes: 0 },
};

export const PRESETS: readonly RuleSet[] = [
  FIDE_DUTCH_2026,
  DEMO_ROUND_ROBIN,
  ASCUN_CHESS_CLASSICAL,
  ASCUN_CHESS_BLITZ,
];
