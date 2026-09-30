/**
 * The HTTP surface, declared once so the client cannot drift from the API.
 * Every route except HEALTH sits behind the Cognito JWT authorizer.
 */

export const API_ROUTES = {
  HEALTH: { method: 'GET', path: '/health' },
  GET_ME: { method: 'GET', path: '/me' },
  PATCH_ME: { method: 'PATCH', path: '/me' },
  GET_PROGRESS: { method: 'GET', path: '/progress' },
  START_ATTEMPT: { method: 'POST', path: '/challenges/{challengeId}/start' },
  SUBMIT_ATTEMPT: { method: 'POST', path: '/challenges/{challengeId}/attempt' },
  REVEAL_HINT: { method: 'POST', path: '/challenges/{challengeId}/hint' },
  GET_LEADERBOARD: { method: 'GET', path: '/leaderboard' },
  CLAIM_DAILY: { method: 'POST', path: '/daily' },
} as const;

export type ApiRouteKey = keyof typeof API_ROUTES;

export function buildPath(key: ApiRouteKey, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replace(`{${name}}`, encodeURIComponent(value)),
    API_ROUTES[key].path as string,
  );
}

/** Error codes the API returns, so the client can branch without string matching. */
export const API_ERROR_CODES = {
  UNAUTHORIZED: 'unauthorized',
  CHALLENGE_NOT_FOUND: 'challenge_not_found',
  CHALLENGE_LOCKED: 'challenge_locked',
  ATTEMPT_NOT_STARTED: 'attempt_not_started',
  INVALID_ANSWER: 'invalid_answer',
  INSUFFICIENT_HINT_TOKENS: 'insufficient_hint_tokens',
  ALREADY_CLAIMED_TODAY: 'already_claimed_today',
  VALIDATION_FAILED: 'validation_failed',
  INTERNAL: 'internal_error',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * An attempt must be opened with START_ATTEMPT before it can be submitted. The
 * server timestamps the start, which is what makes the speed bonus unspoofable.
 * An attempt window older than this is treated as abandoned and earns no speed
 * bonus, but is still graded.
 */
export const ATTEMPT_WINDOW_SECONDS = 1800;
