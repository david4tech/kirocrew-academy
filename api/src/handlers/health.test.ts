import { describe, expect, it } from 'vitest';
import { handler as healthHandler } from './health.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';

describe('GET /health', () => {
  it('returns ok, content version and challenge count without a table', async () => {
    const result = await healthHandler(fakeEvent({ method: 'GET', rawPath: '/health', omitAuth: true }));
    expect(result.statusCode).toBe(200);
    const body = readBody<{ status: string; contentVersion: string; challengeCount: number }>(result);
    expect(body.status).toBe('ok');
    expect(typeof body.contentVersion).toBe('string');
    expect(typeof body.challengeCount).toBe('number');
  });
});
