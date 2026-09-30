/**
 * Runtime validation for authored content packs. The content build fails loudly
 * on a malformed pack rather than shipping a broken challenge to a learner.
 */

import { z } from 'zod';
import { CHALLENGE_KINDS, DIFFICULTIES, ROLES } from './types.js';

const roleEnum = z.enum(ROLES);
const difficultyEnum = z.enum(DIFFICULTIES);
const normalizerEnum = z.enum(['text', 'tool', 'json', 'cron']);

const challengeIdPattern = /^w\d+\.t\d+\.c\d+$/;
const topicIdPattern = /^w\d+\.t\d+$/;
const worldIdPattern = /^w\d+$/;

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const hintSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().min(10, 'a hint needs to actually say something'),
});

const roleVariantSchema = z.object({
  prompt: z.string().min(10),
  scenario: z.string().min(10).optional(),
});

const commonFields = {
  id: z.string().regex(challengeIdPattern, 'challenge id must look like w1.t2.c3'),
  worldId: z.string().regex(worldIdPattern),
  topicId: z.string().regex(topicIdPattern),
  difficulty: difficultyEnum,
  prompt: z.string().min(10),
  scenario: z.string().min(10).optional(),
  roleVariants: z.partialRecord(roleEnum, roleVariantSchema).optional(),
  hints: z
    .tuple([hintSchema, hintSchema, hintSchema])
    .refine((h) => h[0].tier === 1 && h[1].tier === 2 && h[2].tier === 3, {
      message: 'hints must be ordered tier 1, 2, 3',
    }),
  explanation: z.string().min(20, 'the explanation is the teaching moment, make it count'),
  docRef: z.string().min(3),
  targetSeconds: z.number().int().positive().max(900),
  boss: z.boolean().optional(),
};

const singleChoice = z.object({
  ...commonFields,
  kind: z.literal('single-choice'),
  options: z.array(optionSchema).min(3).max(6),
  solution: z.object({ optionId: z.string().min(1) }),
});

const multiChoice = z.object({
  ...commonFields,
  kind: z.literal('multi-choice'),
  options: z.array(optionSchema).min(4).max(8),
  solution: z.object({ optionIds: z.array(z.string().min(1)).min(2) }),
});

const trueFalse = z.object({
  ...commonFields,
  kind: z.literal('true-false'),
  statement: z.string().min(10),
  solution: z.object({ value: z.boolean() }),
});

const toolName = z.object({
  ...commonFields,
  kind: z.literal('tool-name'),
  solution: z.object({
    accept: z.array(z.string().min(2)).min(1),
    normalizer: z.literal('tool'),
  }),
});

const configFill = z.object({
  ...commonFields,
  kind: z.literal('config-fill'),
  starter: z.string().optional(),
  solution: z.object({
    accept: z.array(z.string().min(1)).min(1),
    normalizer: normalizerEnum,
  }),
});

const sequence = z.object({
  ...commonFields,
  kind: z.literal('sequence'),
  items: z.array(optionSchema).min(3).max(7),
  solution: z.object({ orderedItemIds: z.array(z.string().min(1)).min(3) }),
});

const matching = z.object({
  ...commonFields,
  kind: z.literal('matching'),
  left: z.array(optionSchema).min(3).max(6),
  right: z.array(optionSchema).min(3).max(8),
  solution: z.object({ pairs: z.record(z.string(), z.string()) }),
});

const argSpecSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  input: z.enum(['select', 'text', 'boolean']),
  options: z.array(optionSchema).optional(),
  placeholder: z.string().optional(),
  required: z.boolean(),
});

const simulation = z.object({
  ...commonFields,
  kind: z.literal('simulation'),
  toolPalette: z.array(optionSchema).min(3).max(10),
  argSpecs: z.array(argSpecSchema).min(1).max(6),
  solution: z.object({
    toolId: z.string().min(1),
    args: z.record(z.string(), z.union([z.string(), z.boolean()])),
    lenientArgs: z.record(z.string(), normalizerEnum).optional(),
  }),
});

const debugFix = z.object({
  ...commonFields,
  kind: z.literal('debug-fix'),
  brokenCall: z.string().min(5),
  language: z.enum(['json', 'text', 'bash']),
  solution: z.object({
    accept: z.array(z.string().min(1)).min(1),
    normalizer: normalizerEnum,
  }),
});

