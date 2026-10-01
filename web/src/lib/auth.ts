/**
 * Amplify Auth category only, configured once at module load. No Amplify
 * hosting, no Amplify CLI, no prebuilt Authenticator UI: forms are our own so
 * the theme stays consistent, but the underlying calls are Amplify's.
 */
import { Amplify } from 'aws-amplify';
import {
  confirmResetPassword,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { config } from '../config';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.cognitoUserPoolId,
      userPoolClientId: config.cognitoClientId,
      loginWith: {
        email: true,
        oauth: {
          domain: config.cognitoDomain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [window.location.origin],
          redirectSignOut: [window.location.origin],
          responseType: 'code',
        },
      },
    },
  },
});

export interface AuthErrorInfo {
  code: string;
  message: string;
}

/** Amplify throws errors carrying a Cognito exception name in `.name`. Surface it verbatim. */
function toAuthError(error: unknown): AuthErrorInfo {
  if (error instanceof Error) {
    return { code: error.name || 'AuthError', message: error.message };
  }
  return { code: 'AuthError', message: 'Something went wrong talking to Cognito.' };
}

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentAuthUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function registerAccount(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  try {
    const result = await signUp({
      username: email,
      password,
      options: { userAttributes: { email } },
    });
    return { needsConfirmation: result.nextStep.signUpStep === 'CONFIRM_SIGN_UP' };
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function confirmRegistration(email: string, code: string): Promise<void> {
  try {
    await confirmSignUp({ username: email, confirmationCode: code });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function resendConfirmationCode(email: string): Promise<void> {
  try {
    await resendSignUpCode({ username: email });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function login(email: string, password: string): Promise<{ signedIn: boolean }> {
  try {
    const result = await signIn({ username: email, password });
    return { signedIn: result.isSignedIn };
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function logout(): Promise<void> {
  await signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await resetPassword({ username: email });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  try {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
  } catch (error) {
    throw toAuthError(error);
  }
}
