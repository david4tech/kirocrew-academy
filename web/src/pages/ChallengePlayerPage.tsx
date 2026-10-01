import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import type { AnswerPayload, HintTier, SubmitAttemptResponse } from '@kirocrew-academy/shared';
import { KiroGhost, type GhostMood } from '../components/KiroGhost';
import { LoadingGhost } from '../components/LoadingGhost';
import { Button } from '../components/Button';
import { ScorePreview } from '../components/ScorePreview';
import { HintDrawer, type RevealedHint } from '../components/HintDrawer';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { ChallengeKindRouter, emptyAnswerFor, isAnswerReady } from '../components/challenges/ChallengeKindRouter';
import { useScorePreview } from '../lib/useScorePreview';
import { api, ApiClientError } from '../lib/api';
import { findTopic } from '../lib/content';
import { useAcademyStore } from '../store/academyStore';

export function ChallengePlayerPage() {
  const { worldId, topicId } = useParams<{ worldId: string; topicId: string }>();
  const navigate = useNavigate();
  const profile = useAcademyStore((s) => s.profile);
  const setProfile = useAcademyStore((s) => s.setProfile);

  const topic = worldId && topicId ? findTopic(worldId, topicId) : undefined;

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerPayload | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [hintTokensLeft, setHintTokensLeft] = useState(profile?.hintTokens ?? 0);
  const [revealedHints, setRevealedHints] = useState<RevealedHint[]>([]);
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const challenge = topic?.challenges[index];

  useEffect(() => {
    setHintTokensLeft(profile?.hintTokens ?? 0);
  }, [profile?.hintTokens]);

  // START_ATTEMPT must be called before a challenge is shown, per the brief and the architecture doc.
  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    setAnswer(emptyAnswerFor(challenge));
    setStartedAt(null);
    setRevealedHints([]);
    setResult(null);
    setError(null);
    setStartError(null);

    api
      .startAttempt(challenge.id)
      .then((res) => {
        if (!cancelled) setStartedAt(res.startedAt);
      })
      .catch((err) => {
        if (!cancelled) setStartError(err instanceof ApiClientError ? err.message : 'Could not open this challenge.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.id]);

  const breakdown = useScorePreview({
    kind: challenge?.kind ?? 'single-choice',
    difficulty: challenge?.difficulty ?? 'easy',
    boss: challenge?.boss ?? false,
    firstAttempt: true,
    comboStreak: profile?.comboStreak ?? 0,
    hintsUsed: revealedHints.length,
    targetSeconds: challenge?.targetSeconds ?? 30,
    startedAt,
  });

  if (!worldId || !topicId) return <Navigate to="/map" replace />;
  if (!topic) return <Navigate to={`/world/${worldId}`} replace />;

  if (!challenge) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <KiroGhost size={96} mood="celebrating" float label="" />
        <h1 className="text-xl font-bold text-text">Topic complete</h1>
        <Link to={`/world/${worldId}`}>
          <Button>Back to topic list</Button>
        </Link>
      </div>
    );
  }

  const currentChallenge = challenge;

  const ghostMood: GhostMood = result
    ? result.outcome === 'correct'
      ? 'celebrating'
      : result.outcome === 'partial'
        ? 'idle'
        : 'sad'
    : 'idle';

  async function handleReveal(tier: HintTier) {
    try {
      const res = await api.revealHint(currentChallenge.id, { tier });
      setRevealedHints((prev) => [...prev, { tier: res.tier, text: res.text }]);
      setHintTokensLeft(res.hintTokensLeft);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not reveal that hint.');
    }
  }

  async function handleSubmit() {
    if (!answer) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitAttempt(currentChallenge.id, { answer });
      setResult(res);
      setProfile(res.profile);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not submit that answer.');
    } finally {
      setSubmitting(false);
    }
  }

  const ready = answer !== null && isAnswerReady(currentChallenge, answer);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link to={`/world/${worldId}/topic/${topicId}`} className="text-sm text-text-muted hover:text-text">
        Back to topic
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KiroGhost size={44} mood={ghostMood} label="" />
          <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Challenge {index + 1} of {topic.challenges.length} - {currentChallenge.difficulty}
            {currentChallenge.boss ? ' - boss' : ''}
          </p>
        </div>
        {!result && <ScorePreview breakdown={breakdown} />}
      </div>

      <div className="rounded-2xl border border-border bg-bg-raised p-5">
        {currentChallenge.scenario && (
          <p className="mb-3 rounded-lg bg-bg-inset p-3 text-sm italic text-text-muted">{currentChallenge.scenario}</p>
        )}
        <p className="text-lg font-medium text-text">{currentChallenge.prompt}</p>

        <div className="mt-5">
          {startError ? (
            <p role="alert" className="text-sm text-danger">
              {startError}
            </p>
          ) : !startedAt ? (
            <LoadingGhost label="Opening the attempt window..." />
          ) : (
            answer && (
              <ChallengeKindRouter
                challenge={currentChallenge}
                answer={answer}
                onChange={setAnswer}
                disabled={submitting || result !== null}
              />
            )
          )}
        </div>
      </div>

      {startedAt && !result && (
        <HintDrawer revealed={revealedHints} hintTokensLeft={hintTokensLeft} onReveal={handleReveal} disabled={submitting} />
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {result ? (
        <div className="flex flex-col gap-4">
          <ExplanationPanel verdict={result.outcome} points={result.pointsAwarded} explanation={result.explanation} />
          <Button
            onClick={() => {
              if (index + 1 < topic.challenges.length) setIndex((i) => i + 1);
              else navigate(`/world/${worldId}`);
            }}
          >
            {index + 1 < topic.challenges.length ? 'Next challenge' : 'Finish topic'}
          </Button>
        </div>
      ) : (
        <Button onClick={handleSubmit} disabled={!ready || submitting || !startedAt}>
          {submitting ? 'Grading...' : 'Submit answer'}
        </Button>
      )}
    </div>
  );
}
