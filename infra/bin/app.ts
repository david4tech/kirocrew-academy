import 'source-map-support/register.js';
import { App } from 'aws-cdk-lib';
import { AcademyAuthStack } from '../lib/academy-auth-stack.js';
import { AcademyDataStack } from '../lib/academy-data-stack.js';
import { AcademyApiStack } from '../lib/academy-api-stack.js';
import { AcademySiteStack } from '../lib/academy-site-stack.js';
import { AcademyCiStack } from '../lib/academy-ci-stack.js';

const app = new App();

const account = '030901817847';
const region = 'us-east-1';
const env = { account, region };

const stackPrefix = app.node.tryGetContext('academy:stackPrefix') as string | undefined ?? 'Academy';
const siteUrl = app.node.tryGetContext('academy:siteUrl') as string | undefined ?? 'http://localhost:5173';
const githubOrgRepo = app.node.tryGetContext('academy:githubOrgRepo') as string | undefined ?? 'david4tech/kirocrew-academy';

const authStack = new AcademyAuthStack(app, `${stackPrefix}AuthStack`, {
  env,
  stackPrefix,
  siteUrl,
});

const dataStack = new AcademyDataStack(app, `${stackPrefix}DataStack`, {
  env,
  stackPrefix,
});

const apiStack = new AcademyApiStack(app, `${stackPrefix}ApiStack`, {
  env,
  stackPrefix,
  siteUrl,
  table: dataStack.table,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});
apiStack.addStackDependency(dataStack);
apiStack.addStackDependency(authStack);

const siteStack = new AcademySiteStack(app, `${stackPrefix}SiteStack`, {
  env,
  stackPrefix,
});

new AcademyCiStack(app, `${stackPrefix}CiStack`, {
  env,
  stackPrefix,
  githubOrgRepo,
  siteBucket: siteStack.siteBucket,
  distribution: siteStack.distribution,
});
