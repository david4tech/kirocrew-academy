# Integration notes for the Lambda API workstream

## How the Lambda artifact is actually built (reconciled with `infra/`)

`AcademyApiStack` uses `lambdaNodejs.NodejsFunction` with
`entry: api/src/handlers/<name>.ts`, so **CDK runs its own esbuild against the
TypeScript source** and emits a single bundled `index.mjs` at the asset root. It
does not run `api/scripts/build.mjs` and does not copy any sibling files.

Consequences, both already handled:

- `api/src/lib/content.ts` loads the content bundle through a **static JSON
  import** (`import fullBundle from '../generated/content.full.json' with { type: 'json' }`),
  so esbuild inlines it into the artifact. An earlier `readFileSync` approach
  resolved from `import.meta.url` and would have thrown `ENOENT` at runtime in
  Lambda, because no JSON file is deployed beside the bundle. Verified by
  bundling `health.ts` to a lone `index.mjs` and invoking it from an unrelated
  working directory: 200, content indexed.
- `api/src/generated/content.full.json` is gitignored, so
  `npm run build:content -- --include-reference` **must run before
  `cdk synth`**, or esbuild fails on the missing import. `.github/workflows/deploy.yml`
  already orders it that way (build:shared, build:content, typecheck, lint, test, synth).

`api/scripts/build.mjs` (emitting `api/dist/handlers/<name>.mjs`) is retained only
for standalone local verification of the handlers. It is **not** on the deploy path;
do not point CDK at `api/dist`.

## Route to file mapping

One Lambda per handler file, export named `handler`:
`health`, `me`, `progress`, `attempt`, `hint`, `leaderboard`, `daily`.

`me.ts` serves both `GET /me` and `PATCH /me` (dispatched on HTTP method);
`attempt.ts` serves both `POST /challenges/{id}/start` and
`POST /challenges/{id}/attempt` (dispatched on the `event.rawPath` suffix
`/start` vs `/attempt`). Both routes of each of those two files must be wired to
the same function, which `AcademyApiStack` already does via its
`functionsByFile` de-duplication.

## DynamoDB GSIs required (for `infra`'s `AcademyDataStack`)

The table needs two GSIs, both projected `KEYS_ONLY` plus `displayName`, `xp`, `rankTitle`,
`role` per `ARCHITECTURE.md`:

- `gsi1`: partition key `gsi1pk` (string), sort key `gsi1sk` (string)
- `gsi2`: partition key `gsi2pk` (string), sort key `gsi2sk` (string)

Only the profile item (`sk = PROFILE`) ever carries these attributes.

## Environment variable

Every handler reads `TABLE_NAME` from the environment (`api/src/lib/ddb.ts`). The stack
must set it on all seven Lambda functions.

## Install conflict reported during this workstream: resolved, no action needed

While `api/` was being built, a root `npm install` failed with an ERESOLVE conflict
inside `web/` (`vite@7` against `@tailwindcss/vite@4.0.0`, whose peer range was
`^5.2.0 || ^6`), and `--legacy-peer-deps` was used to get past it. The `web/`
workstream has since moved to `@tailwindcss/vite@4.1.18`, whose peer range accepts
Vite 7. A plain `npm install` at the root now resolves with no flag. Nothing to fix.
