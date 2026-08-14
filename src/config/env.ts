function read(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  firebaseApiKey: read('EXPO_PUBLIC_FIREBASE_API_KEY'),
  firebaseAuthDomain: read('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  firebaseDatabaseUrl: read('EXPO_PUBLIC_FIREBASE_DATABASE_URL'),
  firebaseProjectId: read('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  firebaseStorageBucket: read('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  firebaseMessagingSenderId: read('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  firebaseAppId: read('EXPO_PUBLIC_FIREBASE_APP_ID'),
  googleMapsApiKey: read('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY'),
  googleMapsAndroidKey: read('EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY'),
  googleMapsIosKey: read('EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY'),
  googleWebClientId: read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  adminEmail: read('EXPO_PUBLIC_ADMIN_EMAIL', 'admin@parksense.app').toLowerCase(),
};

export function hasFirebaseConfig(): boolean {
  return Boolean(env.firebaseApiKey && env.firebaseDatabaseUrl && env.firebaseProjectId);
}

export function mapsKeyForNative(): string {
  return env.googleMapsAndroidKey || env.googleMapsIosKey || env.googleMapsApiKey;
}
