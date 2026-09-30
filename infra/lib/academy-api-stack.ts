import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import { API_ROUTES } from '@kirocrew-academy/shared';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AcademyApiStackProps extends StackProps {
  readonly stackPrefix: string;
  readonly siteUrl: string;
  readonly table: dynamodb.Table;
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
}

/**
 * Handler entry name to DynamoDB access level. progress and leaderboard only
 * read; every other route needs to write profile, challenge or hint records.
 */
type AccessLevel = 'read' | 'readwrite';

interface RouteDef {
  readonly routeKey: keyof typeof API_ROUTES;
  readonly handlerFile: string;
  readonly access: AccessLevel;
  readonly requiresAuth: boolean;
}

const ROUTE_DEFS: RouteDef[] = [
  { routeKey: 'HEALTH', handlerFile: 'health', access: 'read', requiresAuth: false },
  { routeKey: 'GET_ME', handlerFile: 'me', access: 'readwrite', requiresAuth: true },
  { routeKey: 'PATCH_ME', handlerFile: 'me', access: 'readwrite', requiresAuth: true },
  { routeKey: 'GET_PROGRESS', handlerFile: 'progress', access: 'read', requiresAuth: true },
  { routeKey: 'START_ATTEMPT', handlerFile: 'attempt', access: 'readwrite', requiresAuth: true },
  { routeKey: 'SUBMIT_ATTEMPT', handlerFile: 'attempt', access: 'readwrite', requiresAuth: true },
  { routeKey: 'REVEAL_HINT', handlerFile: 'hint', access: 'readwrite', requiresAuth: true },
  { routeKey: 'GET_LEADERBOARD', handlerFile: 'leaderboard', access: 'read', requiresAuth: true },
  { routeKey: 'CLAIM_DAILY', handlerFile: 'daily', access: 'readwrite', requiresAuth: true },
];

export class AcademyApiStack extends Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: AcademyApiStackProps) {
    super(scope, id, props);

    const { stackPrefix, siteUrl, table, userPool, userPoolClient } = props;

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `${stackPrefix}-api`,
      corsPreflight: {
        allowOrigins: [siteUrl, 'http://localhost:5173'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['authorization', 'content-type'],
      },
    });

    const authorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      'JwtAuthorizer',
      `https://cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
        identitySource: ['$request.header.Authorization'],
      },
    );

    // De-duplicate handler functions: attempt has two routes on the same file,
    // me has two routes on the same file. Build the function once per file.
    const functionsByFile = new Map<string, lambdaNodejs.NodejsFunction>();

    const getOrCreateFunction = (handlerFile: string, access: AccessLevel): lambdaNodejs.NodejsFunction => {
      const existing = functionsByFile.get(handlerFile);
      if (existing) {
        return existing;
      }

      const entry = join(__dirname, '..', '..', 'api', 'src', 'handlers', `${handlerFile}.ts`);

      const fn = new lambdaNodejs.NodejsFunction(this, `Fn${capitalize(handlerFile)}`, {
        functionName: `${stackPrefix}-${handlerFile}`,
        entry,
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_22_X,
        architecture: lambda.Architecture.ARM_64,
        bundling: {
          minify: true,
          sourceMap: true,
        },
        environment: {
          TABLE_NAME: table.tableName,
          NODE_OPTIONS: '--enable-source-maps',
        },
        logRetention: logs.RetentionDays.ONE_MONTH,
      });

      if (access === 'read') {
        table.grantReadData(fn);
      } else {
        table.grantReadWriteData(fn);
      }

      functionsByFile.set(handlerFile, fn);
      return fn;
    };

    for (const route of ROUTE_DEFS) {
      const { method, path } = API_ROUTES[route.routeKey];
      const fn = getOrCreateFunction(route.handlerFile, route.access);

      this.httpApi.addRoutes({
        path,
        methods: [method as apigwv2.HttpMethod],
        integration: new apigwv2Integrations.HttpLambdaIntegration(
          `Integration${route.routeKey}`,
          fn,
        ),
        authorizer: route.requiresAuth ? authorizer : undefined,
      });
    }

    this.apiUrl = this.httpApi.apiEndpoint;
    new CfnOutput(this, 'ApiUrl', { value: this.apiUrl });
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
