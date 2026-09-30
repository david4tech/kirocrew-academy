/**
 * Reads the caller identity from the JWT claims the HTTP API authorizer already
 * verified. This module never checks a signature: that trust boundary is the
 * authorizer's job, not the handler's.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { ApiError } from './http.js';
import { API_ERROR_CODES } from '@kirocrew-academy/shared';

export interface CallerIdentity {
  sub: string;
  email: string;
}

export function getCaller(event: APIGatewayProxyEventV2WithJWTAuthorizer): CallerIdentity {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  const email = claims?.email;
  if (typeof sub !== 'string' || sub.length === 0 || typeof email !== 'string' || email.length === 0) {
    throw new ApiError(401, API_ERROR_CODES.UNAUTHORIZED, 'missing subject or email claim');
  }
  return { sub, email };
}
