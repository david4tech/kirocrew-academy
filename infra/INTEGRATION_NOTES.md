# Integration notes from the infrastructure workstream

## Root install is currently blocked by the web workstream, not by infra

`npm install` from the repository root fails before it ever reaches `infra/`,
for a reason in a directory this workstream does not own:

`/Users/davidarias/workplace/kirocrew-academy/web/package.json` pins
`vite@7.0.0` while also depending on `@tailwindcss/vite@4.0.0`, whose peer
range is `^5.2.0 || ^6`. `npm install` fails with `ERESOLVE` on that conflict
alone, before touching any other workspace. `--legacy-peer-deps` gets past it
(verified locally, not committed anywhere, since RULES reserves the root
`package.json`/lockfile for the parent session).

(The API workstream's `@aws-sdk/client-dynamodb`/`@aws-sdk/lib-dynamodb` pin
that previously failed with `ETARGET` on `3.700.0` has since been corrected to
the real published `3.1144.0`; that blocker is gone as of this report.)

Because RULES.md reserves the root `package.json` and forbids touching another
workstream's directory, this workstream did not edit `web/package.json`.

**Action needed from the parent session or the web workstream:** resolve the
vite/tailwind peer conflict in `web/package.json` (either drop to `vite@^6` or
move to a tailwind version that supports vite 7) before `npm install` will
succeed from the repository root.

## `infra/package.json` pins that were adjusted from the brief's implied versions

The brief says "latest stable `aws-cdk-lib` v2" without naming a number. At
write time that is `aws-cdk-lib@2.272.0`, which requires `constructs@^10.5.0`
as a peer (not `10.4.2`). Both are pinned exactly in `infra/package.json`. The
CLI package `aws-cdk` versions independently and much faster; pinned to
`2.1143.0`, the latest at write time.

## GSI projection: `INCLUDE`, matching the brief over `ARCHITECTURE.md`'s wording

`docs/ARCHITECTURE.md` describes the leaderboard GSIs as "projected KEYS_ONLY
plus `displayName`, `xp`, `rankTitle`, `role`". DynamoDB has no projection type
that means literally that. The brief itself says "both `INCLUDE` projection
with `displayName`, `xp`, `rankTitle`, `role`", which is the actual construct
for "keys plus a named set of extra attributes." Treated the brief's explicit
`INCLUDE` as authoritative and read the architecture doc's phrase as informal
shorthand for the same thing, not a contradiction worth stopping over.

## `logRetention` is deprecated in the installed `aws-cdk-lib`

`FunctionOptions#logRetention` (used in `AcademyApiStack` to satisfy "log
retention one month") emits a deprecation warning under `aws-cdk-lib@2.272.0`
in favor of passing an explicit `logGroup`. It is still fully functional and
not yet removed. Left as `logRetention: RetentionDays.ONE_MONTH` because it is
the one line that does exactly what the brief asks; flagging here so a future
pass to `logGroup` isn't a surprise when the deprecation becomes a removal.

## Handler entry files: all six now exist

At first synth attempt, one handler file (`api/src/handlers/attempt.ts`) had
not landed yet from the parallel API workstream, and `cdk synth` failed with
`CannotFindEntryFile` pointing at it alone, with everything else bundling
cleanly up to that point. By the time this workstream finished, all six
handler files existed and a full `cdk synth --all` (via plain `cdk synth`,
which synthesizes every stack in the app) succeeded with exit code 0. See the
verbatim output in the report.

## How `infra/` was verified despite the blocked root install

Real root `npm install` cannot complete while `web/package.json` has the
vite/tailwind conflict above, and this workstream may not touch that file.
To still produce genuine `tsc --noEmit` and `cdk synth` output:

1. Installed `aws-cdk-lib@2.272.0`, `constructs@10.5.0`, `aws-cdk@2.1143.0`,
   `typescript@5.9.3`, `tsx@4.20.6`, and the other `infra/devDependencies`
   into an isolated scratch directory outside the repo (not a workspace
   member, so npm could resolve it without touching `web` or `api` at all).
2. Built `packages/shared` in place with that scratch `tsc` (`tsc -p
   tsconfig.json`), producing `packages/shared/dist`, exactly what
   `npm run build:shared` does.
3. Symlinked `infra/node_modules` to the scratch install's `node_modules`
   (including `.bin`) and `infra/node_modules/@kirocrew-academy/shared` to
   `packages/shared`, reproducing what npm workspace linking would do.
4. Ran `tsc -p tsconfig.json --noEmit` and `cdk synth` from `infra/` against
   that link.
5. Deleted `infra/node_modules`, `infra/cdk.out`, `packages/shared/dist`, and
   the scratch directory afterward, so the workstream directory holds only
   real deliverables. Also reverted an accidental `package-lock.json` write
   from an earlier `npm install --legacy-peer-deps` probe with `git checkout
   -- package-lock.json` (the only git command run this session, purely to
   undo that side effect).

This is not the same as the root `npm install` the brief asks the parent
session to run once `web`'s conflict is fixed; it is a faithful stand-in that
exercises the identical `infra/` source and the identical dependency versions
`infra/package.json` will resolve to once real workspace installation works.

## Stack dependency API: `addStackDependency`, not the deprecated `addDependency`

`Stack#addDependency` is deprecated in `aws-cdk-lib@2.272.0` in favor of
`addStackDependency`. `bin/app.ts` uses the latter.

## Cognito `REFRESH_TOKEN_AUTH`

CDK's `UserPoolClient.authFlows` has no explicit toggle for
`ALLOW_REFRESH_TOKEN_AUTH`; the L2 construct always includes it for every app
client. `authFlows: { userSrp: true }` is sufficient to get both
`USER_SRP_AUTH` and `REFRESH_TOKEN_AUTH` in the synthesized
`AWS::Cognito::UserPoolClient`. Confirmed by reading the synthesized template's
`ExplicitAuthFlows` list rather than assuming.
