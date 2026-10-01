/**
 * Live "potential score" preview, using the exact shared computeScore so the
 * number the learner sees before submitting matches what the server will
 * actually award for a fully correct, unhinted, first try answer at the
 * current elapsed time.
 */
import { useEffect, useState } from 'react';
import { computeScore, type ChallengeKind, type Difficulty } from '@kirocrew-academy/shared';

export interface ScorePreviewInput {
  kind: ChallengeKind;
  difficulty: Difficulty;
  boss: boolean;
  firstAttempt: boolean;
  comboStreak: number;
  hintsUsed: number;
  targetSeconds: number;
  startedAt: string | null;
}

/** Recomputes once a second while the attempt window is open, assuming a fully correct answer. */
export function useScorePreview(input: ScorePreviewInput) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!input.startedAt) return;
    const started = new Date(input.startedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - started) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [input.startedAt]);

  return computeScore({
    kind: input.kind,
    difficulty: input.difficulty,
    boss: input.boss,
    firstAttempt: input.firstAttempt,
    comboStreak: input.comboStreak,
    hintsUsed: input.hintsUsed,
    elapsedSeconds,
    targetSeconds: input.targetSeconds,
    correctnessRatio: 1,
  });
}
