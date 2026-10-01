/**
 * The one HTTP client. Every URL is built from API_ROUTES/buildPath so the
 * client cannot invent a route. Attaches the Cognito id token as a bearer and
 * maps API_ERROR_CODES to user facing copy.
 */
import { API_ERROR_CODES, API_ROUTES, buildPath, type ApiErrorCode, type ApiRouteKey } from '@kirocrew-academy/shared';
import { config } from '../config';
import { getIdToken } from './auth';

export class ApiClientError extends Error {
  code: ApiErrorCode | 'network_error';
  status: number;
  details?: unknown;

  constructor(code: ApiErrorCode | 'network_error', message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** User facing copy for each server error code, shown when the server gives no message. */
export const ERROR_COPY: Record<ApiErrorCode, string> = {
  [API_ERROR_CODES.UNAUTHORIZED]: 'Your session expired. Sign in again to continue.',
  [API_ERROR_CODES.CHALLENGE_NOT_FOUND]: 'That challenge could not be found.',
  [API_ERROR_CODES.CHALLENGE_LOCKED]: 'This challenge is still locked.',
  [API_ERROR_CODES.ATTEMPT_NOT_STARTED]: 'Open the challenge again before submitting an answer.',
  [API_ERROR_CODES.INVALID_ANSWER]: 'That answer is not in the shape this challenge expects.',
  [API_ERROR_CODES.INSUFFICIENT_HINT_TOKENS]: 'Not enough hint tokens for that tier.',
  [API_ERROR_CODES.ALREADY_CLAIMED_TODAY]: 'The daily streak was already claimed today.',
  [API_ERROR_CODES.VALIDATION_FAILED]: 'That request was not valid.',
  [API_ERROR_CODES.INTERNAL]: 'Something went wrong on the server. Try again in a moment.',
};

export function errorCopyFor(code: string, fallback?: string): string {
  return ERROR_COPY[code as ApiErrorCode] ?? fallback ?? 'Something went wrong. Try again.';
}

interface RequestOptions {
  route: ApiRouteKey;
  params?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(options: RequestOptions): string {
  const path = buildPath(options.route, options.params);
  const url = new URL(path.replace(/^\//, ''), config.apiBaseUrl.replace(/\/?$/, '/'));
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Exported so unit tests can assert URL building without a network call. */
export function buildRoutePath(route: ApiRouteKey, params?: Record<string, string>): string {
  return buildPath(route, params);
}

async function request<TResponse>(options: RequestOptions): Promise<TResponse> {
  const url = buildUrl(options);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.route !== 'HEALTH') {
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: API_ROUTES[options.route].method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError('network_error', 'Could not reach the KiroCrew Academy API.', 0);
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const code = (data?.error as ApiErrorCode) ?? API_ERROR_CODES.INTERNAL;
    const message = (data?.message as string) ?? errorCopyFor(code);
    throw new ApiClientError(code, message, response.status, data?.details);
  }

  return data as TResponse;
}

function safeJsonParse(text: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const api = {
  health: () => request<{ status: string; contentVersion?: string }>({ route: 'HEALTH' }),

  getMe: () => request<import('@kirocrew-academy/shared').UserProfile>({ route: 'GET_ME' }),

  patchMe: (body: { displayName?: string; role?: string }) =>
    request<import('@kirocrew-academy/shared').UserProfile>({ route: 'PATCH_ME', body }),

  getProgress: () => request<import('@kirocrew-academy/shared').ProgressSnapshot>({ route: 'GET_PROGRESS' }),

  startAttempt: (challengeId: string) =>
    request<import('@kirocrew-academy/shared').StartAttemptResponse>({
      route: 'START_ATTEMPT',
      params: { challengeId },
    }),

  submitAttempt: (challengeId: string, body: import('@kirocrew-academy/shared').SubmitAttemptRequest) =>
    request<import('@kirocrew-academy/shared').SubmitAttemptResponse>({
      route: 'SUBMIT_ATTEMPT',
      params: { challengeId },
      body,
    }),

  revealHint: (challengeId: string, body: import('@kirocrew-academy/shared').RevealHintRequest) =>
    request<import('@kirocrew-academy/shared').RevealHintResponse>({
      route: 'REVEAL_HINT',
      params: { challengeId },
      body,
    }),

  getLeaderboard: (query: { scope: string; limit?: number }) =>
    request<import('@kirocrew-academy/shared').LeaderboardResponse>({
      route: 'GET_LEADERBOARD',
      query,
    }),

  claimDaily: () => request<import('@kirocrew-academy/shared').DailyClaimResponse>({ route: 'CLAIM_DAILY' }),
};
