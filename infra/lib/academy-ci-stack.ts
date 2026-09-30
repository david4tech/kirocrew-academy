import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

export interface AcademyCiStackProps extends StackProps {
  readonly stackPrefix: string;
  /** e.g. "david4tech/kirocrew-academy" */
  readonly githubOrgRepo: string;
  readonly siteBucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;
}

/**
 * Deploy role assumable by GitHub Actions OIDC, scoped to the CDK bootstrap
 * roles this account already has plus what the deploy job needs to publish
 * the SPA and invalidate the cache. No admin policy, no wildcard resource.
 *
 * READ-ONLY CHECK PERFORMED BEFORE WRITING THIS FILE:
 *   aws iam list-open-id-connect-providers --profile personal
 *   -> OpenIDConnectProviderList: [] (account 030901817847, us-east-1 query,
 *      IAM is global so this covers the whole account)
 * No existing token.actions.githubusercontent.com provider was found, so this
 * stack takes the CREATE branch and provisions a new OpenIdConnectProvider.
 * If that ever changes (someone else creates one out of band), re-run the
 * same list call before applying; a second provider for the same URL is
 * rejected by IAM, so this stack would then need to import the existing one
 * with iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn instead.
 */
export class AcademyCiStack extends Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: AcademyCiStackProps) {
    super(scope, id, props);

    const { stackPrefix, githubOrgRepo, siteBucket, distribution } = props;
    const region = Stack.of(this).region;
    const account = Stack.of(this).account;
    const partition = Stack.of(this).partition;

    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `${stackPrefix}-github-deploy`,
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': [
            `repo:${githubOrgRepo}:ref:refs/heads/main`,
            `repo:${githubOrgRepo}:environment:production`,
          ],
        },
      }),
      description: 'Assumed by GitHub Actions via OIDC to deploy Academy stacks',
    });

    // CDK deploy needs to assume its own bootstrap roles. These are scoped to
    // this account's CDK qualifier, not a wildcard admin grant.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AssumeCdkBootstrapRoles',
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:${partition}:iam::${account}:role/cdk-*-deploy-role-${account}-${region}`,
          `arn:${partition}:iam::${account}:role/cdk-*-file-publishing-role-${account}-${region}`,
          `arn:${partition}:iam::${account}:role/cdk-*-lookup-role-${account}-${region}`,
        ],
      }),
    );

    // The deploy job also syncs the built SPA straight to the site bucket
    // and invalidates CloudFront, bypassing a CDK asset publish for content
    // that changes on every deploy.
    siteBucket.grantPut(this.deployRole);
    siteBucket.grantDelete(this.deployRole);
    siteBucket.grantRead(this.deployRole);

    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvalidateDistribution',
        actions: ['cloudfront:CreateInvalidation'],
        resources: [
          `arn:${partition}:cloudfront::${account}:distribution/${distribution.distributionId}`,
        ],
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: this.deployRole.roleArn });
  }
}
