import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';

import { env, hasFirebaseConfig } from './env';

type AuthWithRnPersistence = {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

function createApp(): FirebaseApp {
  if (!hasFirebaseConfig()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and add your Firebase web keys.',
    );
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: env.firebaseApiKey,
    authDomain: env.firebaseAuthDomain,
    databaseURL: env.firebaseDatabaseUrl,
    projectId: env.firebaseProjectId,
    storageBucket: env.firebaseStorageBucket,
    messagingSenderId: env.firebaseMessagingSenderId,
    appId: env.firebaseAppId,
  });
}

function createAuth(firebaseApp: FirebaseApp): Auth {
  try {
    // Default firebase/auth typings omit the RN export; Metro still provides it at runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require('firebase/auth') as AuthWithRnPersistence;
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = createApp();
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = createAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDatabase(): Database {
  if (!database) {
    database = getDatabase(getFirebaseApp());
  }
  return database;
}
