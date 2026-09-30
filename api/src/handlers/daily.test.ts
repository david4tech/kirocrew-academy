import { describe, expect, it, vi } from 'vitest';
import { handler as dailyHandler } from './daily.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';
import { useTestHarness } from '../test-support/harness.js';
import type { DailyClaimResponse } from '@kirocrew-academy/shared';

describe('POST /daily', () => {
  useTestHarness();

  it('9. claiming daily twice in one UTC day returns ALREADY_CLAIMED_TODAY', async () => {
    const first = await dailyHandler(fakeEvent({ method: 'POST', rawPath: '/daily' }));
    expect(first.statusCode).toBe(200);
    const firstBody = readBody<DailyClaimResponse>(first);
    expect(firstBody.claimed).toBe(true);
    expect(firstBody.dailyStreakDays).toBe(1);

    const second = await dailyHandler(fakeEvent({ method: 'POST', rawPath: '/daily' }));
    expect(second.statusCode).toBe(409);
    expect(readBody<{ error: string }>(second).error).toBe('already_claimed_today');
  });

  it('increments the streak when the previous claim was exactly yesterday (UTC)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    const day1 = await dailyHandler(fakeEvent({ method: 'POST', rawPath: '/daily' }));
    expect(readBody<DailyClaimResponse>(day1).dailyStreakDays).toBe(1);

    vi.setSystemTime(new Date('2026-01-02T12:00:00.000Z'));
    const day2 = await dailyHandler(fakeEvent({ method: 'POST', rawPath: '/daily' }));
    expect(readBody<DailyClaimResponse>(day2).dailyStreakDays).toBe(2);

    vi.setSystemTime(new Date('2026-01-04T12:00:00.000Z')); // skipped a day
    const day4 = await dailyHandler(fakeEvent({ method: 'POST', rawPath: '/daily' }));
    expect(readBody<DailyClaimResponse>(day4).dailyStreakDays).toBe(1);
    vi.useRealTimers();
  });
});
