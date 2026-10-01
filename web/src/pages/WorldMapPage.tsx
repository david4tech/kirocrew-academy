import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Lock, Swords } from 'lucide-react';
import type { ProgressSnapshot, PublicWorld } from '@kirocrew-academy/shared';
import { WORLD_UNLOCK_THRESHOLD } from '@kirocrew-academy/shared';
import { KiroGhost } from '../components/KiroGhost';
import { LoadingGhost } from '../components/LoadingGhost';
import { api, ApiClientError } from '../lib/api';
import { content } from '../lib/content';

export function WorldMapPage() {
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
  }, []);

  if (loading) return <LoadingGhost label="Mapping the worlds..." />;

  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  const worlds: PublicWorld[] = content.worlds;
  const worldProgress = progress?.worlds ?? [];

  if (worlds.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <KiroGhost size={96} mood="thinking" float label="" />
        <p className="text-text-muted">No worlds have been authored yet. Check back once the content team ships them.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-text">The Seven Worlds</h1>
      <p className="mt-1 text-sm text-text-muted">
        Reach {Math.round(WORLD_UNLOCK_THRESHOLD * 100)} percent mastery of a world to open the next one.
      </p>

      <ol className="mt-8 flex flex-col gap-6">
        {worlds.map((world, index) => {
          const wp = worldProgress.find((w) => w.worldId === world.id);
          const unlocked = wp?.unlocked ?? index === 0;
          const masteryPct = wp?.masteryPct ?? 0;
          const previousWorld = worlds[index - 1];

          return (
            <li key={world.id}>
              <WorldNode
                world={world}
                unlocked={unlocked}
                masteryPct={masteryPct}
                bossDefeated={wp?.bossDefeated ?? false}
                unlockReason={
                  !unlocked && previousWorld
                    ? `Reach ${Math.round(WORLD_UNLOCK_THRESHOLD * 100)} percent mastery of ${previousWorld.title}`
                    : undefined
                }
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function WorldNode({
  world,
  unlocked,
  masteryPct,
  bossDefeated,
  unlockReason,
}: {
  world: PublicWorld;
  unlocked: boolean;
  masteryPct: number;
  bossDefeated: boolean;
  unlockReason?: string;
}) {
  const pct = Math.round(masteryPct * 100);
  const content_ = (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
        unlocked ? 'border-border bg-bg-raised hover:border-kiro-400' : 'border-border bg-bg-inset opacity-70'
      }`}
      style={unlocked ? { borderColor: world.accent } : undefined}
    >
      <MasteryRing pct={pct} accent={world.accent} locked={!unlocked} />

      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-text">{world.title}</h2>
          {bossDefeated && <Swords size={16} className="text-warning" aria-label="Boss defeated" />}
        </div>
        <p className="text-sm text-text-muted">{world.subtitle}</p>
        {!unlocked && unlockReason && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-faint">
            <Lock size={12} aria-hidden="true" />
            {unlockReason}
          </p>
        )}
      </div>

      {!unlocked && (
        <div className="relative shrink-0 opacity-60" aria-hidden="true">
          <KiroGhost size={40} mood="sad" />
          <Lock size={16} className="absolute -bottom-1 -right-1 rounded-full bg-bg-panel p-0.5 text-text-faint" />
        </div>
      )}
    </div>
  );

  if (!unlocked) {
    return (
      <div aria-disabled="true" aria-label={`${world.title}, locked. ${unlockReason ?? ''}`}>
        {content_}
      </div>
    );
  }

  return (
    <Link to={`/world/${world.id}`} className="block" aria-label={`${world.title}, ${pct} percent mastered`}>
      {content_}
    </Link>
  );
}

function MasteryRing({ pct, accent, locked }: { pct: number; accent: string; locked: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = locked ? 'var(--color-text-faint)' : accent;

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-border)" strokeWidth={5} />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-text">{pct}%</span>
    </div>
  );
}
