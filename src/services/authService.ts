import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateEmail,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { get, onValue, ref, remove, set, update } from 'firebase/database';

import { env } from '../config/env';
import { getFirebaseAuth, getFirebaseDatabase } from '../config/firebase';
import type { UserProfile, UserRole } from '../types';
import { disableBiometrics } from './biometricService';
import { reauthenticateWithGoogle, signOutGoogle } from './googleAuthService';
import { deleteUserParkingHistory, releaseParkingOnLogout } from './historyService';
import { clearDriverPresence } from './driverPresenceService';
import { releaseHoldsForUser } from './parkingHoldService';
import { deleteUserNotifications } from './notificationService';

function roleForEmail(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  if (normalized === env.adminEmail) {
    return 'admin';
  }
  return 'user';
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  contactNo?: string;
}): Promise<UserProfile> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );
  await updateProfile(credential.user, { displayName: input.fullName.trim() });

  const profile: UserProfile = {
    userId: credential.user.uid,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    registeredOn: Date.now(),
    role: roleForEmail(input.email),
  };
  const contactNo = input.contactNo?.trim();
  if (contactNo) {
    profile.contactNo = contactNo;
  }

  await set(ref(getFirebaseDatabase(), `users/${profile.userId}`), profile);
  return profile;
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes('@') || !trimmed.includes('.')) {
    throw new Error('Enter a valid email address.');
  }
  await sendPasswordResetEmail(getFirebaseAuth(), trimmed);
}

export async function logoutUser() {
  const userId = getFirebaseAuth().currentUser?.uid;
  if (userId) {
    await Promise.allSettled([clearDriverPresence(userId), releaseHoldsForUser(userId)]);
  }
  await signOutGoogle();
  await firebaseSignOut(getFirebaseAuth());
}

export async function deleteUserAccount(options?: { password?: string }): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email || !user.uid) {
    throw new Error('You need to be signed in.');
  }

  const isGoogle = user.providerData.some((provider) => provider.providerId === 'google.com');
  if (isGoogle) {
    await reauthenticateWithGoogle();
  } else {
    const password = options?.password ?? '';
    if (password.length < 6) {
      throw new Error('Enter your current password to delete this account.');
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }

  const userId = user.uid;
  await Promise.allSettled([releaseHoldsForUser(userId), releaseParkingOnLogout(userId)]);
  await Promise.all([
    deleteUserParkingHistory(userId),
    deleteUserNotifications(userId),
    remove(ref(getFirebaseDatabase(), `users/${userId}`)),
  ]);
  await disableBiometrics();
  clearSessionPassword();
  await deleteUser(user);
  await signOutGoogle();
}

export function listenUserProfile(
  userId: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (message: string) => void,
): () => void {
  const profileRef = ref(getFirebaseDatabase(), `users/${userId}`);
  return onValue(
    profileRef,
    (snapshot) => {
      const value = snapshot.val() as (UserProfile & { role?: string }) | null;
      if (!value) {
        onChange(null);
        return;
      }
      onChange({
        ...value,
        role: value.role === 'admin' ? 'admin' : 'user',
      });
    },
    (error) => {
      onError?.(error.message || 'Could not load your profile.');
    },
  );
}

export async function ensureUserProfile(params: {
  userId: string;
  email: string;
  fullName?: string | null;
  photoUrl?: string | null;
}): Promise<UserProfile> {
  const profileRef = ref(getFirebaseDatabase(), `users/${params.userId}`);
  const snapshot = await get(profileRef);
  if (snapshot.exists()) {
    const existing = snapshot.val() as UserProfile & { role?: string };
    const patch: Partial<UserProfile> = {};
    if (!existing.photoUrl && params.photoUrl) {
      patch.photoUrl = params.photoUrl;
    }
    if (
      params.fullName?.trim() &&
      (!existing.fullName || existing.fullName === 'ParkSense User')
    ) {
      patch.fullName = params.fullName.trim();
    }
    const nextRole = roleForEmail(params.email);
    if (existing.role !== nextRole && nextRole !== 'user') {
      patch.role = nextRole;
    }
    const merged = { ...existing, ...patch };
    if (Object.keys(patch).length > 0) {
      await update(profileRef, patch);
    }
    return {
      ...merged,
      role: merged.role === 'admin' ? 'admin' : 'user',
    };
  }
  const profile: UserProfile = {
    userId: params.userId,
    fullName: params.fullName?.trim() || 'ParkSense User',
    email: params.email.toLowerCase(),
    registeredOn: Date.now(),
    role: roleForEmail(params.email),
  };
  if (params.photoUrl) {
    profile.photoUrl = params.photoUrl;
  }
  await set(profileRef, profile);
  return profile;
}

export async function updatePreferredLocation(userId: string, locationName: string) {
  await set(ref(getFirebaseDatabase(), `users/${userId}/preferredLocation`), locationName);
}

export async function updateFullName(userId: string, fullName: string) {
  const trimmed = fullName.trim();
  if (trimmed.length < 2) {
    throw new Error('Enter your full name.');
  }
  const user = getFirebaseAuth().currentUser;
  if (user) {
    await updateProfile(user, { displayName: trimmed });
  }
  await update(ref(getFirebaseDatabase(), `users/${userId}`), { fullName: trimmed });
}

export async function updateUserEmail(userId: string, nextEmail: string, password: string) {
  const email = nextEmail.trim().toLowerCase();
  if (!email.includes('@') || !email.includes('.')) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Enter your current password to change email.');
  }
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) {
    throw new Error('You need to be signed in.');
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  try {
    await updateEmail(user, email);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('operation-not-allowed') || message.includes('verify-before')) {
      await verifyBeforeUpdateEmail(user, email);
      throw new Error(
        'Check the new inbox and tap the confirmation link, then sign in with that email.',
      );
    }
    throw error;
  }
  await update(ref(getFirebaseDatabase(), `users/${userId}`), { email });
}

export async function updateUserPhoto(userId: string, photoUrl: string) {
  await update(ref(getFirebaseDatabase(), `users/${userId}`), { photoUrl });
}

let sessionPassword = '';

export async function confirmCurrentPassword(password: string): Promise<void> {
  if (password.length < 6) {
    throw new Error('Enter your current password.');
  }
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) {
    throw new Error('You need to be signed in.');
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  setSessionPassword(password);
}

export function setSessionPassword(password: string) {
  sessionPassword = password;
}

export function getSessionPassword(): string {
  return sessionPassword;
}

export function clearSessionPassword() {
  sessionPassword = '';
}
