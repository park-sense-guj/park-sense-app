import { onDisconnect, onValue, ref, remove, set } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { UserRole } from '../types';

export type DriverPresence = {
  userId: string;
  fullName: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  updatedAt: number;
};

const STALE_MS = 25_000;

export async function publishDriverPresence(presence: DriverPresence): Promise<void> {
  const node = ref(getFirebaseDatabase(), `driverPresence/${presence.userId}`);
  await set(node, presence);
  await onDisconnect(node).remove();
}

export async function clearDriverPresence(userId: string): Promise<void> {
  await remove(ref(getFirebaseDatabase(), `driverPresence/${userId}`));
}

export function listenDriverPresence(
  onChange: (items: DriverPresence[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const presenceRef = ref(getFirebaseDatabase(), 'driverPresence');
  return onValue(
    presenceRef,
    (snapshot) => {
      const value = snapshot.val() as Record<string, DriverPresence> | null;
      const now = Date.now();
      const items = value
        ? Object.values(value).filter((item) => now - (item.updatedAt ?? 0) < STALE_MS)
        : [];
      onChange(items);
    },
    (error) => onError?.(error),
  );
}
