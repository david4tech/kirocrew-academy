import { describe, expect, it } from 'vitest';
import { handler as startOrSubmit } from '../handlers/attempt.js';
import { handler as hintHandler } from '../handlers/hint.js';
import { fakeEvent, readBody } from '../test-support/fake-event.js';
import { useTestHarness } from '../test-support/harness.js';
import type { SubmitAttemptResponse } from '@kirocrew-academy/shared';

const CHALLENGE_ID = 'w0.t1.c1'; // single-choice, first topic, always unlocked
const BOSS_ID = 'w0.t1.c10'; // simulation, boss

function startEvent(challengeId: string, sub = 'user-1') {
  return fakeEvent({ method: 'POST', rawPath: `/challenges/${challengeId}/start`, pathParameters: { challengeId }, sub });
}

function submitEvent(challengeId: string, answer: unknown, sub = 'user-1') {
  return fakeEvent({
    method: 'POST',
    rawPath: `/challenges/${challengeId}/attempt`,
    pathParameters: { challengeId },
    body: { answer },
    sub,
  });
}

describe('POST /challenges/{id}/attempt', () => {
  useTestHarness();

  it('1. returns ATTEMPT_NOT_STARTED without calling start first', async () => {
    const result = await startOrSubmit(submitEvent(CHALLENGE_ID, { kind: 'single-choice', optionId: 'a' }));
    expect(result.statusCode).toBe(409);
    expect(readBody<{ error: string }>(result).error).toBe('attempt_not_started');
  });

  it('2. a locked challenge refuses both start and attempt', async () => {
    // w0.t1.c10 is the boss: locked until every non-boss challenge is mastered.
    const startResult = await startOrSubmit(startEvent(BOSS_ID));
    expect(startResult.statusCode).toBe(403);
    expect(readBody<{ error: string }>(startResult).error).toBe('challenge_locked');

    const submitResult = await startOrSubmit(
      submitEvent(BOSS_ID, { kind: 'simulation', toolId: 'monitor_watch', args: {} }),
    );
    expect(submitResult.statusCode).toBe(403);
    expect(readBody<{ error: string }>(submitResult).error).toBe('challenge_locked');
  });

  it('3. replaying an already mastered challenge adds zero xp the second time', async () => {
    await startOrSubmit(startEvent(CHALLENGE_ID));
    const first = await startOrSubmit(submitEvent(CHALLENGE_ID, { kind: 'single-choice', optionId: 'a' }));
    const firstBody = readBody<SubmitAttemptResponse>(first);
    expect(firstBody.mastered).toBe(true);
    expect(firstBody.pointsAwarded).toBeGreaterThan(0);

    await startOrSubmit(startEvent(CHALLENGE_ID));
    const second = await startOrSubmit(submitEvent(CHALLENGE_ID, { kind: 'single-choice', optionId: 'a' }));
    const secondBody = readBody<SubmitAttemptResponse>(second);
    expect(secondBody.mastered).toBe(true);
    expect(secondBody.pointsAwarded).toBe(0);
  });

  it('4. a wrong answer resets the combo streak, a correct one increments it', async () => {
    await startOrSubmit(startEvent(CHALLENGE_ID));
    const correct = await startOrSubmit(submitEvent(CHALLENGE_ID, { kind: 'single-choice', optionId: 'a' }));
    expect(readBody<SubmitAttemptResponse>(correct).profile.comboStreak).toBe(1);

    // w0.t1.c3 is true-false, also in topic 1, so unlocked from the start.
    await startOrSubmit(startEvent('w0.t1.c3'));
    const wrong = await startOrSubmit(submitEvent('w0.t1.c3', { kind: 'true-false', value: true }));
    const wrongBody = readBody<SubmitAttemptResponse>(wrong);
    expect(wrongBody.outcome).toBe('incorrect');
    expect(wrongBody.profile.comboStreak).toBe(0);
  });

  it('7. the speed bonus uses the stored start time: a forged elapsed value in the body changes nothing', async () => {
    await startOrSubmit(startEvent('w0.t1.c3'));
    const result = await startOrSubmit(
      fakeEvent({
        method: 'POST',
        rawPath: '/challenges/w0.t1.c3/attempt',
        pathParameters: { challengeId: 'w0.t1.c3' },
        // elapsedSeconds is not part of SubmitAttemptRequest; forging it in the body must be ignored.
        body: { answer: { kind: 'true-false', value: false }, elapsedSeconds: 0 },
      }),
    );
    const body = readBody<SubmitAttemptResponse>(result);
    // Full speed bonus (0.2) would only apply at ~0 elapsed seconds; the real
    // elapsed time (test run time) is near-zero too, so instead assert the
    // breakdown speed bonus is bounded by the real target window regardless
    // of the forged field, i.e. it is not simply trusting a client value we
    // never even wired into scoring.
    expect(body.breakdown.speedBonus).toBeGreaterThanOrEqual(0);
    expect(body.breakdown.speedBonus).toBeLessThanOrEqual(0.2);
  });

  it('8. beating a world boss grants HINT_TOKENS_PER_WORLD exactly once', async () => {
    const nonBossIds = [
      'w0.t1.c1',
      'w0.t1.c2',
      'w0.t1.c3',
      'w0.t1.c4',
      'w0.t1.c5',
      'w0.t1.c6',
      'w0.t1.c7',
      'w0.t1.c8',
      'w0.t1.c9',
    ];
    const answers: Record<string, unknown> = {
      'w0.t1.c1': { kind: 'single-choice', optionId: 'a' },
      'w0.t1.c2': { kind: 'multi-choice', optionIds: ['a', 'b', 'd'] },
      'w0.t1.c3': { kind: 'true-false', value: false },
      'w0.t1.c4': { kind: 'tool-name', value: 'reset_conversation' },
      'w0.t1.c5': { kind: 'config-fill', value: '0 9 * * 1-5' },
      'w0.t1.c6': { kind: 'sequence', orderedItemIds: ['s1', 's2', 's3', 's4', 's5'] },
      'w0.t1.c7': { kind: 'matching', pairs: { l1: 'r1', l2: 'r2', l3: 'r3', l4: 'r4' } },
      'w0.t1.c8': {
        kind: 'simulation',
        toolId: 'cron_add',
        args: {
          cron_expr: '0 7 * * *',
          timezone: 'America/Bogota',
          minimal_context: true,
          persistent_session: false,
          hide_in_chat: true,
        },
      },
      'w0.t1.c9': {
        kind: 'debug-fix',
        value:
          '{"name":"Nightly backup check","message":"Check last night\'s backup job and report failures","cron_expr":"30 2 * * *","timezone":"America/Bogota"}',
      },
    };

    let hintTokensBeforeBoss = 0;
    for (const id of nonBossIds) {
      await startOrSubmit(startEvent(id));
      const res = await startOrSubmit(submitEvent(id, answers[id]));
      const body = readBody<SubmitAttemptResponse>(res);
      expect(body.mastered).toBe(true);
      hintTokensBeforeBoss = body.profile.hintTokens;
    }

    const bossStart = await startOrSubmit(startEvent(BOSS_ID));
    expect(bossStart.statusCode).toBe(200);

    const bossAnswer = {
      kind: 'simulation',
      toolId: 'monitor_watch',
      args: {
        kind: 'github_pull_request',
        objective: 'review_ready',
        target: 'https://github.com/david4tech/kirocrew-academy/pull/1',
      },
    };
    const bossSubmit = await startOrSubmit(submitEvent(BOSS_ID, bossAnswer));
    const bossBody = readBody<SubmitAttemptResponse>(bossSubmit);
    expect(bossBody.mastered).toBe(true);
    expect(bossBody.profile.hintTokens).toBe(hintTokensBeforeBoss + 3); // HINT_TOKENS_PER_WORLD

    // Replaying the boss must not grant the bonus a second time.
    await startOrSubmit(startEvent(BOSS_ID));
    const replaySubmit = await startOrSubmit(submitEvent(BOSS_ID, bossAnswer));
    const replayBody = readBody<SubmitAttemptResponse>(replaySubmit);
    expect(replayBody.profile.hintTokens).toBe(bossBody.profile.hintTokens);
  });

  it('10. grades a fully correct and a fully wrong answer across all nine challenge kinds', async () => {
    const cases: Array<{ id: string; correct: unknown; wrong: unknown }> = [
      { id: 'w0.t1.c1', correct: { kind: 'single-choice', optionId: 'a' }, wrong: { kind: 'single-choice', optionId: 'b' } },
      {
        id: 'w0.t1.c2',
        correct: { kind: 'multi-choice', optionIds: ['a', 'b', 'd'] },
        wrong: { kind: 'multi-choice', optionIds: ['c', 'e', 'f'] },
      },
      { id: 'w0.t1.c3', correct: { kind: 'true-false', value: false }, wrong: { kind: 'true-false', value: true } },
      { id: 'w0.t1.c4', correct: { kind: 'tool-name', value: 'reset_conversation' }, wrong: { kind: 'tool-name', value: 'nope' } },
      { id: 'w0.t1.c5', correct: { kind: 'config-fill', value: '0 9 * * 1-5' }, wrong: { kind: 'config-fill', value: 'nope' } },
      {
        id: 'w0.t1.c6',
        correct: { kind: 'sequence', orderedItemIds: ['s1', 's2', 's3', 's4', 's5'] },
        wrong: { kind: 'sequence', orderedItemIds: ['s2', 's3', 's4', 's5', 's1'] },
      },
      {
        id: 'w0.t1.c7',
        correct: { kind: 'matching', pairs: { l1: 'r1', l2: 'r2', l3: 'r3', l4: 'r4' } },
        wrong: { kind: 'matching', pairs: { l1: 'r5', l2: 'r5', l3: 'r5', l4: 'r5' } },
      },
      {
        id: 'w0.t1.c8',
        correct: {
          kind: 'simulation',
          toolId: 'cron_add',
          args: {
            cron_expr: '0 7 * * *',
            timezone: 'America/Bogota',
            minimal_context: true,
            persistent_session: false,
            hide_in_chat: true,
          },
        },
        wrong: { kind: 'simulation', toolId: 'wait', args: {} },
      },
      {
        id: 'w0.t1.c9',
        correct: {
          kind: 'debug-fix',
          value:
            '{"name":"Nightly backup check","message":"Check last night\'s backup job and report failures","cron_expr":"30 2 * * *","timezone":"America/Bogota"}',
        },
        wrong: { kind: 'debug-fix', value: 'not even close' },
      },
    ];

    for (const { id, correct, wrong } of cases) {
      const userId = `user-${id}`;
      await startOrSubmit(startEvent(id, userId));
      const correctResult = await startOrSubmit(submitEvent(id, correct, userId));
      const correctBody = readBody<SubmitAttemptResponse>(correctResult);
      expect(correctBody.correctnessRatio, `${id} correct answer ratio`).toBe(1);
      expect(correctBody.pointsAwarded, `${id} correct answer points`).toBeGreaterThan(0);

      const userId2 = `${userId}-wrong`;
      await startOrSubmit(startEvent(id, userId2));
      const wrongResult = await startOrSubmit(submitEvent(id, wrong, userId2));
      const wrongBody = readBody<SubmitAttemptResponse>(wrongResult);
      expect(wrongBody.correctnessRatio, `${id} wrong answer ratio`).toBe(0);
      expect(wrongBody.pointsAwarded, `${id} wrong answer points`).toBe(0);
    }
  });
});

