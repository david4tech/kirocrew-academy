import { useEffect, useState } from 'react';
import { Award, Flame, Ticket } from 'lucide-react';
import type { ProgressSnapshot } from '@kirocrew-academy/shared';
import { xpToNextRank } from '@kirocrew-academy/shared';
import { KiroGhost } from '../components/KiroGhost';
import { LoadingGhost } from '../components/LoadingGhost';
import { api, ApiClientError } from '../lib/api';
import { content } from '../lib/content';
import { useAcademyStore } from '../store/academyStore';

export function ProgressPage() {
  const setProgress = useAcademyStore((s) => s.setProgress);
  const setProfile = useAcademyStore((s) => s.setProfile);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getProgress()
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setProgress(data);
        setProfile(data.profile);
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
  }, [setProgress, setProfile]);

  if (loading) return <LoadingGhost label="Tallying your progress..." />;

  if (error || !snapshot) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl border border-danger bg-danger-bg p-4 text-sm text-danger">
        {error ?? 'No progress data available.'}
      </div>
    );
  }

  const { profile, worlds } = snapshot;
  const rank = xpToNextRank(profile.xp);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <KiroGhost size={72} mood={profile.comboStreak >= 5 ? 'celebrating' : 'idle'} float label="" />
        <div>
          <h1 className="text-2xl font-bold text-text">{profile.displayName}</h1>
          <p className="text-sm text-text-muted">{profile.rankTitle}</p>
        </div>
      </div>

      <section aria-label="Rank progress" className="rounded-2xl border border-border bg-bg-raised p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text">{profile.xp} XP</span>
          <span className="text-text-muted">{rank.next ? `${rank.remaining} XP to ${rank.next}` : 'Max rank reached'}</span>
        </div>
        <div
          className="mt-2 h-3 w-full overflow-hidden rounded-full bg-bg-inset"
          role="progressbar"
          aria-valuenow={Math.round(rank.pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next rank"
        >
          <div className="h-full rounded-full bg-kiro-500" style={{ width: `${rank.pct * 100}%` }} />
        </div>
      </section>

      <section aria-label="Stats" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Flame} label="Combo streak" value={profile.comboStreak} />
        <StatCard icon={Ticket} label="Hint tokens" value={profile.hintTokens} />
        <StatCard icon={Award} label="Badges earned" value={profile.badges.length} />
      </section>

      <section aria-label="Mastery per world" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-text">Mastery per world</h2>
        {worlds.map((wp) => {
          const world = content.worlds.find((w) => w.id === wp.worldId);
          const pct = Math.round(wp.masteryPct * 100);
          return (
            <div key={wp.worldId} className="rounded-xl border border-border bg-bg-raised p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text">{world?.title ?? wp.worldId}</span>
                <span className="text-text-muted">{pct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-inset" role="presentation">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: world?.accent ?? '#8B5CF6' }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section aria-label="Badges" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-text">Badges</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profile.badges.map((badge) => (
            <div key={badge.id} className="flex flex-col items-center gap-2 rounded-xl border border-kiro-600 bg-kiro-900/30 p-3 text-center">
              <KiroGhost size={40} mood="celebrating" label="" />
              <p className="text-xs font-semibold text-text">{badge.title}</p>
            </div>
          ))}
          {profile.badges.length === 0 && <p className="col-span-full text-sm text-text-muted">No badges yet. Master a challenge to earn your first.</p>}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-raised p-4">
      <Icon size={20} className="text-kiro-300" aria-hidden="true" />
      <div>
        <p className="text-lg font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}
