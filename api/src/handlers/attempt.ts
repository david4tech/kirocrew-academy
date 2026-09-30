/**
 * POST /challenges/{id}/start opens the attempt window.
 * POST /challenges/{id}/attempt is the scoring authority. Both routes are
 * served by this file: the CDK stack points both at handler, and we dispatch
 * on the raw path suffix.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  API_ERROR_CODES,
  HINT_TOKENS_PER_WORLD,
  computeProgress,
  computeScore,
  evaluateBadges,
  gradeAnswer,
  isChallengeUnlocked,
  isSandboxUnlocked,
  rankForXp,
  type AnswerPayload,
  type ChallengeProgress,
  type StartAttemptResponse,
  type SubmitAttemptResponse,
  type UnlockEvent,
} from '@kirocrew-academy/shared';
import { answerSchemaFor } from '../lib/answer-schema.js';
import { ApiError, ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository, type Repository } from '../lib/repository.js';
import { findChallenge, getWorldsForProgression } from '../lib/content.js';
import { parseJsonBody, pathParam } from '../lib/request.js';

function isStartRoute(event: APIGatewayProxyEventV2WithJWTAuthorizer): boolean {
  return event.rawPath.endsWith('/start');
}

async function handleStart(event: APIGatewayProxyEventV2WithJWTAuthorizer, repo: Repository): Promise<ApiResult> {
  const { sub } = getCaller(event);
  const challengeId = pathParam(event, 'challengeId');

  const challenge = findChallenge(challengeId);
  if (!challenge) {
    throw new ApiError(404, API_ERROR_CODES.CHALLENGE_NOT_FOUND, `unknown challenge ${challengeId}`);
  }

  const worlds = getWorldsForProgression();
  const challenges = await repo.getAllChallengeProgress(sub);
  if (!isChallengeUnlocked(worlds, challengeId, challenges)) {
    throw new ApiError(403, API_ERROR_CODES.CHALLENGE_LOCKED, `challenge ${challengeId} is locked`);
  }

  const startedAt = await repo.startAttempt(sub, challengeId);
  const response: StartAttemptResponse = { challengeId, startedAt };
  return ok(response);
}

async function handleSubmit(event: APIGatewayProxyEventV2WithJWTAuthorizer, repo: Repository): Promise<ApiResult> {
  const { sub, email } = getCaller(event);
  const challengeId = pathParam(event, 'challengeId');

  const challenge = findChallenge(challengeId);
  if (!challenge) {
    throw new ApiError(404, API_ERROR_CODES.CHALLENGE_NOT_FOUND, `unknown challenge ${challengeId}`);
  }

  const worlds = getWorldsForProgression();
  const priorChallenges = await repo.getAllChallengeProgress(sub);
  if (!isChallengeUnlocked(worlds, challengeId, priorChallenges)) {
    throw new ApiError(403, API_ERROR_CODES.CHALLENGE_LOCKED, `challenge ${challengeId} is locked`);
  }

  const startedAt = await repo.getAttemptWindow(sub, challengeId);
  if (!startedAt) {
    throw new ApiError(409, API_ERROR_CODES.ATTEMPT_NOT_STARTED, 'call start before submitting an attempt');
  }

  const body = parseJsonBody(event) as { answer?: unknown } | undefined;
  const schema = answerSchemaFor(challenge.kind);
  const parsedAnswer = schema.safeParse(body?.answer);
  if (!parsedAnswer.success) {
    throw new ApiError(400, API_ERROR_CODES.INVALID_ANSWER, 'answer does not match the challenge shape', parsedAnswer.error.issues);
  }
  const answer = parsedAnswer.data as AnswerPayload;

  // Elapsed time comes only from the stored server timestamp, never the body.
  const elapsedSeconds = Math.max(0, (Date.now() - Date.parse(startedAt)) / 1000);

  const grade = gradeAnswer(challenge, answer);
  const priorProgress = priorChallenges[challengeId];
  const firstAttempt = !priorProgress || priorProgress.attempts === 0;
  const revealedTiers = await repo.getRevealedTiers(sub, challengeId);
  const profile = await repo.getProfile(sub, email);

  const breakdown = computeScore({
    kind: challenge.kind,
    difficulty: challenge.difficulty,
    boss: challenge.boss === true,
    firstAttempt,
    comboStreak: profile.comboStreak,
    hintsUsed: revealedTiers.length,
    elapsedSeconds,
    targetSeconds: challenge.targetSeconds,
    correctnessRatio: grade.ratio,
  });

  // Award only the positive delta over the best already banked, so replaying a
  // mastered challenge cannot farm xp.
  const previousBest = priorProgress?.bestPoints ?? 0;
  const pointsAwarded = Math.max(0, breakdown.points - previousBest);
  const bestPoints = Math.max(previousBest, breakdown.points);
  const wasMastered = priorProgress?.mastered ?? false;
  const mastered = wasMastered || grade.ratio === 1;

  const fullyCorrect = grade.ratio === 1;
  const comboStreak = fullyCorrect ? profile.comboStreak + 1 : 0;

  const updatedProgress: ChallengeProgress = {
    challengeId,
    attempts: (priorProgress?.attempts ?? 0) + 1,
    mastered,
    bestPoints,
    firstTryCorrect: priorProgress?.firstTryCorrect ?? (firstAttempt && fullyCorrect),
    hintsUsed: revealedTiers.length,
  };
  await repo.putChallengeProgress(sub, updatedProgress);

  const updatedChallenges: Record<string, ChallengeProgress> = { ...priorChallenges, [challengeId]: updatedProgress };
  const previousWorldProgress = computeProgress(worlds, priorChallenges);
  const newWorldProgress = computeProgress(worlds, updatedChallenges);

  const world = worlds.find((w) => w.topics.some((t) => t.challenges.some((c) => c.id === challengeId)));
  const previousBossDefeated = world
    ? previousWorldProgress.find((w) => w.worldId === world.id)?.bossDefeated ?? false
    : false;
  const newBossDefeated = world ? newWorldProgress.find((w) => w.worldId === world.id)?.bossDefeated ?? false : false;
  const bossJustDefeated = challenge.boss === true && !previousBossDefeated && newBossDefeated;

  const newlyUnlockedTopics = newWorldProgress
    .flatMap((w) => w.topics.filter((t) => t.unlocked))
    .map((t) => t.topicId)
    .filter((id) => {
      const prevTopic = previousWorldProgress.flatMap((w) => w.topics).find((t) => t.topicId === id);
      return !prevTopic?.unlocked;
    });
  const newlyUnlockedWorlds = newWorldProgress
    .filter((w) => w.unlocked)
    .map((w) => w.worldId)
    .filter((id) => !previousWorldProgress.find((w) => w.worldId === id)?.unlocked);

  const previousXp = profile.xp;
  const newXp = previousXp + pointsAwarded;
  const previousRank = rankForXp(previousXp);
  const newRank = rankForXp(newXp);
  const rankUp = newRank !== previousRank ? newRank : null;

  const badgeContext = {
    worlds,
    progress: newWorldProgress,
    challenges: updatedChallenges,
    xp: newXp,
    comboStreak,
    dailyStreakDays: profile.dailyStreakDays,
  };
  const newBadges = evaluateBadges(badgeContext, profile.badges);

  const hintTokens = profile.hintTokens + (bossJustDefeated ? HINT_TOKENS_PER_WORLD : 0);

  const updatedProfile = {
    ...profile,
    xp: newXp,
    rankTitle: newRank,
    hintTokens,
    comboStreak,
    badges: [...profile.badges, ...newBadges],
    updatedAt: new Date().toISOString(),
  };
  await repo.putProfile(updatedProfile);
  await repo.clearAttemptWindow(sub, challengeId);

  const outcome: SubmitAttemptResponse['outcome'] = grade.ratio === 1 ? 'correct' : grade.ratio > 0 ? 'partial' : 'incorrect';
  const sandboxUnlocked = isSandboxUnlocked(newWorldProgress);
  const previousSandboxUnlocked = isSandboxUnlocked(previousWorldProgress);

  const unlocked: UnlockEvent = {
    topics: newlyUnlockedTopics,
    worlds: newlyUnlockedWorlds,
    badges: newBadges,
    sandbox: sandboxUnlocked && !previousSandboxUnlocked,
    rankUp,
  };

  const response: SubmitAttemptResponse = {
    challengeId,
    outcome,
    correctnessRatio: grade.ratio,
    pointsAwarded,
    breakdown,
    mastered,
    explanation: challenge.explanation,
    solution: mastered ? challenge.solution : undefined,
    profile: updatedProfile,
    unlocked,
  };
  return ok(response);
}

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const repo = getRepository();
    return isStartRoute(event) ? handleStart(event, repo) : handleSubmit(event, repo);
  });
}
