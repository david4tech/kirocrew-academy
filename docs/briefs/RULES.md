# Rules of engagement for every workstream

Applies to all briefs in this directory. Read your brief together with this file.

## Repository

`/Users/davidarias/workplace/kirocrew-academy`, branch `feat/foundation`, npm
workspaces, Node 22 or newer.

## Binding contract, already written and already built

- `docs/ARCHITECTURE.md` is the architecture contract.
- `packages/shared/src/` holds types, scoring, grading, progression, the zod
  content schema and the HTTP route table. It is already built to
  `packages/shared/dist`.
- `content/_reference/world-00-reference.json` is a complete valid content world.

**No workstream edits `packages/shared`.** If the contract genuinely cannot
express what you need, stop and report it. Do not work around it locally and do
not redefine a type in your own package.

## Ownership

Each brief names the directories you own exclusively. Touching a directory
another workstream owns causes a merge conflict that costs more than it saves.

Nobody edits: the root `package.json`, `tsconfig.base.json`, `scripts/`,
`docs/`, `README.md`, `.gitignore`. If one of those must change, write your
request into `<your-dir>/INTEGRATION_NOTES.md` and it will be applied during
integration.

## Git

**Run no git command at all**: no `add`, `commit`, `branch`, `checkout`, `stash`
or `push`. Integration and commits happen in the parent session. Concurrent
commits from parallel workstreams corrupt the branch.

## AWS

Target account is AWS profile `personal`, account `030901817847`, region
`us-east-1`. The profile has no default region so always pass it explicitly.

**Deploy nothing.** No `cdk deploy`, no `cdk bootstrap`, no mutating AWS API
call. Read-only calls such as `describe`, `list` and `get` are fine. A
CloudFormation mutation is blocked by a KiroCrew guardrail regardless, and the
human runs the one time bootstrap themselves.

## Generating the content bundles

Several workstreams need the generated content. Produce it with:

```bash
npm run build:shared
node scripts/build-content.mjs --include-reference
```

That writes `web/src/generated/content.public.json` (no solutions, no hint text)
and `api/src/generated/content.full.json` (complete). Both are gitignored. Do not
edit the build script.

## Writing style for anything a human reads

English only. Never use a double hyphen or an em dash: use commas, colons,
parentheses or a second sentence. Comments in code stay brief and explain why,
not what.

## Verification is part of the deliverable

Run the checks your brief names and paste the real output. A green claim that
does not match the actual output is worse than an honest failure, because it
moves the debugging cost downstream. If something does not pass, say what and
why.

## Reporting

Report: files created, verbatim verification output, decisions you had to make,
any `INTEGRATION_NOTES.md` entries, and every unresolved issue.
