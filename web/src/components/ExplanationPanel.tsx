import { BookOpen } from 'lucide-react';
import { VerdictBadge, type Verdict } from './VerdictBadge';

export function ExplanationPanel({ verdict, points, explanation }: { verdict: Verdict; points: number; explanation: string }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-3 rounded-xl border border-border bg-bg-panel p-4">
      <div className="flex items-center justify-between">
        <VerdictBadge verdict={verdict} />
        <span className="text-sm font-semibold text-text">+{points} pts</span>
      </div>
      <div className="flex items-start gap-2 text-sm text-text-muted">
        <BookOpen size={16} className="mt-0.5 shrink-0 text-kiro-300" aria-hidden="true" />
        <p>{explanation}</p>
      </div>
    </div>
  );
}
