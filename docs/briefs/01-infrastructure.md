# Brief: infrastructure and continuous deployment

Read `docs/briefs/RULES.md` first, then `docs/ARCHITECTURE.md` and
`packages/shared/src/api.ts`.

**You own exclusively:** `infra/**` and `.github/workflows/**`.

## Deliverable 1: CDK v2 app under `infra/`

TypeScript, latest stable `aws-cdk-lib` v2, own `package.json` as npm workspace
`@kirocrew-academy/infra`, `tsconfig.json` extending `../tsconfig.base.json`,
`cdk.json`, `bin/app.ts`. All stacks in `us-east-1` and all names prefixed from a
context value so a second copy can coexist.

### AcademyAuthStack

Cognito user pool: email sign in, self signup, email verification by code,
password policy of at least 12 characters with mixed case and digits. App client
with no secret, `USER_SRP_AUTH` and `REFRESH_TOKEN_AUTH` plus the authorization
code flow. A Cognito domain prefix. Callback and logout URLs from a `siteUrl`
context value defaulting to `http://localhost:5173`. Output the pool id, client
id and domain.

### AcademyDataStack

One DynamoDB table, `PAY_PER_REQUEST`, partition key `pk` string, sort key `sk`
string, TTL attribute `ttl`, point in time recovery on, removal policy `RETAIN`.
Two GSIs exactly as `ARCHITECTURE.md` specifies: `gsi1` on `gsi1pk`/`gsi1sk` and
`gsi2` on `gsi2pk`/`gsi2sk`, both `INCLUDE` projection with `displayName`, `xp`,
`rankTitle`, `role`. Output the table name and ARN.

### AcademyApiStack

An `apigatewayv2` `HttpApi` with CORS allowing the site origin plus
`http://localhost:5173`, methods GET POST PATCH OPTIONS, headers `authorization`
and `content-type`. An `HttpJwtAuthorizer` bound to the user pool issuer with the
app client as audience.

Wire every route in `API_ROUTES` from `packages/shared/src/api.ts` to a Lambda
integration. `GET /health` is the only route with the authorizer disabled.

Use `aws-lambda-nodejs` `NodejsFunction`, runtime `NODEJS_22_X`, architecture
`ARM_64`, bundling with `minify` and `sourceMap` true. Entry points are
`api/src/handlers/{health,me,progress,attempt,hint,leaderboard,daily}.ts`. Those
exact paths are contractual: the API workstream is creating them in parallel, so
reference them even if they do not exist yet and note in `INTEGRATION_NOTES.md`
that synth needs them.

Grant each function only the DynamoDB actions it needs: read only for progress
and leaderboard, read and write for the rest. Pass `TABLE_NAME` and
`NODE_OPTIONS=--enable-source-maps`. Log retention one month. Output the API base
URL.

### AcademySiteStack

Private S3 bucket: block all public access, `S3_MANAGED` encryption, versioned,
removal policy `RETAIN`. CloudFront distribution using
`S3BucketOrigin.withOriginAccessControl`, default root object `index.html`,
viewer protocol redirect to https, HTTP2 and HTTP3, compression on, a cache
policy suited to a hashed asset bundle, and custom error responses mapping 403
and 404 to `/index.html` with status 200 so client side routing works. Output the
distribution domain, distribution id and bucket name.

### AcademyCiStack

A GitHub OIDC provider for `token.actions.githubusercontent.com` if the account
does not already have one, plus a deploy role assumable only by
`david4tech/kirocrew-academy`. Pin the audience to `sts.amazonaws.com` and the
subject to `repo:david4tech/kirocrew-academy:ref:refs/heads/main` and
`repo:david4tech/kirocrew-academy:environment:production`.

Grant what a CDK deploy needs: `sts:AssumeRole` on the `cdk-*-deploy-role`,
`cdk-*-file-publishing-role` and `cdk-*-lookup-role` in this account, plus S3
put, delete and list on the site bucket and `cloudfront:CreateInvalidation`.
**No wildcard admin policy.** Output the role ARN.

Detect an existing provider with a read only
`aws iam list-open-id-connect-providers --profile personal` call, make the stack
conditional on the finding, and document which branch you took.

## Deliverable 2: `.github/workflows/ci.yml`

On `pull_request` and on push to any branch other than `main`: checkout,
`setup-node` 22 with npm cache, `npm ci`, `npm run build:shared`,
`npm run build:content -- --include-reference`, `npm run typecheck`,
`npm run lint`, `npm test`, `cdk synth`. No AWS credentials, no deploy step.

## Deliverable 3: `.github/workflows/deploy.yml`

On push to `main` and on `workflow_dispatch`. A `concurrency` group so two
deploys cannot race. Permissions `id-token: write` and `contents: read`.

Steps: the whole CI sequence, then `configure-aws-credentials` v4 with the OIDC
role and region `us-east-1`, then `cdk deploy` of all stacks with
`--require-approval never`, then read the stack outputs into the environment,
then build the web app with the `VITE_` variables sourced from those outputs,
then `aws s3 sync --delete` with a long `cache-control` on hashed assets and
`no-cache` on `index.html`, then a CloudFront invalidation of `/index.html` and
`/`, then a final `curl` of `/health` that fails the job on a non 200.

Take the role from the repository variable `AWS_DEPLOY_ROLE_ARN`. Hardcode no ARN.

## Deliverable 4: `infra/README.md`

The one time bootstrap the human runs themselves: exact copy-pasteable
`cdk bootstrap` and first `cdk deploy` commands using `--profile personal`, the
`gh` commands to set the `AWS_DEPLOY_ROLE_ARN` repository variable, and a note
that a KiroCrew guardrail blocks CloudFormation mutation from an agent session,
which is why a human runs the bootstrap.

## Verification

Run and report verbatim: `npm install`, `npx tsc --noEmit` for infra, and
`npx cdk synth`. A synth that fails only because the `api/src/handlers` files do
not exist yet is an acceptable outcome, but say so explicitly rather than
claiming success. Also parse both workflow YAML files and report the result.

## Stop conditions

Stop and report if `docs/ARCHITECTURE.md` contradicts this brief, if a required
CDK construct is unavailable in the installed `aws-cdk-lib`, or if you would need
to touch a directory another workstream owns.
