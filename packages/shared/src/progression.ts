/**
 * Progression rules: what is unlocked, what counts as mastered, which badges fire.
 * Pure functions over a progress snapshot so the API stays authoritative and the
 * client can render locks without a round trip.
 */

import type {
  Badge,
  ChallengeProgress,
  PublicWorld,
  TopicProgress,
  World,
  WorldProgress,
} from './types.js';

/** Mastery percentage a world needs before the next world opens. */
export const WORLD_UNLOCK_THRESHOLD = 0.8;

/** World whose boss unlocks the free-play sandbox. */
export const SANDBOX_UNLOCK_WORLD = 'w3';

/** Hint tokens granted at signup. */
export const STARTING_HINT_TOKENS = 5;

/** Hint tokens granted for each world boss defeated. */
export const HINT_TOKENS_PER_WORLD = 3;

/** Hint tokens granted for a daily streak claim. */
export const HINT_TOKENS_PER_DAILY = 1;

type WorldLike = World | PublicWorld;

/**
 * Recomputes the whole progression tree from the raw per-challenge records.
 * Always derive state this way instead of mutating flags, so a content change
 * (a new challenge in an old topic) re-locks correctly on the next read.
 */
export function computeProgress(
  worlds: WorldLike[],
  challenges: Record<string, ChallengeProgress>,
): WorldProgress[] {
  const ordered = [...worlds].sort((a, b) => a.order - b.order);
  const result: WorldProgress[] = [];
  let previousMasteryPct = 1; // The first world is always open.

  for (const world of ordered) {
    const worldUnlocked = previousMasteryPct >= WORLD_UNLOCK_THRESHOLD;

    const topics: TopicProgress[] = [];
    let masteredTotal = 0;
    let challengeTotal = 0;
    let previousTopicComplete = true;

    const regularTopics = world.topics;

    for (const topic of regularTopics) {
      const ids = topic.challenges.map((c) => c.id);
      const bossIds = topic.challenges.filter((c) => c.boss).map((c) => c.id);
      const nonBossIds = ids.filter((id) => !bossIds.includes(id));

      const masteredCount = ids.filter((id) => challenges[id]?.mastered).length;
      const nonBossMastered = nonBossIds.filter((id) => challenges[id]?.mastered).length;

      // A topic opens when the world is open and the previous topic is complete.
      const unlocked = worldUnlocked && previousTopicComplete;
      const complete = ids.length > 0 && masteredCount === ids.length;

      topics.push({
        topicId: topic.id,
        unlocked,
        masteredCount,
        total: ids.length,
        complete,
      });

      masteredTotal += masteredCount;
      challengeTotal += ids.length;
      previousTopicComplete = complete;

      // Keep the linter honest about the unused split, it documents intent.
      void nonBossMastered;
    }

    const masteryPct = challengeTotal === 0 ? 0 : masteredTotal / challengeTotal;
    const bossIds = world.topics.flatMap((t) => t.challenges.filter((c) => c.boss).map((c) => c.id));
    const bossDefeated = bossIds.length > 0 && bossIds.every((id) => challenges[id]?.mastered);

    result.push({
      worldId: world.id,
      unlocked: worldUnlocked,
      masteryPct: Number(masteryPct.toFixed(4)),
      bossDefeated,
      topics,
    });

    previousMasteryPct = masteryPct;
  }

  return result;
}

/**
 * The boss challenge of a world stays locked until every non-boss challenge in
 * that world is mastered. Topic unlocking alone is not enough.
 */
export function isBossUnlocked(world: WorldLike, challenges: Record<string, ChallengeProgress>): boolean {
  const nonBoss = world.topics.flatMap((t) => t.challenges.filter((c) => !c.boss).map((c) => c.id));
  return nonBoss.length > 0 && nonBoss.every((id) => challenges[id]?.mastered);
}

