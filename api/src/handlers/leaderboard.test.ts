import { describe, expect, it } from 'vitest';
import { handler as meHandler } from './me.js';
import { handler as leaderboardHandler } from './leaderboard.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';
import { useTestHarness } from '../test-support/harness.js';
import type { LeaderboardResponse } from '@kirocrew-academy/shared';

describe('GET /leaderboard', () => {
  useTestHarness();

  it('marks the caller with isCurrentUser and clamps limit', async () => {
    await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', sub: 'me', email: 'me@example.com' }));
    await meHandler(fakeEvent({ method: 'GET', rawPath: '/me', sub: 'other', email: 'other@example.com' }));

    const result = await leaderboardHandler(
      fakeEvent({ method: 'GET', rawPath: '/leaderboard', sub: 'me', queryStringParameters: { scope: 'all', limit: '500' } }),
    );
    expect(result.statusCode).toBe(200);
    const body = readBody<LeaderboardResponse>(result);
    expect(body.entries.length).toBeLessThanOrEqual(100);
    const mine = body.entries.find((e) => e.isCurrentUser);
    expect(mine).toBeDefined();
  });

  it('rejects an unknown scope', async () => {
    const result = await leaderboardHandler(
      fakeEvent({ method: 'GET', rawPath: '/leaderboard', queryStringParameters: { scope: 'not-a-role' } }),
    );
    expect(result.statusCode).toBe(400);
  });
});
