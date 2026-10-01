# Brief: the React single page app

Read `docs/briefs/RULES.md` first, then `docs/ARCHITECTURE.md`,
`packages/shared/src/api.ts`, `types.ts`, `scoring.ts`, `progression.ts`, and
`content/_reference/world-00-reference.json` to see the exact shape of all nine
challenge kinds you must render.

**You own exclusively:** `web/**`.

## Stack, do not substitute

React 19, TypeScript, Vite 7, Tailwind CSS v4 through `@tailwindcss/vite`,
Framer Motion (the `motion` package), Zustand, React Router v7 declarative, and
`aws-amplify` v6 **Auth category only**, no Amplify hosting and no Amplify CLI.
Vitest plus `@testing-library/react`, and Playwright for the smoke test.

## Configuration

Read `VITE_API_BASE_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`
and `VITE_COGNITO_DOMAIN` through one typed module `web/src/config.ts` that throws
a readable error at startup when any is missing. Create `web/.env.example` listing
all four with placeholders. Hardcode no real id.

## Visual identity, a first class requirement

The ghost mark is at `web/public/kiro-logo.png`. Trace it into a clean reusable
SVG component `web/src/components/KiroGhost.tsx`: a rounded ghost body with a flat
bottom and two oval eyes, with props for size, a mood of
`idle | happy | thinking | sad | celebrating`, and a float flag. Animate with
Framer Motion: a gentle idle bob, squash and stretch on a correct answer, a shake
on a wrong one, a confetti burst on a level unlock. On the dashboard the eyes
follow the cursor slightly.

Kiro purple is the primary palette anchored on `#8B5CF6`, with `#7C3AED` and
`#6D28D9` as darker steps. Build a full Tailwind v4 theme in CSS variables, dark
first. Every surface must set a background together with a text colour so nothing
renders unreadable.

The ghost is present throughout: the favicon and app icon you generate, the
loading state, the XP orb, the hint giver speaking hint text in a speech bubble,
the world map node marker, and the achievement seal on a badge. Locked content
shows a dimmed ghost behind a padlock.

## Screens

1. **Landing** what the academy is, the seven worlds, a sign in call to action,
   the ghost animating.
2. **Auth** sign up with email and password, email code confirmation, sign in,
   forgot password and reset. Use the Amplify Auth APIs directly with your own
   styled forms, not the prebuilt Authenticator UI, so the theme stays
   consistent. Surface the real Cognito validation errors, never a generic
   failure.
3. **Onboarding** shown once when `profile.role` is null: pick one of the eight
   roles from `ROLE_LABELS` and a display name, then `PATCH /me`.
4. **World map** the seven worlds as nodes on a path, each with its accent
   colour, a mastery percentage ring, lock state and boss state. A locked world
   states its unlock condition in plain words, for example
   "Reach 80 percent mastery of World 2".
5. **Topic list** per world, sequential, with the lock reason visible.
6. **Challenge player** one component per kind, all nine. `single-choice` and
   `true-false` as radio cards, `multi-choice` as checkable cards with a submit,
   `tool-name` and `config-fill` as a monospace input hinting the expected shape,
   `sequence` as a keyboard accessible reorder list with drag and drop, `matching`
   as a two column connect interaction, `simulation` as a tool palette plus an
   argument form generated from `argSpecs`, `debug-fix` as an editor prefilled
   with `brokenCall`. Each shows a live potential score computed with the shared
   `computeScore` so the learner sees what a hint will cost before spending it, a
   three tier hint drawer, and an explanation panel after submitting.
7. **Results and progress** xp, rank with the bar from `xpToNextRank`, combo
   streak, hint tokens, badges earned and locked, per world mastery breakdown.
8. **Leaderboard** with an all versus my role toggle.
9. **Sandbox** free play, visible but locked until `sandboxUnlocked` is true.

## Data access

One client at `web/src/lib/api.ts` building every URL with `buildPath` and
`API_ROUTES` from the shared package, attaching the Cognito id token as a bearer,
and mapping `API_ERROR_CODES` to user facing copy. Invent no route.

Two rules that are easy to get wrong:

- Call `START_ATTEMPT` before showing a challenge, and **do not** send elapsed
  time in the submit body. The server measures it.
- The content bundle is `web/src/generated/content.public.json`, which has no
  solutions and no hint text. Never expect either. Generate it first with
  `npm run build:shared && node scripts/build-content.mjs --include-reference`.

## Accessibility, required

Every interaction reachable by keyboard, the `sequence` and `matching` challenges
included. Visible focus rings. `aria-live` on score and outcome announcements.
Labelled form controls. Colour is never the only signal for right or wrong: pair
it with an icon and text.

## Tests

Vitest unit tests for the api client URL building, the potential score preview,
and at least one rendering test per challenge kind asserting a keyboard only path
to submitting an answer. A Playwright config plus one smoke spec that loads the
built app against a `BASE_URL` environment variable and asserts the landing page
renders and the ghost SVG is in the document, skipping cleanly when `BASE_URL` is
unset.

## Verification

`npm install`, `npx tsc --noEmit` for web, `npx vitest run`, and `npm run build`
(vite build) all pass. Paste the real vitest summary and the vite build size line.

## Stop conditions

Stop and report if the shared contract cannot express something a screen needs, or
if a named library version is unavailable. Do not edit the shared package to work
around it.
