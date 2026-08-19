/**
 * Expo only inlines *static* `process.env.EXPO_PUBLIC_*` at bundle time.
 * Dynamic access like `process.env[name]` works in Metro (Debug) but is empty
 * in Release → Firebase looks unconfigured and the app aborts on launch.
 */
export const env = {
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseDatabaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  googleMapsAndroidKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '',
  googleMapsIosKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? '',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  adminEmail: (process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? 'admin@parksense.app').toLowerCase(),
};

export function hasFirebaseConfig(): boolean {
  return Boolean(env.firebaseApiKey && env.firebaseDatabaseUrl && env.firebaseProjectId);
}

export function mapsKeyForNative(): string {
  return env.googleMapsAndroidKey || env.googleMapsIosKey || env.googleMapsApiKey;
}
