# KiroCrew Academy

A gamified learning platform for mastering KiroCrew, from the anatomy of a single
turn to multi session orchestration. Seven worlds, nine challenge modalities per
topic, eight role tracks, server authoritative scoring.

![Kiro](web/public/kiro-logo.png)

## What it teaches

| World | Theme |
|---|---|
| 1 | First steps: dashboard, sessions, workspaces, project scope, steering, turn anatomy |
| 2 | Memory and learning: recall, lessons, chat history, knowledge library, restricted sessions |
| 3 | Scheduling: cron jobs, agent vs script vs command, timezones, cheap wakes, lifecycle |
| 4 | Delegation: subagents, solo reasons, context scoping, steering and continuing runs |
| 5 | Orchestration and watching: workflows, structured monitors, timer loops, session ledger |
| 6 | Surfaces and output: widgets, artifacts, deployment, browser and computer use, skills |
| 7 | Mastery: guardrails, crews and routing, custom MCP servers, end to end incidents |

Each topic exercises all nine modalities: single choice, multi choice, true or
false, naming the tool, filling real configuration, ordering a flow, matching
tools to purposes, simulating a session, and repairing a broken call.

## Game systems

- **Scoring** base points per modality, difficulty multiplier, first try bonus,
  combo streak up to 50 percent, speed bonus up to 20 percent, hint penalties.
- **Ranks** Recruit, Operator, Conductor, Orchestrator, Crew Master.
- **Progressive unlocking** topics are sequential, a world opens at 80 percent
  mastery of the previous one, the boss opens once the world is fully mastered,
  and a free play sandbox opens after the third boss.
- **Hints** three escalating tiers paid for with hint tokens and point penalties.
- **Badges** nine achievements including completing a world with zero hints.
- **Leaderboard** global and per role.

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Zustand on the front.
Amazon Cognito for authentication. API Gateway HTTP API with Lambda on Node 22 and
DynamoDB on the back. CloudFront in front of a private S3 bucket. AWS CDK v2 for
infrastructure. GitHub Actions with OIDC for continuous deployment, so no long
lived AWS credentials exist anywhere.

See `docs/ARCHITECTURE.md` for the data contract and `docs/CONTENT_AUTHORING.md`
for the challenge authoring rules.

## Local development

```bash
npm install
npm run build:shared
npm run build:content -- --include-reference
npm run dev -w @kirocrew-academy/web
```

## Layout

```
packages/shared   types, scoring, grading, progression, content schema, route table
content           authored challenge packs, one per world
api               Lambda handlers and DynamoDB access
web               React single page app
infra             CDK stacks
scripts           content build and validation
```

## License

MIT
