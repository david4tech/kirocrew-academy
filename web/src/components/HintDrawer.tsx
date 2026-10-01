import { useState } from 'react';
import { Lightbulb, Lock } from 'lucide-react';
import type { HintTier } from '@kirocrew-academy/shared';
import { HINT_TOKEN_COST } from '@kirocrew-academy/shared';
import { KiroGhost } from './KiroGhost';
import { Button } from './Button';

export interface RevealedHint {
  tier: HintTier;
  text: string;
}

/** Three tier hint drawer. Each tier costs tokens as declared by the shared HINT_TOKEN_COST table. */
export function HintDrawer({
  revealed,
  hintTokensLeft,
  onReveal,
  disabled,
}: {
  revealed: RevealedHint[];
  hintTokensLeft: number;
  onReveal: (tier: HintTier) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<HintTier | null>(null);
  const tiers: HintTier[] = [1, 2, 3];

  async function handleReveal(tier: HintTier) {
    setPending(tier);
    try {
      await onReveal(tier);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg-panel">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Lightbulb size={16} className="text-warning" aria-hidden="true" />
          Hints ({hintTokensLeft} tokens left)
        </span>
        <span aria-hidden="true">{open ? '-' : '+'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          {tiers.map((tier) => {
            const found = revealed.find((h) => h.tier === tier);
            const cost = HINT_TOKEN_COST[tier];
            const canAfford = hintTokensLeft >= cost;

            return (
              <div key={tier} className="flex items-start gap-3">
                <KiroGhost size={28} mood="thinking" label="" />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                    Tier {tier} - {cost === 0 ? 'free' : `${cost} token${cost > 1 ? 's' : ''}`}
                  </p>
                  {found ? (
                    <p className="mt-1 rounded-lg bg-bg-inset p-2 text-sm text-text">{found.text}</p>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-1 text-xs"
                      disabled={disabled || !canAfford || pending !== null}
                      onClick={() => handleReveal(tier)}
                    >
                      {!canAfford && <Lock size={12} aria-hidden="true" />}
                      {pending === tier ? 'Revealing...' : `Reveal tier ${tier}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
