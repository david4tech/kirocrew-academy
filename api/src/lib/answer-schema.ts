/**
 * Zod validation for the answer payload shape, one schema per challenge kind.
 * Runs before grading so a malformed body never reaches gradeAnswer.
 */

import { z } from 'zod';
import type { ChallengeKind } from '@kirocrew-academy/shared';

const singleChoiceAnswer = z.object({ kind: z.literal('single-choice'), optionId: z.string().min(1) });
const multiChoiceAnswer = z.object({ kind: z.literal('multi-choice'), optionIds: z.array(z.string().min(1)) });
const trueFalseAnswer = z.object({ kind: z.literal('true-false'), value: z.boolean() });
const toolNameAnswer = z.object({ kind: z.literal('tool-name'), value: z.string() });
const configFillAnswer = z.object({ kind: z.literal('config-fill'), value: z.string() });
const sequenceAnswer = z.object({ kind: z.literal('sequence'), orderedItemIds: z.array(z.string().min(1)) });
const matchingAnswer = z.object({ kind: z.literal('matching'), pairs: z.record(z.string(), z.string()) });
const simulationAnswer = z.object({
  kind: z.literal('simulation'),
  toolId: z.string().min(1),
  args: z.record(z.string(), z.union([z.string(), z.boolean()])),
});
const debugFixAnswer = z.object({ kind: z.literal('debug-fix'), value: z.string() });

const schemaByKind: Record<ChallengeKind, z.ZodType> = {
  'single-choice': singleChoiceAnswer,
  'multi-choice': multiChoiceAnswer,
  'true-false': trueFalseAnswer,
  'tool-name': toolNameAnswer,
  'config-fill': configFillAnswer,
  sequence: sequenceAnswer,
  matching: matchingAnswer,
  simulation: simulationAnswer,
  'debug-fix': debugFixAnswer,
};

export function answerSchemaFor(kind: ChallengeKind): z.ZodType {
  return schemaByKind[kind];
}
