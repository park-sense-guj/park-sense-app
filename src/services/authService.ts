import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateEmail,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { get, onValue, ref, set, update } from 'firebase/database';

import { env } from '../config/env';
import { getFirebaseAuth, getFirebaseDatabase } from '../config/firebase';
import type { UserProfile, UserRole } from '../types';
import { signOutGoogle } from './googleAuthService';

function roleForEmail(email: string): UserRole {
  return email.trim().toLowerCase() === env.adminEmail ? 'admin' : 'user';
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
    contactNo: input.contactNo?.trim() || undefined,
    registeredOn: Date.now(),
    role: roleForEmail(input.email),
  };

  await set(ref(getFirebaseDatabase(), `users/${profile.userId}`), profile);
  return profile;
}

export async function loginUser(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}

export async function logoutUser() {
  await signOutGoogle();
  await firebaseSignOut(getFirebaseAuth());
}

export function listenUserProfile(
  userId: string,
  onChange: (profile: UserProfile | null) => void,
): () => void {
  const profileRef = ref(getFirebaseDatabase(), `users/${userId}`);
  return onValue(profileRef, (snapshot) => {
    onChange((snapshot.val() as UserProfile | null) ?? null);
  });
}

export async function ensureUserProfile(params: {
  userId: string;
  email: string;
  fullName?: string | null;
  photoUrl?: string | null;
}): Promise<void> {
  const profileRef = ref(getFirebaseDatabase(), `users/${params.userId}`);
  const snapshot = await get(profileRef);
  if (snapshot.exists()) {
    const existing = snapshot.val() as UserProfile;
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
    if (Object.keys(patch).length > 0) {
      await update(profileRef, patch);
    }
    return;
  }
  const profile: UserProfile = {
    userId: params.userId,
    fullName: params.fullName?.trim() || 'ParkSense User',
    email: params.email.toLowerCase(),
    photoUrl: params.photoUrl || undefined,
    registeredOn: Date.now(),
    role: roleForEmail(params.email),
  };
  await set(profileRef, profile);
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
