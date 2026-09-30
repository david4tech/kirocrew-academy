/**
 * POST /daily grants HINT_TOKENS_PER_DAILY once per UTC calendar day, and
 * increments dailyStreakDays when the last claim was exactly yesterday (UTC),
 * resetting it to 1 otherwise.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { API_ERROR_CODES, HINT_TOKENS_PER_DAILY, type DailyClaimResponse } from '@kirocrew-academy/shared';
import { ApiError, ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository } from '../lib/repository.js';

/** UTC calendar day key, e.g. "2026-09-30". */
function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function isYesterday(previousDayKey: string, todayKey: string): boolean {
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  return utcDayKey(yesterday.toISOString()) === previousDayKey;
}

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const { sub, email } = getCaller(event);
    const repo = getRepository();

    const profile = await repo.getProfile(sub, email);
    const nowIso = new Date().toISOString();
    const todayKey = utcDayKey(nowIso);

    if (profile.lastDailyClaim && utcDayKey(profile.lastDailyClaim) === todayKey) {
      throw new ApiError(409, API_ERROR_CODES.ALREADY_CLAIMED_TODAY, 'daily reward already claimed today');
    }

    const streakContinues = profile.lastDailyClaim ? isYesterday(utcDayKey(profile.lastDailyClaim), todayKey) : false;
    const dailyStreakDays = streakContinues ? profile.dailyStreakDays + 1 : 1;
    const hintTokens = profile.hintTokens + HINT_TOKENS_PER_DAILY;

    const updated = {
      ...profile,
      hintTokens,
      dailyStreakDays,
      lastDailyClaim: nowIso,
      updatedAt: nowIso,
    };
    await repo.putProfile(updated);

    const response: DailyClaimResponse = {
      claimed: true,
      dailyStreakDays,
      hintTokens,
    };
    return ok(response);
  });
}
