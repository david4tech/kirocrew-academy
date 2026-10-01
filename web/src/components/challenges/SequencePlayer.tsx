import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import type { SequenceChallenge, SequenceItem } from '@kirocrew-academy/shared';
import type { ChallengeKindProps } from './types';

/**
 * Keyboard accessible reorder list. Drag and drop is available with a mouse,
 * but every reorder is also reachable with the Move up / Move down buttons, so
 * a keyboard only path always exists.
 */
export function SequencePlayer({ challenge, answer, onChange, disabled }: ChallengeKindProps<{ kind: 'sequence'; orderedItemIds: string[] }>) {
  const c = challenge as unknown as SequenceChallenge & { hintTiers: number };
  const [order, setOrder] = useState<string[]>(() => answer?.orderedItemIds ?? c.items.map((i) => i.id));
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!answer) onChange({ kind: 'sequence', orderedItemIds: order });
    // Only runs once on mount to seed the initial answer with the shuffled-free starting order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: string[]) {
    setOrder(next);
    onChange({ kind: 'sequence', orderedItemIds: next });
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function itemFor(id: string): SequenceItem {
    return c.items.find((i) => i.id === id)!;
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Reorder these steps into the correct sequence">
      {order.map((id, index) => (
        <li
          key={id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex === null || dragIndex === index) return;
            const next = [...order];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(index, 0, moved);
            commit(next);
            setDragIndex(null);
          }}
          className="flex items-center gap-3 rounded-xl border border-border-strong bg-bg-inset px-3 py-2.5 text-sm text-text"
        >
          <GripVertical size={16} className="shrink-0 text-text-faint" aria-hidden="true" />
          <span className="w-6 shrink-0 text-center font-mono text-text-faint">{index + 1}</span>
          <span className="flex-1">{itemFor(id).text}</span>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move step ${index + 1} up`}
              className="rounded-lg border border-border-strong p-1.5 text-text-muted hover:border-kiro-400 hover:text-text disabled:opacity-40"
            >
              <ArrowUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={disabled || index === order.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move step ${index + 1} down`}
              className="rounded-lg border border-border-strong p-1.5 text-text-muted hover:border-kiro-400 hover:text-text disabled:opacity-40"
            >
              <ArrowDown size={14} aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
