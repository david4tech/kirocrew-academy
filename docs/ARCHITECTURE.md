# Architecture

KiroCrew Academy is a gamified single page app that teaches KiroCrew from first
principles to advanced orchestration. It runs entirely serverless in one AWS
account and is deployed by a GitHub Actions pipeline using OIDC, with no long
lived AWS keys anywhere.

## Runtime topology

```
Browser (React SPA)
  |
  |-- static assets ------> CloudFront (OAC) --> S3 private bucket
  |
  |-- Cognito Hosted flow -> Cognito User Pool (email + password, self signup)
  |
  '-- XHR with JWT -------> API Gateway HTTP API --> Lambda (Node 22) --> DynamoDB
```

## Non negotiable rules

1. **Scoring and grading are server side only.** The client never receives a
   solution or a hint text. It sends an answer, the Lambda grades it against the
   full content bundle and returns the points. Anything else lets a learner open
   DevTools and complete the game.
2. **Progress is derived, never trusted.** `computeProgress` recomputes the whole
   unlock tree from the per challenge records on every read, so adding a
   challenge to an old topic correctly re-locks it.
3. **The speed bonus needs a server timestamp.** A learner must call
   `POST /challenges/{id}/start` before submitting. Elapsed time is measured from
   the stored server timestamp, not from a client supplied number.
4. **The shared package is the contract.** `packages/shared` holds the types,
   the scoring maths, the grading logic and the route table. No workstream
   redefines any of it locally.
5. **The S3 bucket is never public.** CloudFront reaches it through Origin Access
   Control only.

## Packages

| Path | Role |
|---|---|
| `packages/shared` | Types, scoring, grading, progression, zod content schema, route table |
| `content/` | Authored challenge packs, one JSON file per world |
| `content/_reference/` | Authoring template, validated but never shipped |
| `scripts/build-content.mjs` | Validates packs, emits the public and full bundles |
| `api/` | Lambda handlers, DynamoDB access, JWT verification |
| `web/` | React 19 SPA, Vite, Tailwind v4, Framer Motion, Zustand |
| `infra/` | CDK v2 app: Auth, Api, Site and CI role stacks |

## Generated bundles

`npm run build:content` writes two files, both gitignored:

- `web/src/generated/content.public.json` imported by the SPA, solutions and
  hint text removed, each challenge carries only `hintTiers`.
- `api/src/generated/content.full.json` bundled into the Lambda, complete.

The build asserts the public bundle contains no `"solution"` or `"hints"` key and
fails the pipeline if it does.

## DynamoDB single table

Table name comes from the `TABLE_NAME` environment variable. Billing is on
demand. Keys are `pk` and `sk`.

| Item | pk | sk | Notes |
|---|---|---|---|
| Profile | `USER#<sub>` | `PROFILE` | xp, rankTitle, hintTokens, comboStreak, dailyStreakDays, lastDailyClaim, badges, role |
| Challenge record | `USER#<sub>` | `CHALLENGE#<challengeId>` | attempts, mastered, bestPoints, firstTryCorrect, hintsUsed |
| Attempt window | `USER#<sub>` | `ATTEMPT#<challengeId>` | startedAt, TTL of `ATTEMPT_WINDOW_SECONDS` |
| Revealed hint | `USER#<sub>` | `HINT#<challengeId>#<tier>` | revealedAt, so re-reading a hint is free |

Two global secondary indexes back the leaderboard:

- `gsi1`: `gsi1pk = LEADERBOARD#ALL`, `gsi1sk = <xp zero padded to 12 digits>`
- `gsi2`: `gsi2pk = LEADERBOARD#<role>`, `gsi2sk = <xp zero padded to 12 digits>`

Both are projected KEYS_ONLY plus `displayName`, `xp`, `rankTitle`, `role`.
Query descending and take the first N. Only the profile item carries GSI keys.

## API surface

Declared in `packages/shared/src/api.ts`. Every route except `/health` sits
behind the Cognito JWT authorizer, which puts the subject in
`event.requestContext.authorizer.jwt.claims.sub`.

| Route | Purpose |
|---|---|
| `GET /health` | Unauthenticated liveness plus content version |
| `GET /me` | Returns the profile, creating it from JWT claims on first call |
| `PATCH /me` | Updates `displayName` and `role` |
| `GET /progress` | Full `ProgressSnapshot` |
| `POST /challenges/{id}/start` | Opens the attempt window, returns the server timestamp |
| `POST /challenges/{id}/attempt` | Grades, scores, persists, returns unlock events |
| `POST /challenges/{id}/hint` | Spends hint tokens, returns the hint text |
| `GET /leaderboard?scope=all|<role>&limit=` | Ranked entries |
| `POST /daily` | Claims the daily streak token, once per calendar day |

A locked challenge returns `challenge_locked`. Submitting without opening the
attempt window returns `attempt_not_started`.

## Progression rules

Implemented in `packages/shared/src/progression.ts`.

- A topic opens when its world is open and the previous topic is complete.
- A world opens when the previous world reaches 80 percent mastery.
- The world boss opens when every non boss challenge in that world is mastered.
- The sandbox opens when the `w3` boss is defeated.
- Hint tokens: 5 at signup, 3 per world boss defeated, 1 per daily claim.
  Tier 1 costs 0 tokens, tier 2 costs 1, tier 3 costs 2. Point penalties are
  10, 25 and 50 percent for one, two and three tiers revealed.

## Deployment

Four CDK stacks, all in `us-east-1`:

- `AcademyAuthStack` Cognito user pool, app client, domain
- `AcademyDataStack` DynamoDB table
- `AcademyApiStack` HTTP API, JWT authorizer, Lambda functions
- `AcademySiteStack` S3 bucket, CloudFront distribution with OAC
- `AcademyCiStack` GitHub OIDC provider and the deploy role

The pipeline runs on push to `main`: install, lint, typecheck, unit tests,
`cdk deploy`, `vite build`, `s3 sync`, CloudFront invalidation, then Playwright
smoke tests against the live distribution. Pull requests run everything up to and
including unit tests but never deploy.
