/**
 * GET /health. Unauthenticated, touches no table.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getChallengeCount, getContentVersion } from '../lib/content.js';

export async function handler(_event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () =>
    ok({ status: 'ok', contentVersion: getContentVersion(), challengeCount: getChallengeCount() }),
  );
}
