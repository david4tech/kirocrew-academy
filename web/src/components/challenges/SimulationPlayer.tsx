import type { SimulationChallenge } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/** Tool palette plus an argument form generated from argSpecs. */
export function SimulationPlayer({
  challenge,
  answer,
  onChange,
  disabled,
}: ChallengeKindProps<{ kind: 'simulation'; toolId: string; args: Record<string, string | boolean> }>) {
  const c = challenge as unknown as SimulationChallenge & { hintTiers: number };
  const toolId = answer?.toolId ?? '';
  const args = answer?.args ?? {};

  function setTool(nextToolId: string) {
    onChange({ kind: 'simulation', toolId: nextToolId, args });
  }

  function setArg(name: string, value: string | boolean) {
    onChange({ kind: 'simulation', toolId, args: { ...args, [name]: value } });
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="text-sm font-medium text-text">Pick a tool</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {c.toolPalette.map((tool) => {
            const checked = toolId === tool.id;
            return (
              <label
                key={tool.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-sm transition-colors ${
                  checked ? 'border-kiro-400 bg-kiro-900/40 text-text' : 'border-border-strong bg-bg-inset text-text-muted hover:border-kiro-600'
                } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name={`${c.id}-tool`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => setTool(tool.id)}
                  className="h-4 w-4 accent-kiro-500"
                />
                {tool.text}
              </label>
            );
          })}
        </div>
      </fieldset>

      {toolId && (
        <fieldset className="flex flex-col gap-3" disabled={disabled}>
          <legend className="text-sm font-medium text-text">Arguments</legend>
          {c.argSpecs.map((spec) => (
            <div key={spec.name} className="flex flex-col gap-1.5">
              <label htmlFor={`${c.id}-${spec.name}`} className="text-sm text-text-muted">
                {spec.label}
                {spec.required && <span aria-hidden="true"> *</span>}
              </label>
              <ArgInput
                id={`${c.id}-${spec.name}`}
                spec={spec}
                value={args[spec.name]}
                disabled={disabled}
                onChange={(v) => setArg(spec.name, v)}
              />
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}

function ArgInput({
  id,
  spec,
  value,
  disabled,
  onChange,
}: {
  id: string;
  spec: SimulationChallenge['argSpecs'][number];
  value: string | boolean | undefined;
  disabled?: boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (spec.input === 'boolean') {
    return (
      <select
        id={id}
        disabled={disabled}
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-sm text-text focus-visible:border-kiro-400 disabled:opacity-70"
      >
        <option value="" disabled>
          Choose true or false
        </option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (spec.input === 'select') {
    return (
      <select
        id={id}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 text-sm text-text focus-visible:border-kiro-400 disabled:opacity-70"
      >
        <option value="" disabled>
          Choose a value
        </option>
        {(spec.options ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.text}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={id}
      type="text"
      disabled={disabled}
      placeholder={spec.placeholder}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 font-mono text-sm text-text placeholder:text-text-faint focus-visible:border-kiro-400 disabled:opacity-70"
    />
  );
}
