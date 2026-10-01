import type { AnswerPayload, PublicChallenge } from '@kirocrew-academy/shared';

/** Common props every challenge kind component receives from the player shell. */
export interface ChallengeKindProps<TAnswer extends AnswerPayload = AnswerPayload> {
  challenge: PublicChallenge;
  answer: TAnswer | null;
  onChange: (answer: TAnswer) => void;
  disabled?: boolean;
}
