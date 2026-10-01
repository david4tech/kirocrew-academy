import type { MultiChoiceChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** Checkable cards, no auto-submit: the learner reviews their set before the shared submit button fires. */
export function MultiChoicePlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'multi-choice'; optionIds: string[] }>) {
  const c = challenge as unknown as MultiChoiceChallenge & { hintTiers: number };
  const selected = new Set(answer?.optionIds ?? []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ kind: 'multi-choice', optionIds: [...next] });
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="sr-only">Choose every answer that applies</legend>
      {c.options.map((option) => {
        const checked = selected.has(option.id);
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              checked ? 'border-kiro-400 bg-kiro-900/40 text-text' : 'border-border-strong bg-bg-inset text-text-muted hover:border-kiro-600'
            } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(option.id)}
              className="h-4 w-4 accent-kiro-500"
            />
            {option.text}
          </label>
        );
      })}
    </fieldset>
  );
}
