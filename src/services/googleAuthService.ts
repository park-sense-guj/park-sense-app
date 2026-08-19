import { GoogleAuthProvider, reauthenticateWithCredential, signInWithCredential } from 'firebase/auth';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { env } from '../config/env';
import { getFirebaseAuth } from '../config/firebase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let configured = false;

/** getEnforcing() redboxes even inside try/catch. Probe first, then require. */
function hasNativeGoogleSignIn(): boolean {
  return Boolean(TurboModuleRegistry.get('RNGoogleSignin') ?? NativeModules.RNGoogleSignin);
}

function getGoogleSignIn(): GoogleSignInModule {
  if (!hasNativeGoogleSignIn()) {
    throw new Error(
      'Google Sign-In needs a native rebuild. Run expo run:ios or expo run:android, then try again.',
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
}

export function configureGoogleSignIn(): void {
  if (configured || !env.googleWebClientId || !hasNativeGoogleSignIn()) {
    return;
  }
  try {
    const { GoogleSignin } = getGoogleSignIn();
    GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      // iOS also has CLIENT_ID in GoogleService-Info.plist; passing it explicitly
      // avoids Release builds failing to resolve the iOS OAuth client.
      iosClientId: env.googleIosClientId || undefined,
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
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  // Clear a stale Google session so Release builds don't silently cancel.
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore — first sign-in has nothing to clear.
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return 'cancelled';
  }
  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error(
      'Google did not return an ID token. Use the Web client ID (not the iOS client ID) in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
    );
  }
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
  return 'success';
}

export async function reauthenticateWithGoogle(): Promise<void> {
  if (!env.googleWebClientId) {
    throw new Error('Google Sign-In is not configured.');
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
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error('Google confirmation was cancelled.');
  }
  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token.');
  }
  const credential = GoogleAuthProvider.credential(idToken);
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error('You need to be signed in.');
  }
  await reauthenticateWithCredential(user, credential);
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
