import '@testing-library/jest-dom/vitest';

// Config values read at module load time (config.ts, auth.ts) need a value in every
// test run, since import.meta.env is not populated from a real .env file under Vitest.
Object.assign(import.meta.env, {
  VITE_API_BASE_URL: 'https://api.test.kirocrew-academy.dev',
  VITE_COGNITO_USER_POOL_ID: 'us-east-1_TESTPOOL',
  VITE_COGNITO_CLIENT_ID: 'test-client-id',
  VITE_COGNITO_DOMAIN: 'test.auth.us-east-1.amazoncognito.com',
});

