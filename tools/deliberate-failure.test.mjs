// Deliberate failure (US-004, required tests): proves that branch protection blocks a red PR.
// This branch is never merged; its pull request is closed once the block is recorded.
import { describe, expect, it } from 'vitest';

describe('deliberate failure', () => {
  it('[US-004:AC5] should fail on purpose so main protection blocks the merge', () => {
    expect(1 + 1).toBe(3);
  });
});
