import type { AnswerPayload, PublicChallenge } from '@kirocrew-academy/shared';
import { SingleChoicePlayer } from './SingleChoicePlayer';
import { MultiChoicePlayer } from './MultiChoicePlayer';
import { TrueFalsePlayer } from './TrueFalsePlayer';
import { ToolNamePlayer } from './ToolNamePlayer';
import { ConfigFillPlayer } from './ConfigFillPlayer';
import { SequencePlayer } from './SequencePlayer';
import { MatchingPlayer } from './MatchingPlayer';
import { SimulationPlayer } from './SimulationPlayer';
import { DebugFixPlayer } from './DebugFixPlayer';

/** Returns the empty answer shape for a challenge kind, so the player always has a defined answer to mutate. */
export function emptyAnswerFor(challenge: PublicChallenge): AnswerPayload {
  switch (challenge.kind) {
    case 'single-choice':
      return { kind: 'single-choice', optionId: '' };
    case 'multi-choice':
      return { kind: 'multi-choice', optionIds: [] };
    case 'true-false':
      return { kind: 'true-false', value: true };
    case 'tool-name':
      return { kind: 'tool-name', value: '' };
    case 'config-fill':
      return { kind: 'config-fill', value: challenge.starter ?? '' };
    case 'sequence':
      return { kind: 'sequence', orderedItemIds: challenge.items.map((i) => i.id) };
    case 'matching':
      return { kind: 'matching', pairs: {} };
    case 'simulation':
      return { kind: 'simulation', toolId: '', args: {} };
    case 'debug-fix':
      return { kind: 'debug-fix', value: challenge.brokenCall };
  }
}

/** True once the answer has enough content to be worth submitting. Server still does the real validation. */
export function isAnswerReady(challenge: PublicChallenge, answer: AnswerPayload): boolean {
  switch (answer.kind) {
    case 'single-choice':
      return answer.optionId.length > 0;
    case 'multi-choice':
      return answer.optionIds.length > 0;
    case 'true-false':
      return true;
    case 'tool-name':
      return answer.value.trim().length > 0;
    case 'config-fill':
      return answer.value.trim().length > 0;
    case 'sequence':
      return answer.orderedItemIds.length === (challenge as { items: unknown[] }).items?.length;
    case 'matching':
      return Object.keys(answer.pairs).length === (challenge as { left: unknown[] }).left?.length;
    case 'simulation':
      return answer.toolId.length > 0;
    case 'debug-fix':
      return answer.value.trim().length > 0;
  }
}

export function ChallengeKindRouter({
  challenge,
  answer,
  onChange,
  disabled,
}: {
  challenge: PublicChallenge;
  answer: AnswerPayload;
  onChange: (answer: AnswerPayload) => void;
  disabled?: boolean;
}) {
  switch (challenge.kind) {
    case 'single-choice':
      return (
        <SingleChoicePlayer
          challenge={challenge}
          answer={answer.kind === 'single-choice' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'multi-choice':
      return (
        <MultiChoicePlayer
          challenge={challenge}
          answer={answer.kind === 'multi-choice' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'true-false':
      return (
        <TrueFalsePlayer
          challenge={challenge}
          answer={answer.kind === 'true-false' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'tool-name':
      return (
        <ToolNamePlayer
          challenge={challenge}
          answer={answer.kind === 'tool-name' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'config-fill':
      return (
        <ConfigFillPlayer
          challenge={challenge}
          answer={answer.kind === 'config-fill' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'sequence':
      return (
        <SequencePlayer
          challenge={challenge}
          answer={answer.kind === 'sequence' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'matching':
      return (
        <MatchingPlayer
          challenge={challenge}
          answer={answer.kind === 'matching' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'simulation':
      return (
        <SimulationPlayer
          challenge={challenge}
          answer={answer.kind === 'simulation' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case 'debug-fix':
      return (
        <DebugFixPlayer
          challenge={challenge}
          answer={answer.kind === 'debug-fix' ? answer : null}
          onChange={onChange}
          disabled={disabled}
        />
      );
  }
}
