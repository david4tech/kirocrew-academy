/**
 * Small request-parsing helpers shared across handlers.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { ApiError } from './http.js';
import { API_ERROR_CODES } from '@kirocrew-academy/shared';

export function pathParam(event: APIGatewayProxyEventV2WithJWTAuthorizer, name: string): string {
  const value = event.pathParameters?.[name];
  if (!value) throw new ApiError(400, API_ERROR_CODES.VALIDATION_FAILED, `missing path parameter ${name}`);
  return decodeURIComponent(value);
}

export function queryParam(event: APIGatewayProxyEventV2WithJWTAuthorizer, name: string): string | undefined {
  return event.queryStringParameters?.[name];
}

export function parseJsonBody(event: APIGatewayProxyEventV2WithJWTAuthorizer): unknown {
  if (!event.body) return undefined;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, API_ERROR_CODES.VALIDATION_FAILED, 'request body is not valid JSON');
  }
}
