import { get, ref, remove, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import { assertOnline, readableNetworkError, withNetworkTimeout } from './networkService';
import { createNotification } from './notificationService';

export function lotWatcherKey(locationName: string): string {
  return locationName.trim().toLowerCase().replace(/[.#$\[\]]/g, '_');
}

/** Register as a lot watcher and create a confirmation alert. */
export async function watchLot(
  userId: string,
  locationName: string,
  slotId?: string,
): Promise<void> {
  assertOnline('watch this lot');
  await withNetworkTimeout(
    (async () => {
      const db = getFirebaseDatabase();
      const key = lotWatcherKey(locationName);

      // Single multi-path update so profile + watcher list stay in sync.
      await update(ref(db), {
        [`users/${userId}/preferredLocation`]: locationName,
        [`lotWatchers/${key}/${userId}`]: true,
      });

      await createNotification({
        userId,
        slotId,
        message: `Watching ${locationName}. We’ll alert you when a space opens.`,
      });
    })(),
    15_000,
    'Saving the watch is taking too long. Check your connection and try again.',
  );
}

export async function listLotWatcherIds(locationName: string): Promise<string[]> {
  const snapshot = await get(
    ref(getFirebaseDatabase(), `lotWatchers/${lotWatcherKey(locationName)}`),
  );
  const value = snapshot.val() as Record<string, boolean> | null;
  return value ? Object.keys(value) : [];
}

export async function stopWatchingLot(userId: string, locationName: string): Promise<void> {
  assertOnline('stop watching');
  await withNetworkTimeout(
    (async () => {
      const db = getFirebaseDatabase();
      const key = lotWatcherKey(locationName);
      await update(ref(db), {
        [`users/${userId}/preferredLocation`]: null,
        [`lotWatchers/${key}/${userId}`]: null,
      });
    })(),
    15_000,
    'Updating the watch is taking too long. Check your connection and try again.',
  );
}

export async function clearLotWatch(userId: string, locationName: string): Promise<void> {
  await remove(
    ref(getFirebaseDatabase(), `lotWatchers/${lotWatcherKey(locationName)}/${userId}`),
  );
}

export function readableWatchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('PERMISSION_DENIED')) {
    return 'Could not save the watch. Publish the latest database.rules.json in Firebase Console, then try again.';
  }
  return readableNetworkError(error, 'Could not save alert. Try again.');
}
