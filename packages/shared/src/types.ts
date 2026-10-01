/**
 * Shared domain types for KiroCrew Academy.
 * Consumed by the web client, the Lambda API and the content build scripts.
 * This file is the single source of truth for the data contract.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = [
  'devops-sre',
  'platform',
  'backend',
  'cloud-architect',
  'data',
  'qa',
  'security',
  'eng-manager',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  'devops-sre': 'DevOps / SRE',
  platform: 'Platform Engineer',
  backend: 'Backend / Full-stack',
  'cloud-architect': 'Cloud Architect',
  data: 'Data Engineer',
  qa: 'QA / Test Automation',
  security: 'Security / DevSecOps',
  'eng-manager': 'Engineering Manager',
};

// ---------------------------------------------------------------------------
// Challenge taxonomy
// ---------------------------------------------------------------------------

export const CHALLENGE_KINDS = [
  'single-choice',
  'multi-choice',
  'true-false',
  'tool-name',
  'config-fill',
  'sequence',
  'matching',
  'simulation',
  'debug-fix',
] as const;

export type ChallengeKind = (typeof CHALLENGE_KINDS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Kinds that can award partial credit because they are scored field by field. */
export const PARTIAL_CREDIT_KINDS: ReadonlySet<ChallengeKind> = new Set<ChallengeKind>([
  'multi-choice',
  'sequence',
  'matching',
  'simulation',
]);

// ---------------------------------------------------------------------------
// Hints
// ---------------------------------------------------------------------------

export type HintTier = 1 | 2 | 3;

export interface Hint {
  /** 1 = conceptual nudge, 2 = concept explained, 3 = near answer. */
  tier: HintTier;
  text: string;
}

/** Hint tokens charged per tier. Tier 1 is free and only costs points. */
export const HINT_TOKEN_COST: Record<HintTier, number> = { 1: 0, 2: 1, 3: 2 };

// ---------------------------------------------------------------------------
// Answer payloads, one shape per challenge kind
// ---------------------------------------------------------------------------

export interface Option {
  id: string;
  text: string;
}

export interface SequenceItem {
  id: string;
  text: string;
}

export interface MatchPair {
  id: string;
  text: string;
}

/** Declares one argument the learner must supply in a simulation challenge. */
export interface SimulationArgSpec {
  name: string;
  label: string;
  /** 'select' renders a dropdown from options, 'text' a free input. */
  input: 'select' | 'text' | 'boolean';
  options?: Option[];
  placeholder?: string;
  required: boolean;
}

/** Normalization applied before comparing free-text answers. */
export type Normalizer = 'text' | 'tool' | 'json' | 'cron';

export type AnswerPayload =
  | { kind: 'single-choice'; optionId: string }
  | { kind: 'multi-choice'; optionIds: string[] }
  | { kind: 'true-false'; value: boolean }
  | { kind: 'tool-name'; value: string }
  | { kind: 'config-fill'; value: string }
  | { kind: 'sequence'; orderedItemIds: string[] }
  | { kind: 'matching'; pairs: Record<string, string> }
  | { kind: 'simulation'; toolId: string; args: Record<string, string | boolean> }
  | { kind: 'debug-fix'; value: string };

// ---------------------------------------------------------------------------
// Authored challenge shape (includes the solution, never shipped to the client)
// ---------------------------------------------------------------------------

export interface RoleVariant {
  /** Role-flavoured restatement of the prompt. */
  prompt: string;
  /** Optional extra scenario framing shown above the prompt. */
  scenario?: string;
}

interface ChallengeCommon {
  /** Stable id, format: w<world>.t<topic>.c<challenge>, e.g. w1.t2.c3 */
  id: string;
  worldId: string;
  topicId: string;
  difficulty: Difficulty;
  /** Neutral prompt used when the learner's role has no variant. */
  prompt: string;
  /** Optional scenario framing shown above the prompt. */
  scenario?: string;
  roleVariants?: Partial<Record<Role, RoleVariant>>;
  /** Exactly three tiers, ordered 1 to 3. */
  hints: [Hint, Hint, Hint];
  /** Shown after the attempt resolves, regardless of outcome. */
  explanation: string;
  /** Source document in the KiroCrew docs set, for traceability. */
  docRef: string;
  /** Target completion time in seconds, drives the speed bonus. */
  targetSeconds: number;
  /** Marks the world boss challenge, which uses the boss base score. */
  boss?: boolean;
}

export interface SingleChoiceChallenge extends ChallengeCommon {
  kind: 'single-choice';
  options: Option[];
  solution: { optionId: string };
}

export interface MultiChoiceChallenge extends ChallengeCommon {
  kind: 'multi-choice';
  options: Option[];
  solution: { optionIds: string[] };
}

export interface TrueFalseChallenge extends ChallengeCommon {
  kind: 'true-false';
  statement: string;
  solution: { value: boolean };
}

export interface ToolNameChallenge extends ChallengeCommon {
  kind: 'tool-name';
  solution: { accept: string[]; normalizer: 'tool' };
}

export interface ConfigFillChallenge extends ChallengeCommon {
  kind: 'config-fill';
  /** Optional starter text prefilled in the editor. */
  starter?: string;
  solution: { accept: string[]; normalizer: Normalizer };
}

export interface SequenceChallenge extends ChallengeCommon {
  kind: 'sequence';
  items: SequenceItem[];
  solution: { orderedItemIds: string[] };
}

export interface MatchingChallenge extends ChallengeCommon {
  kind: 'matching';
  left: MatchPair[];
  right: MatchPair[];
  solution: { pairs: Record<string, string> };
}

