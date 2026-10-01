import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Lock, CheckCircle2 } from 'lucide-react';
import type { ProgressSnapshot } from '@kirocrew-academy/shared';
import { LoadingGhost } from '../components/LoadingGhost';
import { KiroGhost } from '../components/KiroGhost';
import { api, ApiClientError } from '../lib/api';
import { findWorld } from '../lib/content';

export function TopicListPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getProgress()
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : 'Could not load your progress.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldId]);

  if (!worldId) return <Navigate to="/map" replace />;

  const world = findWorld(worldId);
  if (!world) return <Navigate to="/map" replace />;

  if (loading) return <LoadingGhost label="Opening the topic list..." />;

  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  const worldProgress = progress?.worlds.find((w) => w.worldId === worldId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/map" className="text-sm text-text-muted hover:text-text">
        Back to world map
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <KiroGhost size={48} mood="idle" label="" />
        <div>
          <h1 className="text-2xl font-bold text-text" style={{ color: world.accent }}>
            {world.title}
          </h1>
          <p className="text-sm text-text-muted">{world.subtitle}</p>
        </div>
      </div>

      <ol className="mt-8 flex flex-col gap-3">
        {world.topics.map((topic) => {
          const tp = worldProgress?.topics.find((t) => t.topicId === topic.id);
          const unlocked = tp?.unlocked ?? false;
          const complete = tp?.complete ?? false;
          const masteredCount = tp?.masteredCount ?? 0;
          const total = tp?.total ?? topic.challenges.length;

          const body = (
            <div
              className={`flex items-center gap-4 rounded-xl border p-4 ${
                unlocked ? 'border-border bg-bg-raised hover:border-kiro-400' : 'border-border bg-bg-inset opacity-70'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-text">{topic.title}</h2>
                  {complete && <CheckCircle2 size={16} className="text-success" aria-label="Complete" />}
                </div>
                <p className="text-sm text-text-muted">{topic.summary}</p>
                <p className="mt-1 text-xs text-text-faint">
                  {masteredCount} / {total} mastered
                  {!unlocked && ' - complete the previous topic to unlock'}
                </p>
              </div>
              {!unlocked && <Lock size={18} className="text-text-faint" aria-hidden="true" />}
            </div>
          );

          return (
            <li key={topic.id}>
              {unlocked ? (
                <Link to={`/world/${worldId}/topic/${topic.id}`} aria-label={`${topic.title}, ${masteredCount} of ${total} mastered`}>
                  {body}
                </Link>
              ) : (
                <div aria-disabled="true" aria-label={`${topic.title}, locked`}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
