import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnswerPayload, PublicChallenge } from '@kirocrew-academy/shared';
import { ChallengeKindRouter, emptyAnswerFor, isAnswerReady } from './ChallengeKindRouter';

/**
 * One rendering test per challenge kind. Each asserts a keyboard only path to
 * a submittable answer: no fireEvent.click and no pointer coordinates, only
 * tab/type/space/arrow key interactions via @testing-library/user-event.
 */

const commonFields = {
  worldId: 'w0',
  topicId: 'w0.t1',
  difficulty: 'easy' as const,
  prompt: 'Prompt',
  hintTiers: 3,
  explanation: 'Explanation',
  docRef: 'doc.md',
  targetSeconds: 30,
};

/** Stateful wrapper so typed keystrokes accumulate exactly like the real player shell. */
function StatefulRouter({
  challenge,
  initial,
  onChange,
}: {
  challenge: PublicChallenge;
  initial?: AnswerPayload;
  onChange: (a: AnswerPayload) => void;
}) {
  const [answer, setAnswer] = useState<AnswerPayload>(initial ?? emptyAnswerFor(challenge));
  return (
    <ChallengeKindRouter
      challenge={challenge}
      answer={answer}
      onChange={(next) => {
        setAnswer(next);
        onChange(next);
      }}
    />
  );
}

function renderStateful(challenge: PublicChallenge, initial?: AnswerPayload) {
  const onChange = vi.fn();
  const utils = render(<StatefulRouter challenge={challenge} initial={initial} onChange={onChange} />);
  return { onChange, ...utils };
}

describe('SingleChoicePlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c1',
    kind: 'single-choice',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
  };

  it('lets a keyboard user tab to a radio and select it with space', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStateful(challenge);

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith({ kind: 'single-choice', optionId: 'a' });
    const answer: AnswerPayload = { kind: 'single-choice', optionId: 'a' };
    expect(isAnswerReady(challenge, answer)).toBe(true);
  });
});

describe('MultiChoicePlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c2',
    kind: 'multi-choice',
    options: [
      { id: 'a', text: 'Option A' },
      { id: 'b', text: 'Option B' },
    ],
  };

  it('lets a keyboard user check a box with tab then space', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStateful(challenge);

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith({ kind: 'multi-choice', optionIds: ['a'] });
  });
});

describe('TrueFalsePlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c3',
    kind: 'true-false',
    statement: 'A statement to judge.',
  };

  it('renders the statement and lets a keyboard user pick false', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStateful(challenge);

    expect(screen.getByText('A statement to judge.')).toBeInTheDocument();
    const falseRadio = screen.getByRole('radio', { name: 'False' });
    falseRadio.focus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith({ kind: 'true-false', value: false });
  });
});

describe('ToolNamePlayer', () => {
  const challenge: PublicChallenge = { ...commonFields, id: 'w0.t1.c4', kind: 'tool-name' };

  it('accepts typed input via the keyboard', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStateful(challenge);

    await user.tab();
    await user.keyboard('reset_conversation');

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'tool-name', value: 'reset_conversation' });
    expect(isAnswerReady(challenge, { kind: 'tool-name', value: 'reset_conversation' })).toBe(true);
  });
});

describe('ConfigFillPlayer', () => {
  const challenge: PublicChallenge = { ...commonFields, id: 'w0.t1.c5', kind: 'config-fill', starter: '' };

  it('accepts typed input in the textarea', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStateful(challenge);

    await user.tab();
    await user.keyboard('0 9 * * 1-5');

    expect(onChange).toHaveBeenLastCalledWith({ kind: 'config-fill', value: '0 9 * * 1-5' });
  });
});

describe('SequencePlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c6',
    kind: 'sequence',
    items: [
      { id: 's1', text: 'Step one' },
      { id: 's2', text: 'Step two' },
      { id: 's3', text: 'Step three' },
    ],
  };

  it('reorders items with the keyboard accessible move-down button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChallengeKindRouter
        challenge={challenge}
        answer={{ kind: 'sequence', orderedItemIds: ['s1', 's2', 's3'] }}
        onChange={onChange}
      />,
    );

    const moveDownButtons = screen.getAllByRole('button', { name: /move step 1 down/i });
    moveDownButtons[0].focus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith({ kind: 'sequence', orderedItemIds: ['s2', 's1', 's3'] });
  });
});

describe('MatchingPlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c7',
    kind: 'matching',
    left: [{ id: 'l1', text: 'Left one' }],
    right: [
      { id: 'r1', text: 'Right one' },
      { id: 'r2', text: 'Right two' },
    ],
  };

  it('selects a match via the keyboard accessible native select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ChallengeKindRouter challenge={challenge} answer={{ kind: 'matching', pairs: {} }} onChange={onChange} />);

    const select = screen.getByLabelText(/match for left one/i);
    await user.selectOptions(select, 'r2');

    expect(onChange).toHaveBeenCalledWith({ kind: 'matching', pairs: { l1: 'r2' } });
  });
});

describe('SimulationPlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c8',
    kind: 'simulation',
    toolPalette: [{ id: 'cron_add', text: 'cron_add' }],
    argSpecs: [{ name: 'cron_expr', label: 'cron_expr', input: 'text', required: true }],
  };

  it('picks a tool from the palette with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChallengeKindRouter challenge={challenge} answer={{ kind: 'simulation', toolId: '', args: {} }} onChange={onChange} />,
    );

    await user.tab();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith({ kind: 'simulation', toolId: 'cron_add', args: {} });
  });
});

describe('DebugFixPlayer', () => {
  const challenge: PublicChallenge = {
    ...commonFields,
    id: 'w0.t1.c9',
    kind: 'debug-fix',
    brokenCall: '{"session":"slack"}',
    language: 'json',
  };

  it('lets a keyboard user edit the prefilled broken call', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChallengeKindRouter
        challenge={challenge}
        answer={{ kind: 'debug-fix', value: challenge.brokenCall }}
        onChange={onChange}
      />,
    );

    const editor = screen.getByLabelText(/fix the call/i);
    expect(editor).toHaveValue('{"session":"slack"}');
    await user.tab();
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenCalled();
  });
});
