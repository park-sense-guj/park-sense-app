import { get, onValue, push, ref, remove, runTransaction, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { ParkingHistory, ParkingSlot } from '../types';
import { holdIsLive } from './parkingHoldService';
import { assertOnline, withNetworkTimeout } from './networkService';
import { notifyUsersSlotAvailable } from './notificationService';
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
 * Bind this driver to a bay they already hold, after the IR sensor reports Occupied.
 */
export async function startParkingSession(
  userId: string,
  slot: ParkingSlot,
  driver?: { fullName?: string },
): Promise<string> {
  assertOnline('start a parking session');

  return withNetworkTimeout(
    (async () => {
      const db = getFirebaseDatabase();
      const existing = await get(ref(db, `parkingHistory/${userId}`));
      const value = existing.val() as Record<string, Omit<ParkingHistory, 'historyId'>> | null;
      if (value) {
        const active = Object.values(value).find((item) => !item.exitTime);
        if (active) {
          throw new Error(`You already have an active session at ${active.slotNumber}.`);
        }
      }

      const displayName = driver?.fullName || 'Driver';
      const slotRef = ref(db, `parkingSlots/${slot.slotId}`);
      const claim = await runTransaction(slotRef, (current) => {
        if (!current) {
          return current;
        }
        if (current.status !== 'Occupied') {
          return;
        }
        if (
          !holdIsLive({ ...current, slotId: slot.slotId }, Date.now()) ||
          current.heldByUserId !== userId ||
          current.holdCheckIn !== 'admitted'
        ) {
          return;
        }
        if (current.occupiedByUserId && current.occupiedByUserId !== userId) {
          return;
        }
        return {
          ...current,
          occupiedByUserId: userId,
          occupiedByName: displayName,
          occupiedByRole: 'user',
        };
      });

      const claimed = claim.snapshot.val() as Omit<ParkingSlot, 'slotId'> | null;
      if (!claim.committed || claimed?.occupiedByUserId !== userId) {
        throw new Error('Scan the QR on this bay, then cover the IR sensor.');
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
      const created = await push(ref(db, `parkingHistory/${userId}`), record);
      return created.key ?? '';
    })(),
    15_000,
    'Parking is taking too long. Check your connection and try again.',
  );
}

/**
 * Close history only. The IR node frees the pin when the bay is empty.
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
      await update(ref(getFirebaseDatabase()), {
        [`parkingSlots/${session.slotId}/occupiedByUserId`]: null,
        [`parkingSlots/${session.slotId}/occupiedByName`]: null,
        [`parkingSlots/${session.slotId}/occupiedByRole`]: null,
        [`parkingSlots/${session.slotId}/heldByUserId`]: null,
        [`parkingSlots/${session.slotId}/heldByName`]: null,
        [`parkingSlots/${session.slotId}/heldUntil`]: null,
        [`parkingSlots/${session.slotId}/holdToken`]: null,
        [`parkingSlots/${session.slotId}/holdCheckIn`]: null,
        [`parkingSlots/${session.slotId}/checkedInAt`]: null,
        [`parkingSlots/${session.slotId}/checkedInBy`]: null,
        [`parkingSlots/${session.slotId}/checkedInByName`]: null,
      });

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

export async function releaseParkingOnLogout(userId: string): Promise<void> {
  const historySnap = await get(ref(getFirebaseDatabase(), `parkingHistory/${userId}`));
  const value = historySnap.val() as Record<string, Omit<ParkingHistory, 'historyId'>> | null;
  if (!value) {
    return;
  }
  const active = Object.entries(value).filter(([, item]) => !item.exitTime);
  for (const [historyId] of active) {
    await endParkingSession(userId, historyId);
  }
}

export async function deleteUserParkingHistory(userId: string): Promise<void> {
  await remove(ref(getFirebaseDatabase(), `parkingHistory/${userId}`));
}
