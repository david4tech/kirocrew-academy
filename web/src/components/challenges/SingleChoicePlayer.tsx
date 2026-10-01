import type { SingleChoiceChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** Radio cards. Native radio inputs so keyboard nav (arrow keys, space) works for free. */
export function SingleChoicePlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'single-choice'; optionId: string }>) {
  const c = challenge as unknown as SingleChoiceChallenge & { hintTiers: number };

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="sr-only">Choose one answer</legend>
      {c.options.map((option) => {
        const checked = answer?.optionId === option.id;
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              checked ? 'border-kiro-400 bg-kiro-900/40 text-text' : 'border-border-strong bg-bg-inset text-text-muted hover:border-kiro-600'
            } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <input
              type="radio"
              name={`${c.id}-option`}
              value={option.id}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange({ kind: 'single-choice', optionId: option.id })}
              className="h-4 w-4 accent-kiro-500"
            />
            {option.text}
          </label>
        );
      })}
    </fieldset>
  );
}
