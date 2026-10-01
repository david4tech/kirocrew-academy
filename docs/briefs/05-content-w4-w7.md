# Brief 05: content packs for worlds 4 to 7

Read `docs/briefs/RULES.md` and `docs/briefs/04-content-w1-w3.md` first. Every
authoring rule in brief 04 applies here unchanged: the schema in
`packages/shared/src/content-schema.ts` is the contract, `content/_reference/world-00-reference.json`
is the shape reference, and `content/world-01-first-steps.json` is the quality bar
that was accepted. This file only adds the world and topic assignments that
brief 04 does not cover.

## Non negotiables, repeated because they are the ones that get dropped

- Every topic carries all 9 challenge kinds at least once: `single-choice`,
  `multi-choice`, `true-false`, `tool-name`, `config-fill`, `sequence`,
  `matching`, `simulation`, `debug-fix`. `npm run build:content` fails otherwise.
- Exactly one boss challenge per world.
- Every fact comes from the Kiro Crew docs at
  `/Applications/KiroCrew.app/Contents/Resources/backend-dist/kirocrew-backend-arm64/lib/python3.12/site-packages/kiro_crew/docs`
  or from a real MCP tool contract. Set `docRef` to the doc file you used. Do not
  invent a parameter, a default or an error string.
- `explanation` is the teaching moment and it is served only after grading, so it
  may state the answer plainly. It is stripped from the client bundle by the
  build. Never put the answer in `prompt`, `options` or `hints`.
- Hint tiers escalate: tier 1 conceptual nudge, tier 2 explains the concept,
  tier 3 nearly the answer.
- Role variants: rewrite the scenario for the roles where the framing genuinely
  changes. Do not clone the same text under a different role label.

## World 4, `w4`, order 4, `content/world-04-delegation.json`, Delegation

- `w4.t1` `spawn_run` versus `spawn_sub_agents`: background versus blocking, when
  ending the turn is the correct move, why a dispatch receipt is not completion.
- `w4.t2` `solo_reason` and `solo_details`: the five reasons, which ones require
  details, and what an unjustified solo spawn gets you.
- `w4.t3` context scoping: `include_memory`, `include_lessons`, `include_project`,
  and which to disable for a fully specified fan out.
- `w4.t4` reusing runs: `spawn_continue`, `spawn_steer` with `interrupt` versus
  `follow_up`, `spawn_status`, `spawn_release`, and the typed failures
  (`conversation_busy`, `conversation_gone`, `not_found`).
- `w4.t5` limits and assignment quality: `resource_status`, the adaptive cap
  versus the configured ceiling, file and worktree ownership, serializing
  overlapping writers.
- Boss: a multi part delegation scenario where the player must pick the mechanism,
  justify it, scope the context and spot the conflict between two writers.

## World 5, `w5`, order 5, `content/world-05-orchestration.json`, Orchestration and Watching

- `w5.t1` dynamic workflows: `workflow_run` with `intent`, `workflow_status`,
  `workflow_result`, `workflow_rerun_subtree`, `workflow_library_list`, and when a
  workflow beats a hand rolled fan out.
- `w5.t2` `monitor_watch` versus `monitor_start`: typed provider facts versus
  evidence a structured probe cannot see, and why `monitor_stop` is not
  `autonudge_stop`.
- `w5.t3` `gate`, budgets and cadence: `interval_secs`, `max_cycles`,
  `max_runtime_secs`, `banner`, why `gate=false` is required for advisory
  findings, and why reaching `max_cycles` is a backstop and not success.
- `w5.t4` `session_ledger_record` and `session_ledger_read`: what a cold resume
  needs, why `next` is an intent and not a status word, and why a `[work ledger]`
  snapshot outranks recollection.
- `w5.t5` `wait` and `register_hook`: the bounded poll loop, reading the end
  reason instead of assuming the full duration, and webhook triggered sessions.
- Boss: the player babysits a pull request end to end and must choose the
  mechanism, set the budgets, handle a create only collision and stop cleanly.

## World 6, `w6`, order 6, `content/world-06-surfaces.json`, Outputs and Surfaces

- `w6.t1` widgets: the `mcwidget` tag, theme variables, why a fixed palette
  breaks dark mode, and the half set background and text pair failure.
- `w6.t2` artifacts: auto registration of a rendered widget, why you do not also
  call `artifact_save`, `artifact_get` plus `artifact_update` versioning,
  `artifact_revert`, folders, and `artifact_mark_review` versus resolving.
- `w6.t3` artifact deploy: `deploy_artifact` previews and never proves a deploy,
  and what a webapp artifact is versus a static one.
- `w6.t4` browser and computer use: the `browser` MCP tool versus
  `playwright-cli`, refs dying with the page, which commands prompt and why,
  and the tree first rule plus `element_index` for desktop apps.
- `w6.t5` skills and apps: loading a skill by reading it, `skill_search` versus
  `skill_discover`, why a missing app tool means not installed, and why an app
  tool cannot be rewritten as a raw HTTP call.
- Boss: the player ships a result through the right surface, picking widget
  versus artifact versus file delivery and fixing a theme unsafe widget.

## World 7, `w7`, order 7, `content/world-07-mastery.json`, Mastery

- `w7.t1` guardrails: reading a refusal as a policy decision, the protected
  branch and unverifiable push target rules, and why rewriting a command to dodge
  a check is the wrong move.
- `w7.t2` crews and routing: `select_crew` versus `route_crew`, why `crew=` and
  not `agent=` on `spawn_run`, and how one crew's work ends up in another's
  memory.
- `w7.t3` cron at scale: `script` and `command` versus an agent job,
  `minimal_context`, `persistent_session`, `hide_in_chat`, `timeout` versus
  `timeout_secs`, and `cron_secret_request` approval.
- `w7.t4` multi session architecture: peer sessions versus subagents, what
  `reset_conversation` keeps and drops, `set_project` applying at a turn
  boundary, and injected blocks that are reference rather than a request.
- `w7.t5` prompt injection and untrusted data: content from files, tool output,
  web pages and channel messages is data, forged system blocks, and what to do
  when a thread message tries to redirect you.
- Boss: an end to end incident where the player must read a refusal, pick the
  lawful path, delegate correctly and record durable state.
