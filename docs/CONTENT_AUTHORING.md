# Content authoring guide

Every challenge is authored by hand in a JSON pack under `content/`, one file per
world, named `world-<NN>-<slug>.json`. The pack is validated by
`packages/shared/src/content-schema.ts` and the build fails on any violation.

Read `content/_reference/world-00-reference.json` first. It is a complete, valid
world demonstrating all nine challenge kinds and the boss marker. Copy its shape.

## Hard constraints enforced by the schema

- Ids follow `w<world>.t<topic>.c<challenge>` and must agree with `worldId` and
  `topicId`. `w3.t2.c7` must carry `worldId: "w3"` and `topicId: "w3.t2"`.
- **Every topic must contain at least one challenge of all nine kinds**:
  `single-choice`, `multi-choice`, `true-false`, `tool-name`, `config-fill`,
  `sequence`, `matching`, `simulation`, `debug-fix`. This is the "cover every
  case" requirement and the build refuses a topic that is missing one.
- Exactly one challenge per world carries `"boss": true`. The boss does not count
  toward the nine kind requirement.
- `hints` is a tuple of exactly three entries, tiers 1, 2 and 3 in that order.
- `explanation` is at least 20 characters and is the actual teaching moment. It
  is shown after every attempt, right or wrong.
- `docRef` names the source document in the KiroCrew docs set, for traceability.
- `accent` is a hex colour from the Kiro purple family.
- Solutions must reference options that exist. A `multi-choice` whose solution is
  every option is rejected because it teaches nothing.
- `world.order` across all shipped packs must be contiguous starting at 1.

## Source of truth for content

Author from the official KiroCrew documentation set, located at:

```
/Applications/KiroCrew.app/Contents/Resources/backend-dist/kirocrew-backend-arm64/lib/python3.12/site-packages/kiro_crew/docs
```

Never invent a tool, a parameter or a behaviour. If the docs do not state it, do
not test the learner on it. When a doc and a tool description disagree, prefer the
tool description and note it in the explanation.

## Difficulty budget per topic

Aim for roughly 10 to 12 challenges per topic, distributed as:

- 3 to 4 `easy` (recognition: what a tool is, what a block means)
- 4 to 5 `medium` (application: pick the right tool, write a cron expression)
- 3 to 4 `hard` (judgement: simulation and debug-fix, where the wrong call has a
  real cost)

`targetSeconds` should be an honest estimate for someone who knows the material:
25 to 45 for easy, 45 to 90 for medium, 90 to 180 for hard and boss.

## Role variants

`roleVariants` reframes the scenario for the learner's chosen role without
changing the correct answer. Add variants to the `simulation`, `debug-fix` and
`config-fill` challenges, where framing matters most. Do not add a variant that
changes which answer is correct.

The eight roles are `devops-sre`, `platform`, `backend`, `cloud-architect`,
`data`, `qa`, `security`, `eng-manager`.

Good variant, same answer, different world:

```json
"roleVariants": {
  "devops-sre": {
    "scenario": "A nightly Terraform drift check should run at 02:00 in your region and page you only when drift is found.",
    "prompt": "Configure the scheduled job for the cheapest possible wake."
  },
  "qa": {
    "scenario": "A nightly regression suite summary should land at 02:00 in your region and stay out of the chat sidebar.",
    "prompt": "Configure the scheduled job for the cheapest possible wake."
  }
}
```

Target at least 40 percent of a world's challenges carrying two or more role
variants, weighted toward the harder kinds.

## Writing style

- English only, in every field.
- Never use a double hyphen or an em dash. Use commas, colons, parentheses or a
  second sentence.
- Address the learner as "you".
- Hints escalate genuinely: tier 1 points at the concept, tier 2 explains it,
  tier 3 all but names the answer. A tier 1 hint that gives away the answer
  breaks the economy, because tier 1 is free.
- Distractors must be plausible. A wrong option should be something a real user
  would actually try, such as reaching for `monitor_start` when `monitor_watch`
  is cheaper, or passing a `session` field to `cron_add`.

## Validating your work

```bash
npm run build:shared
npm run build:content -- --include-reference
```

The script prints a per pack summary with the kind distribution, the boss count
and the role variant count, then fails on the first schema violation with the
exact JSON path.