export const challengeSchema = z
  .discriminatedUnion('kind', [
    singleChoice,
    multiChoice,
    trueFalse,
    toolName,
    configFill,
    sequence,
    matching,
    simulation,
    debugFix,
  ])
  .superRefine((challenge, ctx) => {
    // The id must agree with the world and topic it claims to belong to.
    const [worldPart, topicPart] = challenge.id.split('.');
    if (worldPart !== challenge.worldId) {
      ctx.addIssue({ code: 'custom', message: `id ${challenge.id} disagrees with worldId ${challenge.worldId}` });
    }
    if (`${worldPart}.${topicPart}` !== challenge.topicId) {
      ctx.addIssue({ code: 'custom', message: `id ${challenge.id} disagrees with topicId ${challenge.topicId}` });
    }

    // Every solution must reference options that actually exist.
    if (challenge.kind === 'single-choice') {
      const ids = new Set(challenge.options.map((o) => o.id));
      if (!ids.has(challenge.solution.optionId)) {
        ctx.addIssue({ code: 'custom', message: `solution optionId ${challenge.solution.optionId} is not an option` });
      }
    }
    if (challenge.kind === 'multi-choice') {
      const ids = new Set(challenge.options.map((o) => o.id));
      for (const id of challenge.solution.optionIds) {
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `solution optionId ${id} is not an option` });
      }
      if (challenge.solution.optionIds.length === challenge.options.length) {
        ctx.addIssue({ code: 'custom', message: 'a multi-choice answer where everything is correct teaches nothing' });
      }
    }
    if (challenge.kind === 'sequence') {
      const ids = new Set(challenge.items.map((o) => o.id));
      if (challenge.solution.orderedItemIds.length !== challenge.items.length) {
        ctx.addIssue({ code: 'custom', message: 'the solution order must list every item exactly once' });
      }
      for (const id of challenge.solution.orderedItemIds) {
        if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: `ordered id ${id} is not an item` });
      }
    }
    if (challenge.kind === 'matching') {
      const leftIds = new Set(challenge.left.map((o) => o.id));
      const rightIds = new Set(challenge.right.map((o) => o.id));
      const pairKeys = Object.keys(challenge.solution.pairs);
      if (pairKeys.length !== challenge.left.length) {
        ctx.addIssue({ code: 'custom', message: 'every left item needs a pair in the solution' });
      }
      for (const [l, r] of Object.entries(challenge.solution.pairs)) {
        if (!leftIds.has(l)) ctx.addIssue({ code: 'custom', message: `pair key ${l} is not a left item` });
        if (!rightIds.has(r)) ctx.addIssue({ code: 'custom', message: `pair value ${r} is not a right item` });
      }
    }
    if (challenge.kind === 'simulation') {
      const toolIds = new Set(challenge.toolPalette.map((o) => o.id));
      if (!toolIds.has(challenge.solution.toolId)) {
        ctx.addIssue({ code: 'custom', message: `solution toolId ${challenge.solution.toolId} is not in the palette` });
      }
      const specNames = new Set(challenge.argSpecs.map((s) => s.name));
      for (const name of Object.keys(challenge.solution.args)) {
        if (!specNames.has(name)) ctx.addIssue({ code: 'custom', message: `solution arg ${name} has no argSpec` });
      }
      for (const spec of challenge.argSpecs) {
        if (spec.input === 'select' && (!spec.options || spec.options.length < 2)) {
          ctx.addIssue({ code: 'custom', message: `argSpec ${spec.name} is a select with fewer than two options` });
        }
      }
    }
  });

export const topicSchema = z.object({
  id: z.string().regex(topicIdPattern),
  title: z.string().min(3),
  summary: z.string().min(20),
  challenges: z.array(challengeSchema).min(1),
});

export const worldSchema = z
  .object({
    id: z.string().regex(worldIdPattern),
    order: z.number().int().positive(),
    title: z.string().min(3),
    subtitle: z.string().min(5),
    lore: z.string().min(20),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    topics: z.array(topicSchema).min(1),
  })
  .superRefine((world, ctx) => {
    const seen = new Set<string>();
    for (const topic of world.topics) {
      if (!topic.id.startsWith(`${world.id}.`)) {
        ctx.addIssue({ code: 'custom', message: `topic ${topic.id} does not belong to world ${world.id}` });
      }
      for (const challenge of topic.challenges) {
        if (seen.has(challenge.id)) {
          ctx.addIssue({ code: 'custom', message: `duplicate challenge id ${challenge.id}` });
        }
        seen.add(challenge.id);
      }

      // Every topic must exercise the full set of challenge modalities, which is
      // the "cover every case" requirement expressed as a build-time check.
      const kinds = new Set(topic.challenges.filter((c) => !c.boss).map((c) => c.kind));
      const missing = CHALLENGE_KINDS.filter((k) => !kinds.has(k));
      if (missing.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `topic ${topic.id} is missing challenge kinds: ${missing.join(', ')}`,
        });
      }
    }

    const bosses = world.topics.flatMap((t) => t.challenges.filter((c) => c.boss));
    if (bosses.length !== 1) {
      ctx.addIssue({ code: 'custom', message: `world ${world.id} must declare exactly one boss, found ${bosses.length}` });
    }
  });

export const contentPackSchema = worldSchema;

export type ValidatedWorld = z.infer<typeof worldSchema>;
