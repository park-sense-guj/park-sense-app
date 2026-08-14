import { onValue, push, ref, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { ParkingHistory, ParkingSlot } from '../types';

export function listenParkingHistory(
  userId: string,
  onChange: (items: ParkingHistory[]) => void,
): () => void {
  const historyRef = ref(getFirebaseDatabase(), 'parkingHistory');
  return onValue(historyRef, (snapshot) => {
    const value = snapshot.val() as Record<string, Omit<ParkingHistory, 'historyId'>> | null;
    const items = value
      ? Object.entries(value)
          .map(([historyId, item]) => ({ ...item, historyId }))
          .filter((item) => item.userId === userId)
          .sort((a, b) => b.entryTime - a.entryTime)
      : [];
    onChange(items);
  });
}

export async function startParkingSession(userId: string, slot: ParkingSlot): Promise<string> {
  const now = Date.now();
  const record: Omit<ParkingHistory, 'historyId'> = {
    userId,
    slotId: slot.slotId,
    slotNumber: slot.slotNumber,
    locationName: slot.locationName,
    entryTime: now,
    bookingDate: new Date(now).toISOString().slice(0, 10),
  };
  const created = await push(ref(getFirebaseDatabase(), 'parkingHistory'), record);
  return created.key ?? '';
}

export async function endParkingSession(historyId: string): Promise<void> {
  await update(ref(getFirebaseDatabase(), `parkingHistory/${historyId}`), {
    exitTime: Date.now(),
  });
}
