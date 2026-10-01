import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { ROLE_LABELS, type LeaderboardResponse, type Role } from '@kirocrew-academy/shared';
import { KiroGhost } from '../components/KiroGhost';
import { LoadingGhost } from '../components/LoadingGhost';
import { api, ApiClientError } from '../lib/api';
import { useAcademyStore } from '../store/academyStore';

type Scope = 'all' | Role;

export function LeaderboardPage() {
  const profile = useAcademyStore((s) => s.profile);
  const [scope, setScope] = useState<Scope>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getLeaderboard({ scope, limit: 25 })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : 'Could not load the leaderboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const myRoleScope: Scope = profile?.role ?? 'all';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <KiroGhost size={56} mood="happy" label="" />
        <h1 className="text-2xl font-bold text-text">Leaderboard</h1>
      </div>

      <div role="tablist" aria-label="Leaderboard scope" className="flex gap-2">
        <button
          role="tab"
          aria-selected={scope === 'all'}
          onClick={() => setScope('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            scope === 'all' ? 'bg-kiro-600 text-white' : 'bg-bg-panel text-text-muted hover:text-text'
          }`}
        >
          All roles
        </button>
        <button
          role="tab"
          aria-selected={scope === myRoleScope && myRoleScope !== 'all'}
          disabled={!profile?.role}
          onClick={() => profile?.role && setScope(profile.role)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            scope !== 'all' ? 'bg-kiro-600 text-white' : 'bg-bg-panel text-text-muted hover:text-text'
          }`}
        >
          My role{profile?.role ? ` (${ROLE_LABELS[profile.role]})` : ''}
        </button>
      </div>

      {loading ? (
        <LoadingGhost label="Ranking the crew..." />
      ) : error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {(data?.entries ?? []).map((entry) => (
            <li
              key={entry.position}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                entry.isCurrentUser ? 'border-kiro-400 bg-kiro-900/30' : 'border-border bg-bg-raised'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex w-8 items-center justify-center font-mono text-sm text-text-faint">
                  {entry.position === 1 ? <Crown size={16} className="text-warning" aria-label="Rank 1" /> : entry.position}
                </span>
                <div>
                  <p className="text-sm font-medium text-text">
                    {entry.displayName}
                    {entry.isCurrentUser && ' (you)'}
                  </p>
                  <p className="text-xs text-text-muted">{entry.rankTitle}</p>
                </div>
              </div>
              <span className="font-mono text-sm text-text">{entry.xp} XP</span>
            </li>
          ))}
          {data && data.entries.length === 0 && <p className="text-sm text-text-muted">No entries yet.</p>}
        </ol>
      )}
    </div>
  );
}
