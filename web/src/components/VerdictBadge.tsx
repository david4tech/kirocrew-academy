import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

/**
 * Right/wrong/partial indicator. Colour is never the only signal: an icon and
 * text always accompany it, per the accessibility requirement.
 */
export type Verdict = 'correct' | 'partial' | 'incorrect';

const VERDICT_META: Record<Verdict, { icon: typeof CheckCircle2; label: string; classes: string }> = {
  correct: { icon: CheckCircle2, label: 'Correct', classes: 'text-success bg-success-bg border-success/40' },
  partial: { icon: MinusCircle, label: 'Partial credit', classes: 'text-warning bg-warning-bg border-warning/40' },
  incorrect: { icon: XCircle, label: 'Incorrect', classes: 'text-danger bg-danger-bg border-danger/40' },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.classes}`}>
      <Icon size={16} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
