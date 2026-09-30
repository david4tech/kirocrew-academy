/**
 * Scoring engine. Deterministic and pure so the API can be the sole authority
 * while the client reuses the same maths to preview a potential score.
 */

import {
  type ChallengeKind,
  type Difficulty,
  type HintTier,
  type RankTitle,
  type ScoreBreakdown,
  type ScoreInput,
  RANKS,
} from './types.js';

export const BASE_POINTS: Record<ChallengeKind, number> = {
  'single-choice': 100,
  'true-false': 100,
  matching: 150,
  'multi-choice': 150,
  'tool-name': 200,
  'config-fill': 200,
  sequence: 200,
  'debug-fix': 250,
  simulation: 300,
};

export const BOSS_BASE_POINTS = 500;

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

/** Point penalty by number of hint tiers revealed (index 0 means no hints). */
export const HINT_PENALTY_BY_TIER: readonly number[] = [0, 0.1, 0.25, 0.5];

export const FIRST_TRY_BONUS = 0.25;
export const STREAK_STEP = 0.1;
export const STREAK_CAP = 0.5;
export const SPEED_BONUS_MAX = 0.2;

/** A correct answer never scores below this fraction of its raw value. */
export const MIN_MULTIPLIER = 0.25;

/** Below this ratio a multi-field answer scores nothing at all. */
export const PARTIAL_CREDIT_FLOOR = 0.5;

/** Partial answers are worth half of their proportional value. */
export const PARTIAL_CREDIT_FACTOR = 0.5;

export function hintPenalty(hintsUsed: number): number {
  const idx = Math.max(0, Math.min(HINT_PENALTY_BY_TIER.length - 1, hintsUsed));
  return HINT_PENALTY_BY_TIER[idx];
}

export function streakBonus(comboStreak: number): number {
  return Math.min(Math.max(comboStreak, 0) * STREAK_STEP, STREAK_CAP);
}

/**
 * Speed bonus decays linearly from the full bonus at instant answers to zero at
 * the target time. Answering slower than the target simply earns nothing.
 */
export function speedBonus(elapsedSeconds: number, targetSeconds: number): number {
  if (targetSeconds <= 0) return 0;
  const elapsed = Math.max(0, elapsedSeconds);
  if (elapsed >= targetSeconds) return 0;
  return Number((SPEED_BONUS_MAX * (1 - elapsed / targetSeconds)).toFixed(4));
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const base = input.boss ? BOSS_BASE_POINTS : BASE_POINTS[input.kind];
  const difficultyMultiplier = DIFFICULTY_MULTIPLIER[input.difficulty];
  const ratio = clamp01(input.correctnessRatio);

  const firstTry = input.firstAttempt && ratio === 1 ? FIRST_TRY_BONUS : 0;
  const streak = ratio === 1 ? streakBonus(input.comboStreak) : 0;
  const speed = ratio === 1 ? speedBonus(input.elapsedSeconds, input.targetSeconds) : 0;
  const penalty = hintPenalty(input.hintsUsed);

  const rawMultiplier = 1 + firstTry + streak + speed - penalty;
  const finalMultiplier = Math.max(rawMultiplier, MIN_MULTIPLIER);

  let points = 0;
  if (ratio === 1) {
    points = Math.round(base * difficultyMultiplier * finalMultiplier);
  } else if (ratio >= PARTIAL_CREDIT_FLOOR) {
    points = Math.round(base * difficultyMultiplier * finalMultiplier * ratio * PARTIAL_CREDIT_FACTOR);
  }

  return {
    base,
    difficultyMultiplier,
    firstTryBonus: firstTry,
    streakBonus: streak,
    speedBonus: speed,
    hintPenalty: penalty,
    correctnessRatio: ratio,
    finalMultiplier: Number(finalMultiplier.toFixed(4)),
    points,
  };
}

/** Cumulative point penalty a learner has locked in on the current challenge. */
export function penaltyForRevealedTiers(tiers: HintTier[]): number {
  return hintPenalty(new Set(tiers).size);
}

export function rankForXp(xp: number): RankTitle {
  let title: RankTitle = RANKS[0].title;
  for (const rank of RANKS) {
    if (xp >= rank.minXp) title = rank.title;
  }
  return title;
}

export function xpToNextRank(xp: number): { next: RankTitle | null; remaining: number; pct: number } {
  const current = rankForXp(xp);
  const idx = RANKS.findIndex((r) => r.title === current);
  const next = RANKS[idx + 1];
  if (!next) return { next: null, remaining: 0, pct: 1 };
  const floor = RANKS[idx].minXp;
  const span = next.minXp - floor;
  return {
    next: next.title,
    remaining: next.minXp - xp,
    pct: span > 0 ? clamp01((xp - floor) / span) : 1,
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