export interface SimulationChallenge extends ChallengeCommon {
  kind: 'simulation';
  /** Tool palette the learner picks from. */
  toolPalette: Option[];
  argSpecs: SimulationArgSpec[];
  solution: {
    toolId: string;
    args: Record<string, string | boolean>;
    /** Args whose value may vary, compared with the given normalizer. */
    lenientArgs?: Record<string, Normalizer>;
  };
}

export interface DebugFixChallenge extends ChallengeCommon {
  kind: 'debug-fix';
  /** The incorrect call the learner must repair. */
  brokenCall: string;
  language: 'json' | 'text' | 'bash';
  solution: { accept: string[]; normalizer: Normalizer };
}

export type Challenge =
  | SingleChoiceChallenge
  | MultiChoiceChallenge
  | TrueFalseChallenge
  | ToolNameChallenge
  | ConfigFillChallenge
  | SequenceChallenge
  | MatchingChallenge
  | SimulationChallenge
  | DebugFixChallenge;

/** Everything the client is allowed to see: the authored challenge minus its solution. */
export type PublicChallenge = {
  [K in Challenge as K['kind']]: Omit<K, 'solution' | 'hints' | 'explanation'> & {
    /** Client only learns how many tiers exist, never their text. */
    hintTiers: number;
  };
}[ChallengeKind];

// ---------------------------------------------------------------------------
// Worlds and topics
// ---------------------------------------------------------------------------

export interface Topic {
  /** Format: w<world>.t<topic>, e.g. w1.t2 */
  id: string;
  title: string;
  summary: string;
  challenges: Challenge[];
}

export interface World {
  /** Format: w<n>, e.g. w1 */
  id: string;
  order: number;
  title: string;
  subtitle: string;
  /** Short narrative shown on the world card, keeps the ghost theme alive. */
  lore: string;
  /** Accent colour token used by the UI, from the Kiro purple family. */
  accent: string;
  topics: Topic[];
}

export type PublicTopic = Omit<Topic, 'challenges'> & { challenges: PublicChallenge[] };
export type PublicWorld = Omit<World, 'topics'> & { topics: PublicTopic[] };

export interface ContentManifest {
  version: string;
  generatedAt: string;
  worlds: PublicWorld[];
}

// ---------------------------------------------------------------------------
// Progress and profile
// ---------------------------------------------------------------------------

export const RANKS = [
  { title: 'Recruit', minXp: 0 },
  { title: 'Operator', minXp: 3000 },
  { title: 'Conductor', minXp: 9000 },
  { title: 'Orchestrator', minXp: 20000 },
  { title: 'Crew Master', minXp: 40000 },
] as const;

export type RankTitle = (typeof RANKS)[number]['title'];

export interface Badge {
  id: string;
  title: string;
  description: string;
  earnedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: Role | null;
  xp: number;
  rankTitle: RankTitle;
  hintTokens: number;
  comboStreak: number;
  dailyStreakDays: number;
  lastDailyClaim: string | null;
  badges: Badge[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeProgress {
  challengeId: string;
  attempts: number;
  mastered: boolean;
  bestPoints: number;
  firstTryCorrect: boolean;
  hintsUsed: number;
}

export interface TopicProgress {
  topicId: string;
  unlocked: boolean;
  masteredCount: number;
  total: number;
  complete: boolean;
}

export interface WorldProgress {
  worldId: string;
  unlocked: boolean;
  masteryPct: number;
  bossDefeated: boolean;
  topics: TopicProgress[];
}

export interface ProgressSnapshot {
  profile: UserProfile;
  worlds: WorldProgress[];
  challenges: Record<string, ChallengeProgress>;
  sandboxUnlocked: boolean;
}

// ---------------------------------------------------------------------------
// API request and response contracts
// ---------------------------------------------------------------------------

export interface StartAttemptResponse {
  challengeId: string;
  startedAt: string;
}

export interface SubmitAttemptRequest {
  answer: AnswerPayload;
}

export type AttemptOutcome = 'correct' | 'partial' | 'incorrect';

export interface UnlockEvent {
  topics: string[];
  worlds: string[];
  badges: Badge[];
  sandbox: boolean;
  rankUp: RankTitle | null;
}

export interface SubmitAttemptResponse {
  challengeId: string;
  outcome: AttemptOutcome;
  correctnessRatio: number;
  pointsAwarded: number;
  /** Scoring breakdown, shown in the points popover so the rules stay legible. */
  breakdown: ScoreBreakdown;
  mastered: boolean;
  explanation: string;
  /** Revealed only once the challenge is mastered or the learner runs out of tries. */
  solution?: unknown;
  profile: UserProfile;
  unlocked: UnlockEvent;
}

export interface RevealHintRequest {
  tier: HintTier;
}

export interface RevealHintResponse {
  tier: HintTier;
  text: string;
  tokensSpent: number;
  hintTokensLeft: number;
  /** Cumulative point penalty now applied to this challenge. */
  penaltyPct: number;
}

export interface LeaderboardEntry {
  position: number;
  displayName: string;
  xp: number;
  rankTitle: RankTitle;
  role: Role | null;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  scope: 'all' | Role;
  entries: LeaderboardEntry[];
}

export interface DailyClaimResponse {
  claimed: boolean;
  dailyStreakDays: number;
  hintTokens: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  base: number;
  difficultyMultiplier: number;
  firstTryBonus: number;
  streakBonus: number;
  speedBonus: number;
  hintPenalty: number;
  correctnessRatio: number;
  finalMultiplier: number;
  points: number;
}

export interface ScoreInput {
  kind: ChallengeKind;
  difficulty: Difficulty;
  boss: boolean;
  /** True when this is the learner's first ever attempt on the challenge. */
  firstAttempt: boolean;
  /** Combo streak BEFORE this attempt. */
  comboStreak: number;
  hintsUsed: number;
  elapsedSeconds: number;
  targetSeconds: number;
  correctnessRatio: number;
}
