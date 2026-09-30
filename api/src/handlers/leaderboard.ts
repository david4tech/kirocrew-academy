/**
 * GET /leaderboard?scope=all|<role>&limit=
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { API_ERROR_CODES, ROLES, type LeaderboardResponse, type Role } from '@kirocrew-academy/shared';
import { ApiError, ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository } from '../lib/repository.js';
import { queryParam } from '../lib/request.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

function parseScope(raw: string | undefined): 'all' | Role {
  if (!raw || raw === 'all') return 'all';
  if ((ROLES as readonly string[]).includes(raw)) return raw as Role;
  throw new ApiError(400, API_ERROR_CODES.VALIDATION_FAILED, `unknown leaderboard scope: ${raw}`);
}

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const { sub } = getCaller(event);
    const repo = getRepository();

    const scope = parseScope(queryParam(event, 'scope'));
    const limit = parseLimit(queryParam(event, 'limit'));

    const rows = await repo.queryLeaderboard(scope, limit);
    const response: LeaderboardResponse = {
      scope,
      entries: rows.map((row, index) => ({
        position: index + 1,
        displayName: row.displayName,
        xp: row.xp,
        rankTitle: row.rankTitle as LeaderboardResponse['entries'][number]['rankTitle'],
        role: row.role,
        isCurrentUser: row.userId === sub,
      })),
    };
    return ok(response);
  });
}
