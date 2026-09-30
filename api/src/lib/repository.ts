/**
 * Every DynamoDB access in one place, keyed exactly as ARCHITECTURE.md specifies.
 * Single table, pk/sk. Only the profile item carries GSI keys.
 *
 * Exposed as a `Repository` interface plus a DynamoDB-backed implementation, so
 * tests exercise handlers against an in-memory fake instead of a mocked SDK.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { ddb, tableName } from './ddb.js';
import {
  ATTEMPT_WINDOW_SECONDS,
  STARTING_HINT_TOKENS,
  rankForXp,
  type ChallengeProgress,
  type HintTier,
  type Role,
  type UserProfile,
} from '@kirocrew-academy/shared';

const XP_PAD_WIDTH = 12;

export function padXp(xp: number): string {
  return String(Math.max(0, Math.trunc(xp))).padStart(XP_PAD_WIDTH, '0');
}

function nowIso(): string {
  return new Date().toISOString();
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.length > 0 ? local : 'learner';
}

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  xp: number;
  rankTitle: string;
  role: Role | null;
}

/**
 * Data access surface every handler depends on. The DynamoDB implementation
 * below satisfies it for production; tests satisfy it with a plain object
 * backed by in-memory maps.
 */
export interface Repository {
  getProfile(userId: string, email: string): Promise<UserProfile>;
  putProfile(profile: UserProfile): Promise<void>;
  updateProfileFields(userId: string, patch: Partial<Pick<UserProfile, 'displayName' | 'role'>>): Promise<UserProfile>;

  getChallengeProgress(userId: string, challengeId: string): Promise<ChallengeProgress | undefined>;
  getAllChallengeProgress(userId: string): Promise<Record<string, ChallengeProgress>>;
  putChallengeProgress(userId: string, progress: ChallengeProgress): Promise<void>;

  startAttempt(userId: string, challengeId: string): Promise<string>;
  getAttemptWindow(userId: string, challengeId: string): Promise<string | undefined>;
  clearAttemptWindow(userId: string, challengeId: string): Promise<void>;

  getRevealedTiers(userId: string, challengeId: string): Promise<HintTier[]>;
  isHintRevealed(userId: string, challengeId: string, tier: HintTier): Promise<boolean>;
  markHintRevealed(userId: string, challengeId: string, tier: HintTier): Promise<void>;

  queryLeaderboard(scope: 'all' | Role, limit: number): Promise<LeaderboardRow[]>;
}

// ---------------------------------------------------------------------------
// DynamoDB-backed implementation
// ---------------------------------------------------------------------------

interface ProfileItem extends UserProfile {
  pk: string;
  sk: 'PROFILE';
  gsi1pk: string;
  gsi1sk: string;
  gsi2pk?: string;
  gsi2sk?: string;
}

function profileKey(userId: string) {
  return { pk: `USER#${userId}`, sk: 'PROFILE' as const };
}

function toProfile(item: ProfileItem): UserProfile {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...profile } = item;
  void pk;
  void sk;
  void gsi1pk;
  void gsi1sk;
  void gsi2pk;
  void gsi2sk;
  return profile;
}

function gsiFieldsForProfile(profile: UserProfile): Pick<ProfileItem, 'gsi1pk' | 'gsi1sk' | 'gsi2pk' | 'gsi2sk'> {
  return {
    gsi1pk: 'LEADERBOARD#ALL',
    gsi1sk: padXp(profile.xp),
    gsi2pk: profile.role ? `LEADERBOARD#${profile.role}` : undefined,
    gsi2sk: profile.role ? padXp(profile.xp) : undefined,
  };
}

function isConditionalCheckFailed(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: unknown }).name === 'ConditionalCheckFailedException'
  );
}

function challengeKey(userId: string, challengeId: string) {
  return { pk: `USER#${userId}`, sk: `CHALLENGE#${challengeId}` };
}

interface ChallengeRecordItem extends ChallengeProgress {
  pk: string;
  sk: string;
}

function attemptKey(userId: string, challengeId: string) {
  return { pk: `USER#${userId}`, sk: `ATTEMPT#${challengeId}` };
}

interface AttemptWindowItem {
  pk: string;
  sk: string;
  startedAt: string;
  ttl: number;
}

function hintKey(userId: string, challengeId: string, tier: HintTier) {
  return { pk: `USER#${userId}`, sk: `HINT#${challengeId}#${tier}` };
}