export function isChallengeUnlocked(
  worlds: WorldLike[],
  challengeId: string,
  challenges: Record<string, ChallengeProgress>,
): boolean {
  const world = worlds.find((w) => w.topics.some((t) => t.challenges.some((c) => c.id === challengeId)));
  if (!world) return false;
  const topic = world.topics.find((t) => t.challenges.some((c) => c.id === challengeId));
  if (!topic) return false;
  const challenge = topic.challenges.find((c) => c.id === challengeId);
  if (!challenge) return false;

  const progress = computeProgress(worlds, challenges);
  const worldProgress = progress.find((w) => w.worldId === world.id);
  const topicProgress = worldProgress?.topics.find((t) => t.topicId === topic.id);

  if (!worldProgress?.unlocked || !topicProgress?.unlocked) return false;
  if (challenge.boss) return isBossUnlocked(world, challenges);
  return true;
}

export function isSandboxUnlocked(progress: WorldProgress[]): boolean {
  return progress.find((w) => w.worldId === SANDBOX_UNLOCK_WORLD)?.bossDefeated ?? false;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  /** Returns true when the learner has just earned the badge. */
  test: (ctx: BadgeContext) => boolean;
}

export interface BadgeContext {
  worlds: WorldLike[];
  progress: WorldProgress[];
  challenges: Record<string, ChallengeProgress>;
  xp: number;
  comboStreak: number;
  dailyStreakDays: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-light',
    title: 'First Light',
    description: 'Master your first challenge.',
    test: (c) => Object.values(c.challenges).some((p) => p.mastered),
  },
  {
    id: 'no-hints-world',
    title: 'Unassisted',
    description: 'Complete an entire world without revealing a single hint.',
    test: (c) =>
      c.progress.some((wp) => {
        if (wp.masteryPct < 1) return false;
        const world = c.worlds.find((w) => w.id === wp.worldId);
        if (!world) return false;
        return world.topics
          .flatMap((t) => t.challenges.map((ch) => ch.id))
          .every((id) => (c.challenges[id]?.hintsUsed ?? 0) === 0);
      }),
  },
  {
    id: 'flawless-boss',
    title: 'Flawless Boss',
    description: 'Beat a world boss on the first attempt.',
    test: (c) =>
      c.worlds
        .flatMap((w) => w.topics.flatMap((t) => t.challenges.filter((ch) => ch.boss)))
        .some((ch) => c.challenges[ch.id]?.firstTryCorrect === true),
  },
  {
    id: 'combo-ten',
    title: 'On a Roll',
    description: 'Reach a ten answer combo streak.',
    test: (c) => c.comboStreak >= 10,
  },
  {
    id: 'cron-whisperer',
    title: 'Cron Whisperer',
    description: 'Master every challenge in the scheduling world.',
    test: (c) => (c.progress.find((w) => w.worldId === 'w3')?.masteryPct ?? 0) >= 1,
  },
  {
    id: 'delegator',
    title: 'Delegator',
    description: 'Master every challenge in the delegation world.',
    test: (c) => (c.progress.find((w) => w.worldId === 'w4')?.masteryPct ?? 0) >= 1,
  },
  {
    id: 'conductor',
    title: 'Conductor',
    description: 'Master every challenge in the orchestration world.',
    test: (c) => (c.progress.find((w) => w.worldId === 'w5')?.masteryPct ?? 0) >= 1,
  },
  {
    id: 'week-streak',
    title: 'Seven Day Watch',
    description: 'Claim a daily streak seven days in a row.',
    test: (c) => c.dailyStreakDays >= 7,
  },
  {
    id: 'crew-master',
    title: 'Crew Master',
    description: 'Master every challenge in every world.',
    test: (c) => c.progress.length > 0 && c.progress.every((w) => w.masteryPct >= 1),
  },
];

/** Returns the badges newly earned, excluding those already held. */
export function evaluateBadges(ctx: BadgeContext, earned: Badge[]): Badge[] {
  const held = new Set(earned.map((b) => b.id));
  const now = new Date().toISOString();
  return BADGE_DEFINITIONS.filter((def) => !held.has(def.id) && def.test(ctx)).map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    earnedAt: now,
  }));
}
