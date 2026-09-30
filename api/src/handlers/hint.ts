/**
 * POST /challenges/{id}/hint charges HINT_TOKEN_COST for the tier, refuses on
 * a short balance, and is idempotent: a tier already revealed returns the
 * text again and charges nothing.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import {
  API_ERROR_CODES,
  HINT_TOKEN_COST,
  penaltyForRevealedTiers,
  type HintTier,
  type RevealHintResponse,
} from '@kirocrew-academy/shared';
import { ApiError, ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository } from '../lib/repository.js';
import { findChallenge } from '../lib/content.js';
import { parseJsonBody, pathParam } from '../lib/request.js';

const bodySchema = z.object({ tier: z.union([z.literal(1), z.literal(2), z.literal(3)]) });

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const { sub, email } = getCaller(event);
    const challengeId = pathParam(event, 'challengeId');
    const repo = getRepository();

    const challenge = findChallenge(challengeId);
    if (!challenge) {
      throw new ApiError(404, API_ERROR_CODES.CHALLENGE_NOT_FOUND, `unknown challenge ${challengeId}`);
    }

    const parsed = bodySchema.safeParse(parseJsonBody(event));
    if (!parsed.success) {
      throw new ApiError(400, API_ERROR_CODES.VALIDATION_FAILED, 'invalid hint request', parsed.error.issues);
    }
    const tier = parsed.data.tier as HintTier;

    const alreadyRevealed = await repo.isHintRevealed(sub, challengeId, tier);
    const hintText = challenge.hints[tier - 1].text;

    if (alreadyRevealed) {
      const revealedTiers = await repo.getRevealedTiers(sub, challengeId);
      const profile = await repo.getProfile(sub, email);
      const response: RevealHintResponse = {
        tier,
        text: hintText,
        tokensSpent: 0,
        hintTokensLeft: profile.hintTokens,
        penaltyPct: penaltyForRevealedTiers(revealedTiers),
      };
      return ok(response);
    }

    const cost = HINT_TOKEN_COST[tier];
    const profile = await repo.getProfile(sub, email);
    if (profile.hintTokens < cost) {
      throw new ApiError(400, API_ERROR_CODES.INSUFFICIENT_HINT_TOKENS, 'not enough hint tokens for this tier');
    }

    await repo.markHintRevealed(sub, challengeId, tier);
    const revealedTiers = await repo.getRevealedTiers(sub, challengeId);

    const updatedProfile = {
      ...profile,
      hintTokens: profile.hintTokens - cost,
      updatedAt: new Date().toISOString(),
    };
    await repo.putProfile(updatedProfile);

    // Track hints used on the challenge progress record, distinct tiers only.
    const progress = await repo.getChallengeProgress(sub, challengeId);
    if (progress) {
      await repo.putChallengeProgress(sub, { ...progress, hintsUsed: revealedTiers.length });
    }

    const response: RevealHintResponse = {
      tier,
      text: hintText,
      tokensSpent: cost,
      hintTokensLeft: updatedProfile.hintTokens,
      penaltyPct: penaltyForRevealedTiers(revealedTiers),
    };
    return ok(response);
  });
}