export function createDynamoRepository(): Repository {
  return {
    async getProfile(userId, email) {
      const key = profileKey(userId);
      const existing = await ddb.send(new GetCommand({ TableName: tableName(), Key: key }));
      if (existing.Item) return toProfile(existing.Item as ProfileItem);

      const timestamp = nowIso();
      const fresh: UserProfile = {
        userId,
        email,
        displayName: displayNameFromEmail(email),
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
      const item: ProfileItem = { ...key, ...fresh, ...gsiFieldsForProfile(fresh) };

      try {
        await ddb.send(
          new PutCommand({
            TableName: tableName(),
            Item: item,
            ConditionExpression: 'attribute_not_exists(pk)',
          }),
        );
        return fresh;
      } catch (err) {
        if (isConditionalCheckFailed(err)) {
          const raced = await ddb.send(new GetCommand({ TableName: tableName(), Key: key }));
          if (raced.Item) return toProfile(raced.Item as ProfileItem);
        }
        throw err;
      }
    },

    async putProfile(profile) {
      const key = profileKey(profile.userId);
      const item: ProfileItem = { ...key, ...profile, ...gsiFieldsForProfile(profile) };
      await ddb.send(new PutCommand({ TableName: tableName(), Item: item }));
    },

    async updateProfileFields(userId, patch) {
      const current = await ddb.send(new GetCommand({ TableName: tableName(), Key: profileKey(userId) }));
      if (!current.Item) throw new Error(`profile not found for ${userId}`);
      const profile = toProfile(current.Item as ProfileItem);
      const updated: UserProfile = { ...profile, ...patch, updatedAt: nowIso() };
      await this.putProfile(updated);
      return updated;
    },

    async getChallengeProgress(userId, challengeId) {
      const res = await ddb.send(new GetCommand({ TableName: tableName(), Key: challengeKey(userId, challengeId) }));
      if (!res.Item) return undefined;
      const item = res.Item as ChallengeRecordItem;
      return {
        challengeId: item.challengeId,
        attempts: item.attempts,
        mastered: item.mastered,
        bestPoints: item.bestPoints,
        firstTryCorrect: item.firstTryCorrect,
        hintsUsed: item.hintsUsed,
      };
    },

    async getAllChallengeProgress(userId) {
      const result: Record<string, ChallengeProgress> = {};
      let ExclusiveStartKey: Record<string, unknown> | undefined;
      do {
        const page = await ddb.send(
          new QueryCommand({
            TableName: tableName(),
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': 'CHALLENGE#' },
            ExclusiveStartKey,
          }),
        );
        for (const raw of page.Items ?? []) {
          const item = raw as ChallengeRecordItem;
          result[item.challengeId] = {
            challengeId: item.challengeId,
            attempts: item.attempts,
            mastered: item.mastered,
            bestPoints: item.bestPoints,
            firstTryCorrect: item.firstTryCorrect,
            hintsUsed: item.hintsUsed,
          };
        }
        ExclusiveStartKey = page.LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return result;
    },

    async putChallengeProgress(userId, progress) {
      const item: ChallengeRecordItem = { ...challengeKey(userId, progress.challengeId), ...progress };
      await ddb.send(new PutCommand({ TableName: tableName(), Item: item }));
    },

    async startAttempt(userId, challengeId) {
      const startedAt = nowIso();
      const ttl = Math.floor(Date.now() / 1000) + ATTEMPT_WINDOW_SECONDS;
      const item: AttemptWindowItem = { ...attemptKey(userId, challengeId), startedAt, ttl };
      await ddb.send(new PutCommand({ TableName: tableName(), Item: item }));
      return startedAt;
    },

    async getAttemptWindow(userId, challengeId) {
      const res = await ddb.send(new GetCommand({ TableName: tableName(), Key: attemptKey(userId, challengeId) }));
      if (!res.Item) return undefined;
      return (res.Item as AttemptWindowItem).startedAt;
    },

    async clearAttemptWindow(userId, challengeId) {
      await ddb
        .send(
          new UpdateCommand({
            TableName: tableName(),
            Key: attemptKey(userId, challengeId),
            UpdateExpression: 'REMOVE ttl',
          }),
        )
        .catch(() => undefined);
    },

    async getRevealedTiers(userId, challengeId) {
      const res = await ddb.send(
        new QueryCommand({
          TableName: tableName(),
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':prefix': `HINT#${challengeId}#` },
        }),
      );
      return (res.Items ?? []).map((item) => Number((item.sk as string).split('#').pop()) as HintTier);
    },

    async isHintRevealed(userId, challengeId, tier) {
      const res = await ddb.send(new GetCommand({ TableName: tableName(), Key: hintKey(userId, challengeId, tier) }));
      return Boolean(res.Item);
    },

    async markHintRevealed(userId, challengeId, tier) {
      await ddb.send(
        new PutCommand({
          TableName: tableName(),
          Item: { ...hintKey(userId, challengeId, tier), revealedAt: nowIso() },
        }),
      );
    },

    async queryLeaderboard(scope, limit) {
      const params: QueryCommandInput =
        scope === 'all'
          ? {
              TableName: tableName(),
              IndexName: 'gsi1',
              KeyConditionExpression: 'gsi1pk = :pk',
              ExpressionAttributeValues: { ':pk': 'LEADERBOARD#ALL' },
              ScanIndexForward: false,
              Limit: limit,
            }
          : {
              TableName: tableName(),
              IndexName: 'gsi2',
              KeyConditionExpression: 'gsi2pk = :pk',
              ExpressionAttributeValues: { ':pk': `LEADERBOARD#${scope}` },
              ScanIndexForward: false,
              Limit: limit,
            };
      const res = await ddb.send(new QueryCommand(params));
      return (res.Items ?? []).map((item) => ({
        userId: (item.pk as string).replace('USER#', ''),
        displayName: item.displayName as string,
        xp: item.xp as number,
        rankTitle: item.rankTitle as string,
        role: (item.role as Role | null) ?? null,
      }));
    },
  };
}

/** Lazily constructed singleton, so importing this module never requires TABLE_NAME to be set. */
let singleton: Repository | undefined;
let override: Repository | undefined;

export function getRepository(): Repository {
  if (override) return override;
  if (!singleton) singleton = createDynamoRepository();
  return singleton;
}

/**
 * Test-only seam: substitutes the repository every handler resolves via
 * getRepository(). Pass undefined to restore the real DynamoDB-backed one.
 */
export function setRepositoryForTests(repo: Repository | undefined): void {
  override = repo;
}
