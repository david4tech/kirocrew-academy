# Brief: the Lambda API

Read `docs/briefs/RULES.md` first, then `docs/ARCHITECTURE.md` and all of
`packages/shared/src/` (`api.ts`, `types.ts`, `scoring.ts`, `grading.ts`,
`progression.ts`). Those are binding.

**You own exclusively:** `api/**`.

## Package

`api/package.json` as npm workspace `@kirocrew-academy/api`, type module.
Dependencies: `@kirocrew-academy/shared` (workspace), `@aws-sdk/client-dynamodb`,
`@aws-sdk/lib-dynamodb`, `zod`. Dev: `typescript`, `vitest`, `@types/aws-lambda`,
`esbuild`. Scripts: `build`, `typecheck`, `test`. `tsconfig.json` extends
`../tsconfig.base.json`.

## Handlers

One file per route in `api/src/handlers`, named exactly `health.ts`, `me.ts`,
`progress.ts`, `attempt.ts`, `hint.ts`, `leaderboard.ts`, `daily.ts`, each
exporting a named `handler` compatible with
`APIGatewayProxyEventV2WithJWTAuthorizer`. **Do not rename these files:** the CDK
stack references these exact paths.

## Shared plumbing in `api/src/lib`

- `ddb.ts` a `DynamoDBDocumentClient` singleton reading `TABLE_NAME`, with
  `removeUndefinedValues: true`.
- `repository.ts` every data access in one place, keyed exactly as
  `ARCHITECTURE.md` specifies. `getProfile` creates the profile on first call
  from the JWT claims (`sub`, `email`, display name from the email local part)
  using a **conditional put** so two concurrent first calls cannot both create
  it. Persist `gsi1pk = LEADERBOARD#ALL`, `gsi2pk = LEADERBOARD#<role>` when a
  role is set, and `gsi1sk`/`gsi2sk` as xp zero padded to 12 digits, recomputed
  on every xp change. Only the profile item ever carries GSI keys.
- `content.ts` loads `api/src/generated/content.full.json`, exposes
  `findChallenge(id)`, `getWorlds()` and an index built once at module scope.
  Choose whichever of a JSON import assertion or `readFileSync` survives esbuild
  bundling, and report which you chose.
- `http.ts` `ok`, `badRequest`, `unauthorized`, `notFound`, `conflict`,
  `serverError` helpers that always emit `API_ERROR_CODES` values from the shared
  package, never ad hoc strings, plus a wrapper that catches a thrown `ApiError`
  and logs anything else as an internal error without leaking a stack trace to
  the client.
- `auth.ts` pulls the subject and email from
  `event.requestContext.authorizer.jwt.claims` and throws unauthorized when
  absent. Do not verify the signature: the HTTP API authorizer already did.

## Behaviour, the part that matters most

**`POST /challenges/{id}/start`** records a server side `startedAt` with a TTL of
`ATTEMPT_WINDOW_SECONDS`. Refuse with `CHALLENGE_LOCKED` when
`isChallengeUnlocked` says the challenge is unreachable, `CHALLENGE_NOT_FOUND`
for an unknown id.

**`POST /challenges/{id}/attempt`** is the authority:

- Read the attempt window. No window means `ATTEMPT_NOT_STARTED`.
- Compute `elapsedSeconds` from the stored timestamp, **never** from the body.
- Validate the answer shape with zod before grading, `INVALID_ANSWER` on a
  mismatch.
- Grade with `gradeAnswer`, score with `computeScore` passing `firstAttempt`, the
  combo streak read from the profile, the count of **distinct** revealed hint
  tiers for this challenge, `elapsedSeconds` and the challenge `targetSeconds`.
- Award only the positive delta over the best already banked for that challenge,
  so replaying a mastered challenge cannot farm xp.
- Set `mastered` true on a ratio of exactly 1 and never unset it.
- Increment the combo streak on a fully correct answer, reset to zero otherwise.
- Recompute with `computeProgress`, evaluate `evaluateBadges`, grant
  `HINT_TOKENS_PER_WORLD` when a boss is newly defeated, recompute the rank with
  `rankForXp`.
- Return outcome, breakdown, mastered flag, explanation, updated profile and the
  unlock event. Include the solution **only** once the challenge is mastered.

**`POST /challenges/{id}/hint`** charges `HINT_TOKEN_COST` for the tier, refuses
with `INSUFFICIENT_HINT_TOKENS` on a short balance, and is idempotent: a tier
already revealed returns the text again and charges nothing. Return the
cumulative `penaltyPct`.

**`POST /daily`** grants `HINT_TOKENS_PER_DAILY` once per UTC calendar day,
increments `dailyStreakDays` when the last claim was yesterday and resets it to 1
otherwise, and returns `ALREADY_CLAIMED_TODAY` on a second call the same day.

**`GET /leaderboard`** reads `scope` and `limit` from the query string, clamps
`limit` to 100, queries the right GSI descending, marks the caller with
`isCurrentUser`.

**`GET /progress`** returns the full `ProgressSnapshot` including
`sandboxUnlocked`.

**`GET /health`** returns ok, the content version and the challenge count, and
touches no table.

## Tests

Vitest in `api/src/**/*.test.ts` against an in memory fake of the repository, not
a mocked SDK. These cases must exist and pass:

1. Submitting without calling start returns `ATTEMPT_NOT_STARTED`.
2. A locked challenge refuses both start and attempt.
3. Replaying an already mastered challenge adds zero xp the second time.
4. A wrong answer resets the combo streak, a correct one increments it.
5. Revealing tier 2 twice charges one token in total.
6. Running out of tokens on tier 3 returns `INSUFFICIENT_HINT_TOKENS` and reveals
   nothing.
7. The speed bonus uses the stored start time: a forged elapsed value in the body
   changes nothing.
8. Beating a world boss grants `HINT_TOKENS_PER_WORLD` exactly once.
9. Claiming daily twice in one UTC day returns `ALREADY_CLAIMED_TODAY`.
10. A grading round trip across all nine challenge kinds using
    `content/_reference/world-00-reference.json` as the fixture, asserting a fully
    correct answer scores above zero and a fully wrong one scores zero.

## Verification

`npm install`, `npx tsc --noEmit` for api, and `npx vitest run` all pass. Paste
the real vitest summary line.

## Stop conditions

Stop and report if the shared contract is genuinely insufficient to implement a
rule, or if a rule here contradicts `docs/ARCHITECTURE.md`. Do not edit the
shared package to work around it.
