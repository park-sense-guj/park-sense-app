import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { env } from '../config/env';
import { getFirebaseAuth } from '../config/firebase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;

function getGoogleSignIn(): GoogleSignInModule {
  // Lazy load so the app still boots before a native rebuild includes RNGoogleSignin.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
}

export function configureGoogleSignIn(): void {
  if (configured || !env.googleWebClientId) {
    return;
  }
  try {
    const { GoogleSignin } = getGoogleSignIn();
    GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      offlineAccess: false,
      profileImageSize: 160,
    });
    configured = true;
  } catch {
    // Native module missing until the next expo run:ios / run:android.
  }
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(env.googleWebClientId);
}

export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  if (!env.googleWebClientId) {
    throw new Error(
      'Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.',
    );
  }

  let GoogleSignin: GoogleSignInModule['GoogleSignin'];
  let isSuccessResponse: GoogleSignInModule['isSuccessResponse'];
  try {
    const mod = getGoogleSignIn();
    GoogleSignin = mod.GoogleSignin;
    isSuccessResponse = mod.isSuccessResponse;
  } catch {
    throw new Error(
      'Google Sign-In needs a native rebuild. Run expo run:ios or expo run:android, then try again.',
    );
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return 'cancelled';
  }
  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token. Check the Web client ID in Firebase.');
  }
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
  return 'success';
}

export async function signOutGoogle(): Promise<void> {
  try {
    const { GoogleSignin } = getGoogleSignIn();
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Ignore if Google was never signed in or native module is missing.
  }
}

export function readableGoogleSignInError(error: unknown): string {
  try {
    const { isErrorWithCode, statusCodes } = getGoogleSignIn();
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return 'Google sign-in is already in progress.';
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return 'Google Play Services is missing or outdated on this device.';
      }
      if (error.code === 'DEVELOPER_ERROR' || error.message?.includes('DEVELOPER_ERROR')) {
        return 'Google Sign-In setup is incomplete. Add this app’s SHA-1 fingerprint in Firebase Project settings, then download a fresh google-services.json.';
      }
    }
  } catch {
    // Fall through to generic message parsing.
  }
  const message = error instanceof Error ? error.message : '';
  if (message.includes('native rebuild') || message.includes('RNGoogleSignin')) {
    return message;
  }
  if (message.includes('network') || message.includes('NETWORK')) {
    return 'Network error while contacting Google. Try again.';
  }
  if (message.includes('operation-not-allowed')) {
    return 'Enable Google as a sign-in method in Firebase Authentication.';
  }
  return message || 'Google sign-in failed. Try again.';
}
