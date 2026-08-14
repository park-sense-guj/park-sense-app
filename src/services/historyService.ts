import { get, onValue, push, ref, remove, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { ParkingHistory, ParkingSlot } from '../types';
import { assertOnline, withNetworkTimeout } from './networkService';
import { notifyUsersSlotAvailable } from './notificationService';
import { setSlotStatus } from './parkingService';
import { listLotWatcherIds } from './watchService';

export function listenParkingHistory(
  userId: string,
  onChange: (items: ParkingHistory[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const historyRef = ref(getFirebaseDatabase(), `parkingHistory/${userId}`);
  return onValue(
    historyRef,
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<ParkingHistory, 'historyId'>> | null;
      const items = value
        ? Object.entries(value)
            .map(([historyId, item]) => ({ ...item, historyId }))
            .sort((a, b) => b.entryTime - a.entryTime)
        : [];
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export function findActiveSession(
  items: ParkingHistory[],
  slotId?: string,
): ParkingHistory | undefined {
  return items.find((item) => !item.exitTime && (!slotId || item.slotId === slotId));
}

/**
 * Software-only park: create history + mark the pin Occupied so open/taken counts update.
 */
export async function startParkingSession(userId: string, slot: ParkingSlot): Promise<string> {
  assertOnline('start a parking session');
  if (slot.status !== 'Available') {
    throw new Error('That space is no longer available. Pick another open pin.');
  }

  return withNetworkTimeout(
    (async () => {
      const existing = await get(ref(getFirebaseDatabase(), `parkingHistory/${userId}`));
      const value = existing.val() as Record<string, Omit<ParkingHistory, 'historyId'>> | null;
      if (value) {
        const active = Object.values(value).find((item) => !item.exitTime);
        if (active) {
          throw new Error(
            `You already have an active session at ${active.slotNumber}. End it in Activity first.`,
          );
        }
      }

      const now = Date.now();
      const record: Omit<ParkingHistory, 'historyId'> = {
        userId,
        slotId: slot.slotId,
        slotNumber: slot.slotNumber,
        locationName: slot.locationName,
        entryTime: now,
        bookingDate: new Date(now).toISOString().slice(0, 10),
      };
      const created = await push(ref(getFirebaseDatabase(), `parkingHistory/${userId}`), record);
      await setSlotStatus(slot.slotId, 'Occupied');
      return created.key ?? '';
    })(),
    15_000,
    'Parking is taking too long. Check your connection and try again.',
  );
}

/**
 * Software-only leave: close history + free the pin + alert lot watchers.
 */
export async function endParkingSession(userId: string, historyId: string): Promise<void> {
  assertOnline('leave this slot');
  await withNetworkTimeout(
    (async () => {
      const historyRef = ref(getFirebaseDatabase(), `parkingHistory/${userId}/${historyId}`);
      const snapshot = await get(historyRef);
      if (!snapshot.exists()) {
        throw new Error('That parking session was not found.');
      }
      const session = snapshot.val() as Omit<ParkingHistory, 'historyId'>;
      if (session.exitTime) {
        return;
      }

      await update(historyRef, { exitTime: Date.now() });
      await setSlotStatus(session.slotId, 'Available');

      const watchers = (await listLotWatcherIds(session.locationName)).filter((id) => id !== userId);
      if (watchers.length > 0) {
        await notifyUsersSlotAvailable({
          userIds: watchers,
          slotId: session.slotId,
          slotNumber: session.slotNumber,
          locationName: session.locationName,
        });
      }
    })(),
    15_000,
    'Leaving is taking too long. Check your connection and try again.',
  );
}

export async function deleteUserParkingHistory(userId: string): Promise<void> {
  await remove(ref(getFirebaseDatabase(), `parkingHistory/${userId}`));
}
