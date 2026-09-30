import { describe, expect, it } from 'vitest';
import { handler as meHandler } from './me.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';
import { useTestHarness } from '../test-support/harness.js';
import type { UserProfile } from '@kirocrew-academy/shared';

describe('GET/PATCH /me', () => {
  useTestHarness();

  it('creates the profile from JWT claims on first call', async () => {
    const result = await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', sub: 'u1', email: 'ghost@example.com' }));
    expect(result.statusCode).toBe(200);
    const body = readBody<UserProfile>(result);
    expect(body.userId).toBe('u1');
    expect(body.displayName).toBe('ghost');
    expect(body.hintTokens).toBe(5);
  });

  it('rejects a request with no JWT claims', async () => {
    const result = await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', omitAuth: true }));
    expect(result.statusCode).toBe(401);
  });

  it('updates displayName and role via PATCH', async () => {
    await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', sub: 'u2', email: 'a@example.com' }));
    const patch = await meHandler(
      fakeEvent({ method: 'PATCH', rawPath: '/me', sub: 'u2', email: 'a@example.com', body: { displayName: 'Renamed', role: 'devops-sre' } }),
    );
    expect(patch.statusCode).toBe(200);
    const body = readBody<UserProfile>(patch);
    expect(body.displayName).toBe('Renamed');
    expect(body.role).toBe('devops-sre');
  });

  it('rejects an empty PATCH body', async () => {
    await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', sub: 'u3', email: 'a@example.com' }));
    const patch = await meHandler(fakeEvent({ method: 'PATCH', rawPath: '/me', sub: 'u3', email: 'a@example.com', body: {} }));
    expect(patch.statusCode).toBe(400);
  });
});
