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
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  initializing: true,
  firebaseUser: null,
  profile: null,
  error: null,
  hydrate: () => {
    let stopProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      stopProfile?.();
      stopProfile = undefined;

      if (!user || !user.email) {
        set({
          firebaseUser: null,
          profile: null,
          initializing: false,
          error: null,
        });
        return;
      }

      try {
        await ensureUserProfile({
          userId: user.uid,
          email: user.email,
          fullName: user.displayName,
          photoUrl: user.photoURL,
        });
        stopProfile = listenUserProfile(user.uid, (profile) => {
          set({ firebaseUser: user, profile, initializing: false, error: null });
        });
      } catch (error) {
        set({
          firebaseUser: user,
          profile: null,
          initializing: false,
          error: error instanceof Error ? error.message : 'Failed to load profile',
        });
      }
    });

    return () => {
      stopProfile?.();
      unsubscribe();
    };
  },
  signOut: async () => {
    clearSessionPassword();
    await logoutUser();
    set({ firebaseUser: null, profile: null });
  },
}));
