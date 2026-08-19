import { get, ref, runTransaction, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { BayKind, ParkingSlot } from '../types';
import { assertOnline, withNetworkTimeout } from './networkService';

/** How long “Go there” holds an empty bay for this driver. */
export const HOLD_MS = 8 * 60 * 1000;

export function holdIsLive(slot: ParkingSlot, now = Date.now()): boolean {
  return Boolean(slot.heldByUserId) && (slot.heldUntil ?? 0) > now;
}

export function bayKind(
  slot: ParkingSlot,
  opts: { userId?: string; offline?: boolean; sessionOnSlot?: boolean },
  now = Date.now(),
): BayKind {
  if (opts.offline) {
    return 'offline';
  }
  if (opts.sessionOnSlot) {
    return 'mine';
  }
  if (holdIsLive(slot, now) && slot.heldByUserId === opts.userId) {
    return 'heldMine';
  }
  if (holdIsLive(slot, now)) {
    return 'held';
  }
  if (slot.status === 'Occupied') {
    return 'taken';
  }
  return 'open';
}

function clearHoldFields(slot: Omit<ParkingSlot, 'slotId'>): Omit<ParkingSlot, 'slotId'> {
  const next = { ...slot };
  delete next.heldByUserId;
  delete next.heldByName;
  delete next.heldUntil;
  return next;
}

async function releaseOtherHolds(userId: string, exceptSlotId: string): Promise<void> {
  const snapshot = await get(ref(getFirebaseDatabase(), 'parkingSlots'));
  const value = snapshot.val() as Record<string, Omit<ParkingSlot, 'slotId'>> | null;
  if (!value) {
    return;
  }
  const patch: Record<string, null> = {};
  for (const [slotId, slot] of Object.entries(value)) {
    if (slotId === exceptSlotId || slot.heldByUserId !== userId) {
      continue;
    }
    patch[`parkingSlots/${slotId}/heldByUserId`] = null;
    patch[`parkingSlots/${slotId}/heldByName`] = null;
    patch[`parkingSlots/${slotId}/heldUntil`] = null;
  }
  if (Object.keys(patch).length > 0) {
    await update(ref(getFirebaseDatabase()), patch);
  }
}

export async function releaseHoldsForUser(userId: string): Promise<void> {
  await releaseOtherHolds(userId, '');
}

export async function holdBay(
  userId: string,
  fullName: string,
  slotId: string,
): Promise<void> {
  assertOnline('hold this bay');

  await withNetworkTimeout(
    (async () => {
      await releaseOtherHolds(userId, slotId);

      const slotRef = ref(getFirebaseDatabase(), `parkingSlots/${slotId}`);
      const result = await runTransaction(slotRef, (current) => {
        if (!current) {
          return current;
        }
        if (current.status !== 'Available') {
          return;
        }
        const until = Number(current.heldUntil ?? 0);
        const heldByOther =
          Boolean(current.heldByUserId) &&
          current.heldByUserId !== userId &&
          until > Date.now();
        if (heldByOther) {
          return;
        }
        return {
          ...current,
          heldByUserId: userId,
          heldByName: fullName,
          heldUntil: Date.now() + HOLD_MS,
        };
      });

      const held = result.snapshot.val() as Omit<ParkingSlot, 'slotId'> | null;
      if (!result.committed || held?.heldByUserId !== userId) {
        throw new Error('That bay is no longer free. Pick another open pin.');
      }
    })(),
    15_000,
    'Holding this bay is taking too long. Check your connection and try again.',
  );
}

export async function releaseHold(userId: string, slotId: string): Promise<void> {
  const slotRef = ref(getFirebaseDatabase(), `parkingSlots/${slotId}`);
  await runTransaction(slotRef, (current) => {
    if (!current) {
      return current;
    }
    if (current.heldByUserId && current.heldByUserId !== userId) {
      return;
    }
    return clearHoldFields(current);
  });
}
