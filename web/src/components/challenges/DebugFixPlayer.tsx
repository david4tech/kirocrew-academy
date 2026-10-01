import type { DebugFixChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** Editor prefilled with the broken call. The learner repairs it in place. */
export function DebugFixPlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'debug-fix'; value: string }>) {
  const c = challenge as unknown as DebugFixChallenge & { hintTiers: number };
  const value = answer?.value ?? c.brokenCall;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${c.id}-editor`} className="text-sm font-medium text-text">
        Fix the call ({c.language})
      </label>
      <textarea
        id={`${c.id}-editor`}
        rows={8}
        disabled={disabled}
        className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 font-mono text-sm leading-relaxed text-text focus-visible:border-kiro-400 disabled:opacity-70"
        value={value}
        onChange={(e) => onChange({ kind: 'debug-fix', value: e.target.value })}
        spellCheck={false}
      />
    </div>
  );
}
