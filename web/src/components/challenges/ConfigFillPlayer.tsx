import type { ConfigFillChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** Monospace input, prefilled with the starter text when the challenge declares one. */
export function ConfigFillPlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'config-fill'; value: string }>) {
  const c = challenge as unknown as ConfigFillChallenge & { hintTiers: number };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${c.id}-answer`} className="text-sm font-medium text-text">
        Your answer
      </label>
      <textarea
        id={`${c.id}-answer`}
        rows={3}
        disabled={disabled}
        placeholder={c.starter || 'Type the expected value...'}
        className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 font-mono text-sm text-text placeholder:text-text-faint focus-visible:border-kiro-400 disabled:opacity-70"
        value={answer?.value ?? c.starter ?? ''}
        onChange={(e) => onChange({ kind: 'config-fill', value: e.target.value })}
        spellCheck={false}
      />
    </div>
  );
}
