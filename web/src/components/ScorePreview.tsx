import { Sparkles } from 'lucide-react';
import type { ScoreBreakdown } from '@kirocrew-academy/shared';

/** Shows what a fully correct, current-hint-state answer would be worth right now. */
export function ScorePreview({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-kiro-700 bg-kiro-900/30 px-3 py-1.5 text-sm text-kiro-200"
      aria-live="off"
    >
      <Sparkles size={14} aria-hidden="true" />
      <span>
        Potential score: <strong className="text-text">{breakdown.points} pts</strong>
      </span>
    </div>
  );
}
