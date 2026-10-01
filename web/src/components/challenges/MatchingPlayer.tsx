import type { MatchingChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/**
 * Two column connect interaction. Each left item gets a native <select> bound
 * to the right column: this is the keyboard accessible form of "connect the
 * dots" (arrow keys plus letter-jump work natively), with the visual column
 * layout the brief asks for.
 */
export function MatchingPlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'matching'; pairs: Record<string, string> }>) {
  const c = challenge as unknown as MatchingChallenge & { hintTiers: number };
  const pairs = answer?.pairs ?? {};

  function setPair(leftId: string, rightId: string) {
    onChange({ kind: 'matching', pairs: { ...pairs, [leftId]: rightId } });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2" aria-hidden="true">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">Match</p>
        {c.left.map((item) => (
          <div key={item.id} className="rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-sm text-text">
            {item.text}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">To</p>
        {c.left.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <label htmlFor={`${c.id}-${item.id}`} className="sr-only">
              Match for {item.text}
            </label>
            <select
              id={`${c.id}-${item.id}`}
              disabled={disabled}
              value={pairs[item.id] ?? ''}
              onChange={(e) => setPair(item.id, e.target.value)}
              className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-sm text-text focus-visible:border-kiro-400 disabled:opacity-70"
            >
              <option value="" disabled>
                Choose a match for &quot;{item.text}&quot;
              </option>
              {c.right.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
