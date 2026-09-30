import { describe, expect, it } from 'vitest';
import { handler as progressHandler } from './progress.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';
import { useTestHarness } from '../test-support/harness.js';
import type { ProgressSnapshot } from '@kirocrew-academy/shared';

describe('GET /progress', () => {
  useTestHarness();

  it('returns a full ProgressSnapshot with sandboxUnlocked', async () => {
    const result = await progressHandler(fakeEvent({ method: 'GET', rawPath: '/progress' }));
    expect(result.statusCode).toBe(200);
    const body = readBody<ProgressSnapshot>(result);
    expect(body.profile.userId).toBe('user-1');
    expect(body.worlds).toHaveLength(1);
    expect(body.worlds[0]?.worldId).toBe('w0');
    expect(body.sandboxUnlocked).toBe(false);
  });
});
