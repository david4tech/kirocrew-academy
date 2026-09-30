/**
 * Builds a minimal fake APIGatewayProxyEventV2WithJWTAuthorizer for handler
 * tests, carrying just the fields the handlers actually read.
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export interface FakeEventOptions {
  method?: string;
  rawPath?: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: unknown;
  sub?: string;
  email?: string;
  omitAuth?: boolean;
}

export function fakeEvent(options: FakeEventOptions = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  const { method = 'GET', rawPath = '/', pathParameters, queryStringParameters, body, sub = 'user-1', email = 'user1@example.com', omitAuth = false } = options;

  return {
    version: '2.0',
    routeKey: `${method} ${rawPath}`,
    rawPath,
    rawQueryString: '',
    headers: {},
    pathParameters,
    queryStringParameters,
    isBase64Encoded: false,
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      accountId: '000000000000',
      apiId: 'test-api',
      domainName: 'test.local',
      domainPrefix: 'test',
      http: {
        method,
        path: rawPath,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: `${method} ${rawPath}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      authorizer: omitAuth
        ? ({} as APIGatewayProxyEventV2WithJWTAuthorizer['requestContext']['authorizer'])
        : {
            jwt: {
              claims: { sub, email },
              scopes: [],
            },
          },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

export function readBody<T>(result: { body?: string }): T {
  return JSON.parse(result.body ?? '{}') as T;
}
