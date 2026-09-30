# infra

CDK v2 app for KiroCrew Academy: Cognito user pool, DynamoDB table, HTTP API
with Lambda integrations, S3 and CloudFront for the SPA, and the GitHub OIDC
deploy role. See `/Users/davidarias/workplace/kirocrew-academy/docs/ARCHITECTURE.md`
for the full picture.

## One time bootstrap (human only)

A KiroCrew guardrail blocks CloudFormation mutation (`deploy`, `create-stack`,
`update-stack`, change sets) from an agent session, so bootstrap and the first
deploy must run from your own terminal, not from an agent.

From the repository root, with dependencies installed (`npm install`) and
`packages/shared` built (`npm run build:shared`):

```bash
# One time per account and region.
npx cdk bootstrap aws://030901817847/us-east-1 \
  --profile personal \
  --app "npx tsx infra/bin/app.ts"

# First deploy of all five stacks.
npx cdk deploy --all \
  --profile personal \
  --app "npx tsx infra/bin/app.ts" \
  --require-approval broadening
```

Or from inside `infra/`:

```bash
cd infra
npx cdk bootstrap aws://030901817847/us-east-1 --profile personal
npx cdk deploy --all --profile personal --require-approval broadening
```

After the first deploy, read the `AcademyCiStack.DeployRoleArn` output and set
it as a repository variable so `.github/workflows/deploy.yml` can assume it:

```bash
gh variable set AWS_DEPLOY_ROLE_ARN \
  --repo david4tech/kirocrew-academy \
  --body "<the DeployRoleArn output value>"
```

From then on, every push to `main` deploys through the pipeline; nothing else
needs a human to run `cdk deploy` again unless the deploy role itself changes.

## Context values

| Key | Default | Purpose |
|---|---|---|
| `academy:stackPrefix` | `Academy` | Prefix for every stack and resource name |
| `academy:siteUrl` | `http://localhost:5173` | Cognito callback/logout URL and CORS origin |
| `academy:githubOrgRepo` | `david4tech/kirocrew-academy` | OIDC trust policy subject |

Override at the CLI with `--context academy:siteUrl=https://academy.example.com`.

## Stacks

- `AcademyAuthStack`: Cognito user pool, app client, hosted domain.
- `AcademyDataStack`: single DynamoDB table, two GSIs for the leaderboard.
- `AcademyApiStack`: HTTP API, JWT authorizer, one Lambda per handler file.
- `AcademySiteStack`: private S3 bucket, CloudFront with Origin Access Control.
- `AcademyCiStack`: GitHub OIDC provider and the least-privilege deploy role.

## Local commands

```bash
npm run typecheck -w @kirocrew-academy/infra
npm run cdk -- synth
npm run cdk -- diff
```
