import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { ProgressSnapshot } from '@kirocrew-academy/shared';
import { KiroGhost } from '../components/KiroGhost';
import { LoadingGhost } from '../components/LoadingGhost';
import { api, ApiClientError } from '../lib/api';

/** Free play, visible but locked until sandboxUnlocked is true (w3 boss defeated). */
export function SandboxPage() {
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
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : 'Could not check sandbox access.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingGhost label="Checking sandbox access..." />;

  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  const unlocked = progress?.sandboxUnlocked ?? false;

  if (!unlocked) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <div className="relative opacity-70">
          <KiroGhost size={110} mood="sad" label="" />
          <Lock size={28} className="absolute inset-0 m-auto text-text-faint" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text">Sandbox locked</h1>
        <p className="text-sm text-text-muted">Defeat the World 3 boss to unlock free play.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <KiroGhost size={110} mood="happy" float label="" />
      <h1 className="text-xl font-bold text-text">Sandbox</h1>
      <p className="text-sm text-text-muted">
        Free play is unlocked. Pick any mastered challenge from a world to replay it without affecting your streak.
      </p>
    </div>
  );
}
