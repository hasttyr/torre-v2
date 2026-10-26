import { describe, expect, it } from 'vitest';
import { canApprove, listUnconfirmedFields } from './lifecycle.js';
import { ASCUN_CHESS_BLITZ, ASCUN_CHESS_CLASSICAL, DEMO_ROUND_ROBIN, FIDE_DUTCH_2026, PRESETS } from './presets.js';
import { validateRuleSet } from './validate.js';

describe('platform presets (US-010:AC4)', () => {
  it.each(PRESETS.map((p) => [p.key, p] as const))(
    '[US-010:AC4][TC-005] should keep %s valid as a DRAFT platform preset',
    (_key, preset) => {
      const result = validateRuleSet(preset, { scope: 'PLATFORM' });

      expect(result.ok, JSON.stringify(result.ok ? null : result.error.details)).toBe(true);
      expect(preset.status).toBe('DRAFT');
      expect(preset.organizationId).toBeNull();
    },
  );

  it('[US-010:AC4][TC-005][BR-GEN-04] should never let the ASCUN presets be approved while OQ-001 and OQ-023 are open', () => {
    for (const preset of [ASCUN_CHESS_CLASSICAL, ASCUN_CHESS_BLITZ]) {
      const pending = listUnconfirmedFields(preset);

      expect(canApprove(preset)).toBe(false);
      expect(pending.find((f) => f.path === 'tiebreaks')).toMatchObject({ status: 'MISSING', question: 'OQ-023' });
      expect(pending.find((f) => f.path === 'scoring.win')).toMatchObject({
        status: 'UNCONFIRMED',
        source: 'SRC-01 Art. 9',
        question: 'OQ-001',
      });
      expect(preset.tiebreaks).toBeUndefined();
    }
  });

  it('[US-010:AC4] should take every ASCUN 2012 value from SOURCES.md §3 with its article', () => {
    expect(ASCUN_CHESS_CLASSICAL).toMatchObject({
      system: 'SWISS',
      roundsPolicy: { kind: 'FIXED', rounds: 6 },
      gamesPerPairing: 1,
      scoring: { win: 2, draw: 1, loss: 0, halfPointBye: 1 },
      requestedByes: { allowed: true, kind: 'HALF_POINT', allowedRounds: [1], requiresJustification: true },
      entryQuota: { perNode: { male: 6, female: 5 } },
      timeControl: { modality: 'CLASSICAL', baseMinutes: 90, incrementSeconds: 30, forfeitToleranceMinutes: 0 },
      schedule: { maxRoundsPerDay: 2 },
      seeding: { order: ['FIDE_RATING', 'NATIONAL_RATING'] },
    });
    expect(ASCUN_CHESS_BLITZ).toMatchObject({
      roundsPolicy: { kind: 'FIXED', rounds: 6 },
      gamesPerPairing: 2,
      requestedByes: { allowed: false },
      timeControl: { modality: 'BLITZ', baseMinutes: 3, incrementSeconds: 2, forfeitToleranceMinutes: 0 },
    });
    for (const [path, entry] of Object.entries(ASCUN_CHESS_CLASSICAL.provenance)) {
      if (entry.status !== 'CONFIRMED') expect(entry.source ?? entry.question, path).toBeTruthy();
    }
  });

  it('[US-010:AC4][BR-GEN-03] should not invent what FIDE leaves to each tournament', () => {
    const pending = listUnconfirmedFields(FIDE_DUTCH_2026).map((f) => f.path);

    expect(FIDE_DUTCH_2026.roundsPolicy).toBeUndefined();
    expect(FIDE_DUTCH_2026.tiebreaks).toBeUndefined();
    expect(pending).toEqual(expect.arrayContaining(['roundsPolicy', 'tiebreaks', 'corrections.noticeDeadline']));
    expect(FIDE_DUTCH_2026.scoring).toEqual({
      win: 2,
      draw: 1,
      loss: 0,
      forfeitWin: 2,
      forfeitLoss: 0,
      doubleForfeit: 0,
      pairingBye: 2,
      halfPointBye: 1,
      zeroPointBye: 0,
    });
  });

  it('[US-010:AC4][BR-GEN-03] should mark the demo preset as demo, with its proposed values unconfirmed', () => {
    expect(DEMO_ROUND_ROBIN.demo).toBe(true);
    expect(canApprove(DEMO_ROUND_ROBIN)).toBe(false);
    expect(DEMO_ROUND_ROBIN.provenance['tiebreaks']?.status).toBe('UNCONFIRMED');
  });
});
