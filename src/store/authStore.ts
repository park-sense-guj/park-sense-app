import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { create } from 'zustand';

import { getFirebaseAuth } from '../config/firebase';
import {
  clearSessionPassword,
  ensureUserProfile,
  listenUserProfile,
  logoutUser,
} from '../services/authService';
import type { UserProfile } from '../types';

type AuthState = {
  initializing: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  error: string | null;
  hydrate: () => () => void;
  clearError: () => void;
  signOut: () => Promise<void>;
};

function accountEmail(user: User): string | null {
  return user.email ?? user.providerData.find((p) => p.email)?.email ?? null;
}

export const useAuthStore = create<AuthState>((set) => ({
  initializing: true,
  firebaseUser: null,
  profile: null,
  error: null,
  clearError: () => set({ error: null }),
  hydrate: () => {
    let stopProfile: (() => void) | undefined;
    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
        stopProfile?.();
        stopProfile = undefined;

        const email = user ? accountEmail(user) : null;
        if (!user || !email) {
          set({
            firebaseUser: null,
            profile: null,
            initializing: false,
            error: null,
          });
          return;
        }

        // Mark signed-in immediately so we never look "stuck" on the login form
        // while the profile round-trip is in flight.
        set({ firebaseUser: user, error: null });

        try {
          const profile = await ensureUserProfile({
            userId: user.uid,
            email,
            fullName: user.displayName,
            photoUrl: user.photoURL,
          });
          set({ firebaseUser: user, profile, initializing: false, error: null });
          stopProfile = listenUserProfile(
            user.uid,
            (next) => {
              if (next) {
                set({ firebaseUser: user, profile: next, initializing: false, error: null });
              }
            },
            (message) => {
              set({
                initializing: false,
                error: message.includes('Permission')
                  ? 'Signed in, but profile access was denied. Check Firebase database rules.'
                  : message,
              });
            },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load profile';
          set({
            firebaseUser: user,
            profile: null,
            initializing: false,
            error: message.includes('Permission')
              ? 'Signed in, but your profile could not be saved. Check Firebase database rules.'
              : message,
          });
        }
      });
    } catch (error) {
      set({
        firebaseUser: null,
        profile: null,
        initializing: false,
        error:
          error instanceof Error
            ? error.message
            : 'Firebase is not configured for this build.',
      });
    }

    return () => {
      stopProfile?.();
      unsubscribe();
    };
  },
  signOut: async () => {
    clearSessionPassword();
    await logoutUser();
    set({ firebaseUser: null, profile: null, error: null });
  },
}));
