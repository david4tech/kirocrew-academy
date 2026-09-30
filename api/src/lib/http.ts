/**
 * HTTP response helpers. Every error response carries an API_ERROR_CODES value,
 * never an ad hoc string, so the client can branch on `error` without guessing.
 */

import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { API_ERROR_CODES, type ApiErrorCode } from '@kirocrew-academy/shared';

/** The concrete structured shape every handler in this package returns. */
export type ApiResult = APIGatewayProxyStructuredResultV2;

/** Thrown by handler logic to short-circuit with a specific status and code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

function json(status: number, body: unknown): ApiResult {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown, status = 200): ApiResult {
  return json(status, body);
}

export function badRequest(code: ApiErrorCode, message: string, details?: unknown): ApiResult {
  return json(400, { error: code, message, details });
}

export function unauthorized(message = 'missing or invalid credentials'): ApiResult {
  return json(401, { error: API_ERROR_CODES.UNAUTHORIZED, message });
}

export function notFound(code: ApiErrorCode, message: string): ApiResult {
  return json(404, { error: code, message });
}

export function conflict(code: ApiErrorCode, message: string): ApiResult {
  return json(409, { error: code, message });
}

export function serverError(message = 'internal error'): ApiResult {
  return json(500, { error: API_ERROR_CODES.INTERNAL, message });
}

/**
 * Wraps a handler body so a thrown ApiError maps to its own status and code,
 * and anything else is logged (never with a leaked stack trace to the client)
 * and returned as a generic internal error.
 */
export async function withErrorHandling(fn: () => Promise<ApiResult>): Promise<ApiResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return json(err.status, { error: err.code, message: err.message, details: err.details });
    }
    console.error('unhandled error', err);
    return serverError();
  }
}
