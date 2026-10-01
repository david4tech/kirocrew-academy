import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { computeScore } from '@kirocrew-academy/shared';
import { useScorePreview } from './useScorePreview';

describe('useScorePreview', () => {
  it('matches computeScore for a fully correct answer with no elapsed time yet', () => {
    const input = {
      kind: 'single-choice' as const,
      difficulty: 'easy' as const,
      boss: false,
      firstAttempt: true,
      comboStreak: 0,
      hintsUsed: 0,
      targetSeconds: 30,
      startedAt: null,
    };
    const { result } = renderHook(() => useScorePreview(input));
    const expected = computeScore({ ...input, elapsedSeconds: 0, correctnessRatio: 1 });
    expect(result.current.points).toBe(expected.points);
    expect(result.current.base).toBe(expected.base);
  });

  it('applies the boss base score when boss is true', () => {
    const input = {
      kind: 'simulation' as const,
      difficulty: 'hard' as const,
      boss: true,
      firstAttempt: false,
      comboStreak: 3,
      hintsUsed: 1,
      targetSeconds: 150,
      startedAt: null,
    };
    const { result } = renderHook(() => useScorePreview(input));
    const expected = computeScore({ ...input, elapsedSeconds: 0, correctnessRatio: 1 });
    expect(result.current.points).toBe(expected.points);
    expect(result.current.base).toBe(500);
  });

  it('reduces the preview as hints are used, matching the shared hint penalty table', () => {
    const base = {
      kind: 'debug-fix' as const,
      difficulty: 'medium' as const,
      boss: false,
      firstAttempt: true,
      comboStreak: 0,
      targetSeconds: 60,
      startedAt: null,
    };
    const noHints = renderHook(() => useScorePreview({ ...base, hintsUsed: 0 })).result.current;
    const twoHints = renderHook(() => useScorePreview({ ...base, hintsUsed: 2 })).result.current;
    expect(twoHints.points).toBeLessThan(noHints.points);
  });
});
