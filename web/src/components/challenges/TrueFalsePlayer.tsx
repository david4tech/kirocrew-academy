import type { TrueFalseChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** true-false as radio cards, per the brief. */
export function TrueFalsePlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'true-false'; value: boolean }>) {
  const c = challenge as unknown as TrueFalseChallenge & { hintTiers: number };
  const options: Array<{ id: string; value: boolean; label: string }> = [
    { id: 'true', value: true, label: 'True' },
    { id: 'false', value: false, label: 'False' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg bg-bg-inset p-3 text-sm text-text">{c.statement}</p>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="sr-only">True or false</legend>
        {options.map((option) => {
          const checked = answer?.value === option.value;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                checked ? 'border-kiro-400 bg-kiro-900/40 text-text' : 'border-border-strong bg-bg-inset text-text-muted hover:border-kiro-600'
              } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                type="radio"
                name={`${c.id}-tf`}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange({ kind: 'true-false', value: option.value })}
                className="h-4 w-4 accent-kiro-500"
              />
              {option.label}
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
