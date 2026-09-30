/**
 * Answer grading. Runs server side only, because it needs the authored solution.
 * Returns a correctness ratio between 0 and 1 so the scorer can award partial
 * credit on the multi-field challenge kinds.
 */

import type { AnswerPayload, Challenge, Normalizer } from './types.js';

export interface GradeResult {
  ratio: number;
  /** Per-field detail used by the UI to highlight what went wrong. */
  fieldResults?: Record<string, boolean>;
  error?: string;
}

const CORRECT: GradeResult = { ratio: 1 };
const WRONG: GradeResult = { ratio: 0 };

export function normalize(value: string, normalizer: Normalizer): string {
  const trimmed = String(value ?? '').trim();
  switch (normalizer) {
    case 'tool':
      // Tool names compare case insensitively and ignore the @server/ prefix.
      return trimmed
        .toLowerCase()
        .replace(/^@[a-z0-9-]+\//, '')
        .replace(/[^a-z0-9_]/g, '');
    case 'cron':
      // Collapse whitespace so "0  9 * * 1-5" equals "0 9 * * 1-5".
      return trimmed.replace(/\s+/g, ' ');
    case 'json':
      try {
        return JSON.stringify(sortKeysDeep(JSON.parse(trimmed)));
      } catch {
        // Fall back to whitespace-insensitive comparison on unparseable input.
        return trimmed.replace(/\s+/g, '');
      }
    case 'text':
    default:
      return trimmed.toLowerCase().replace(/\s+/g, ' ');
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

function matchesAccepted(value: string, accept: string[], normalizer: Normalizer): boolean {
  const got = normalize(value, normalizer);
  return accept.some((candidate) => normalize(candidate, normalizer) === got);
}

export function gradeAnswer(challenge: Challenge, answer: AnswerPayload): GradeResult {
  if (answer.kind !== challenge.kind) {
    return { ratio: 0, error: `answer kind ${answer.kind} does not match challenge kind ${challenge.kind}` };
  }

  switch (challenge.kind) {
    case 'single-choice': {
      const given = (answer as { optionId: string }).optionId;
      return given === challenge.solution.optionId ? CORRECT : WRONG;
    }

    case 'true-false': {
      const given = (answer as { value: boolean }).value;
      return given === challenge.solution.value ? CORRECT : WRONG;
    }

    case 'tool-name':
      return matchesAccepted(
        (answer as { value: string }).value,
        challenge.solution.accept,
        challenge.solution.normalizer,
      )
        ? CORRECT
        : WRONG;

    case 'config-fill':
    case 'debug-fix':
      return matchesAccepted(
        (answer as { value: string }).value,
        challenge.solution.accept,
        challenge.solution.normalizer,
      )
        ? CORRECT
        : WRONG;

    case 'multi-choice': {
      // Jaccard style ratio: reward the correct picks, punish the wrong ones.
      const expected = new Set(challenge.solution.optionIds);
      const given = new Set((answer as { optionIds: string[] }).optionIds ?? []);
      const hits = [...given].filter((id) => expected.has(id)).length;
      const falsePositives = [...given].filter((id) => !expected.has(id)).length;
      const denominator = expected.size + falsePositives;
      const ratio = denominator === 0 ? 0 : hits / denominator;
      const fieldResults: Record<string, boolean> = {};
      for (const option of challenge.options) {
        fieldResults[option.id] = expected.has(option.id) === given.has(option.id);
      }
      return { ratio: round4(ratio), fieldResults };
    }

    case 'sequence': {
      const expected = challenge.solution.orderedItemIds;
      const given = (answer as { orderedItemIds: string[] }).orderedItemIds ?? [];
      if (given.length !== expected.length) return { ratio: 0 };
      let correctPositions = 0;
      const fieldResults: Record<string, boolean> = {};
      expected.forEach((id, index) => {
        const ok = given[index] === id;
        if (ok) correctPositions += 1;
        fieldResults[id] = ok;
      });
      return { ratio: round4(correctPositions / expected.length), fieldResults };
    }

    case 'matching': {
      const expected = challenge.solution.pairs;
      const given = (answer as { pairs: Record<string, string> }).pairs ?? {};
      const keys = Object.keys(expected);
      let hits = 0;
      const fieldResults: Record<string, boolean> = {};
      for (const key of keys) {
        const ok = given[key] === expected[key];
        if (ok) hits += 1;
        fieldResults[key] = ok;
      }
      return { ratio: keys.length === 0 ? 0 : round4(hits / keys.length), fieldResults };
    }

    case 'simulation': {
      const sol = challenge.solution;
      const given = answer as { toolId: string; args: Record<string, string | boolean> };
      const fieldResults: Record<string, boolean> = {};

      // Picking the wrong tool invalidates the whole attempt, arguments included.
      const toolOk = given.toolId === sol.toolId;
      fieldResults.__tool = toolOk;
      if (!toolOk) return { ratio: 0, fieldResults };

      const argNames = Object.keys(sol.args);
      if (argNames.length === 0) return { ratio: 1, fieldResults };

      let hits = 0;
      for (const name of argNames) {
        const expectedValue = sol.args[name];
        const givenValue = given.args?.[name];
        const lenient = sol.lenientArgs?.[name];
        let ok: boolean;
        if (typeof expectedValue === 'boolean') {
          ok = givenValue === expectedValue;
        } else if (lenient) {
          ok = normalize(String(givenValue ?? ''), lenient) === normalize(expectedValue, lenient);
        } else {
          ok = normalize(String(givenValue ?? ''), 'text') === normalize(expectedValue, 'text');
        }
        if (ok) hits += 1;
        fieldResults[name] = ok;
      }

      // The tool counts as one weighted field alongside the arguments.
      return { ratio: round4((hits + 1) / (argNames.length + 1)), fieldResults };
    }

    default: {
      const exhaustive: never = challenge;
      return { ratio: 0, error: `unsupported challenge kind: ${JSON.stringify(exhaustive)}` };
    }
  }
}

function round4(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}