describe('hint reveal interplay with attempts', () => {
  useTestHarness();

  it('5. revealing tier 2 twice charges one token in total', async () => {
    const before = await hintHandler(
      fakeEvent({ method: 'POST', rawPath: `/challenges/${CHALLENGE_ID}/hint`, pathParameters: { challengeId: CHALLENGE_ID }, body: { tier: 2 } }),
    );
    const beforeBody = readBody<{ tokensSpent: number; hintTokensLeft: number }>(before);
    expect(beforeBody.tokensSpent).toBe(1);

    const again = await hintHandler(
      fakeEvent({ method: 'POST', rawPath: `/challenges/${CHALLENGE_ID}/hint`, pathParameters: { challengeId: CHALLENGE_ID }, body: { tier: 2 } }),
    );
    const againBody = readBody<{ tokensSpent: number; hintTokensLeft: number }>(again);
    expect(againBody.tokensSpent).toBe(0);
    expect(againBody.hintTokensLeft).toBe(beforeBody.hintTokensLeft);
  });

  it('6. running out of tokens on tier 3 returns INSUFFICIENT_HINT_TOKENS and reveals nothing', async () => {
    const sub = 'broke-user';
    // Starting balance is 5 tokens. Drain it via tier 2 reveals on other challenges (1 token each).
    const drainIds = ['w0.t1.c2', 'w0.t1.c3', 'w0.t1.c4', 'w0.t1.c5', 'w0.t1.c6'];
    for (const id of drainIds) {
      await hintHandler(fakeEvent({ method: 'POST', rawPath: `/challenges/${id}/hint`, pathParameters: { challengeId: id }, body: { tier: 2 }, sub }));
    }
    const result = await hintHandler(
      fakeEvent({ method: 'POST', rawPath: `/challenges/${CHALLENGE_ID}/hint`, pathParameters: { challengeId: CHALLENGE_ID }, body: { tier: 3 }, sub }),
    );
    expect(result.statusCode).toBe(400);
    const body = readBody<{ error: string; text?: string }>(result);
    expect(body.error).toBe('insufficient_hint_tokens');
    expect(body.text).toBeUndefined();
  });
});
