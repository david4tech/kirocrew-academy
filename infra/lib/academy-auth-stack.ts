import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';

export interface AcademyAuthStackProps extends StackProps {
  readonly stackPrefix: string;
  readonly siteUrl: string;
}

/**
 * Cognito user pool with email sign in and self signup. The app client has no
 * secret because the SPA runs entirely in the browser and cannot keep one.
 */
export class AcademyAuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AcademyAuthStackProps) {
    super(scope, id, props);

    const { stackPrefix, siteUrl } = props;

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${stackPrefix}-users`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient('AppClient', {
      userPoolClientName: `${stackPrefix}-web`,
      generateSecret: false,
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: [siteUrl, `${siteUrl}/`],
        logoutUrls: [siteUrl, `${siteUrl}/`],
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    // USER_SRP_AUTH is enabled via authFlows.userSrp above; REFRESH_TOKEN_AUTH
    // is on by default for every app client and cannot be disabled per-client.

    this.userPoolDomain = this.userPool.addDomain('Domain', {
      cognitoDomain: {
        domainPrefix: `${stackPrefix.toLowerCase()}-${Stack.of(this).account}`,
      },
    });

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new CfnOutput(this, 'UserPoolDomain', {
      value: this.userPoolDomain.domainName,
    });
  }
}
