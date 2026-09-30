/**
 * GET /me returns the profile, creating it from JWT claims on first call.
 * PATCH /me updates displayName and role.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { ROLES } from '@kirocrew-academy/shared';
import { API_ERROR_CODES } from '@kirocrew-academy/shared';
import { ApiError, ok, withErrorHandling, type ApiResult } from '../lib/http.js';
import { getCaller } from '../lib/auth.js';
import { getRepository } from '../lib/repository.js';
import { parseJsonBody } from '../lib/request.js';

const patchSchema = z
  .object({
    displayName: z.string().min(1).max(60).optional(),
    role: z.enum(ROLES).nullable().optional(),
  })
  .refine((body) => body.displayName !== undefined || body.role !== undefined, {
    message: 'at least one of displayName or role must be provided',
  });

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<ApiResult> {
  return withErrorHandling(async () => {
    const { sub, email } = getCaller(event);
    const repo = getRepository();
    const method = event.requestContext.http.method;

    if (method === 'PATCH') {
      const parsed = patchSchema.safeParse(parseJsonBody(event));
      if (!parsed.success) {
        throw new ApiError(400, API_ERROR_CODES.VALIDATION_FAILED, 'invalid /me payload', parsed.error.issues);
      }
      await repo.getProfile(sub, email);
      const updated = await repo.updateProfileFields(sub, parsed.data);
      return ok(updated);
    }

    const profile = await repo.getProfile(sub, email);
    return ok(profile);
  });
}
