/**
 * In-memory fake of the Repository interface, for tests. Mirrors the real
 * DynamoDB implementation's behaviour (conditional create, GSI-free reads)
 * without touching the SDK.
 */

import { rankForXp, STARTING_HINT_TOKENS, type ChallengeProgress, type HintTier, type Role, type UserProfile } from '@kirocrew-academy/shared';
import type { LeaderboardRow, Repository } from '../lib/repository.js';

function nowIso(): string {
  return new Date().toISOString();
}

export function createFakeRepository(): Repository {
  const profiles = new Map<string, UserProfile>();
  const challenges = new Map<string, Map<string, ChallengeProgress>>();
  const attemptWindows = new Map<string, Map<string, string>>();
  const revealedHints = new Map<string, Set<HintTier>>();

  function challengeMap(userId: string): Map<string, ChallengeProgress> {
    let m = challenges.get(userId);
    if (!m) {
      m = new Map();
      challenges.set(userId, m);
    }
    return m;
  }

  function attemptMap(userId: string): Map<string, string> {
    let m = attemptWindows.get(userId);
    if (!m) {
      m = new Map();
      attemptWindows.set(userId, m);
    }
    return m;
  }

  function hintSet(userId: string, challengeId: string): Set<HintTier> {
    const key = `${userId}#${challengeId}`;
    let s = revealedHints.get(key);
    if (!s) {
      s = new Set();
      revealedHints.set(key, s);
    }
    return s;
  }

  return {
    async getProfile(userId, email) {
      const existing = profiles.get(userId);
      if (existing) return existing;
      const timestamp = nowIso();
      const fresh: UserProfile = {
        userId,
        email,
        displayName: email.split('@')[0] ?? 'learner',
        role: null,
        xp: 0,
        rankTitle: rankForXp(0),
        hintTokens: STARTING_HINT_TOKENS,
        comboStreak: 0,
        dailyStreakDays: 0,
        lastDailyClaim: null,
        badges: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      profiles.set(userId, fresh);
      return fresh;
    },

    async putProfile(profile) {
      profiles.set(profile.userId, profile);
    },

    async updateProfileFields(userId, patch) {
      const current = profiles.get(userId);
      if (!current) throw new Error(`profile not found for ${userId}`);
      const updated = { ...current, ...patch, updatedAt: nowIso() };
      profiles.set(userId, updated);
      return updated;
    },

    async getChallengeProgress(userId, challengeId) {
      return challengeMap(userId).get(challengeId);
    },

    async getAllChallengeProgress(userId) {
      return Object.fromEntries(challengeMap(userId).entries());
    },

    async putChallengeProgress(userId, progress) {
      challengeMap(userId).set(progress.challengeId, progress);
    },

    async startAttempt(userId, challengeId) {
      const startedAt = nowIso();
      attemptMap(userId).set(challengeId, startedAt);
      return startedAt;
    },

    async getAttemptWindow(userId, challengeId) {
      return attemptMap(userId).get(challengeId);
    },

    async clearAttemptWindow(userId, challengeId) {
      attemptMap(userId).delete(challengeId);
    },

    async getRevealedTiers(userId, challengeId) {
      return [...hintSet(userId, challengeId)];
    },

    async isHintRevealed(userId, challengeId, tier) {
      return hintSet(userId, challengeId).has(tier);
    },

    async markHintRevealed(userId, challengeId, tier) {
      hintSet(userId, challengeId).add(tier);
    },

    async queryLeaderboard(scope, limit) {
      const rows: LeaderboardRow[] = [...profiles.values()]
        .filter((p) => scope === 'all' || p.role === (scope as Role))
        .sort((a, b) => b.xp - a.xp)
        .slice(0, limit)
        .map((p) => ({ userId: p.userId, displayName: p.displayName, xp: p.xp, rankTitle: p.rankTitle, role: p.role }));
      return rows;
    },
  };
}
