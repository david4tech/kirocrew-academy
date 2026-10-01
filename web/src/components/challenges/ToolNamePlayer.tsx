import type { ChallengeKindProps } from './types';

/** Monospace input hinting the expected tool-name shape. */
export function ToolNamePlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'tool-name'; value: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${challenge.id}-answer`} className="text-sm font-medium text-text">
        Tool name
      </label>
      <input
        id={`${challenge.id}-answer`}
        type="text"
        disabled={disabled}
        placeholder="e.g. monitor_start or @server/tool_name"
        className="w-full rounded-lg border border-border-strong bg-bg-inset px-3 py-2.5 font-mono text-sm text-text placeholder:text-text-faint focus-visible:border-kiro-400 disabled:opacity-70"
        value={answer?.value ?? ''}
        onChange={(e) => onChange({ kind: 'tool-name', value: e.target.value })}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <p className="text-xs text-text-faint">Case and the @server/ prefix are ignored when graded.</p>
    </div>
  );
}
