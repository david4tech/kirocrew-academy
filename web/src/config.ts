/**
 * Typed runtime configuration, read once from Vite env vars. Throws a readable
 * error at startup when a required variable is missing, instead of failing
 * later with an opaque network or auth error.
 */

interface AcademyConfig {
  apiBaseUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoDomain: string;
}

function readEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value || typeof value !== 'string') {
    throw new Error(
      `Missing required environment variable ${key}. Copy web/.env.example to web/.env.local and fill it in.`,
    );
  }
  return value;
}

function buildConfig(): AcademyConfig {
  return {
    apiBaseUrl: readEnv('VITE_API_BASE_URL'),
    cognitoUserPoolId: readEnv('VITE_COGNITO_USER_POOL_ID'),
    cognitoClientId: readEnv('VITE_COGNITO_CLIENT_ID'),
    cognitoDomain: readEnv('VITE_COGNITO_DOMAIN'),
  };
}

export const config: AcademyConfig = buildConfig();
