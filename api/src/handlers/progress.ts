/**
 * GET /progress returns the full ProgressSnapshot, recomputed from the raw
 * per-challenge records on every read so content changes re-lock correctly.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { computeProgress, isSandboxUnlocked, type ProgressSnapshot } from '@kirocrew-academy/shared';
import { ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository } from '../lib/repository.js';
import { getWorldsForProgression } from '../lib/content.js';

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const { sub, email } = getCaller(event);
    const repo = getRepository();

    const profile = await repo.getProfile(sub, email);
    const challenges = await repo.getAllChallengeProgress(sub);
    const worlds = getWorldsForProgression();
    const worldProgress = computeProgress(worlds, challenges);

    const snapshot: ProgressSnapshot = {
      profile,
      worlds: worldProgress,
      challenges,
      sandboxUnlocked: isSandboxUnlocked(worldProgress),
    };
    return ok(snapshot);
  });
}
