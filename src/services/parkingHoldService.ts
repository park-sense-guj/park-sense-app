import { get, ref, runTransaction, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { BayKind, ParkingSlot } from '../types';
import { assertOnline, withNetworkTimeout } from './networkService';

/** How long “Go there” holds an empty bay for this driver. */
export const HOLD_MS = 8 * 60 * 1000;
/** Extra time to park after scanning the bay QR. */
export const CHECK_IN_GRACE_MS = 5 * 60 * 1000;

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

export function formatHoldCountdown(until: number, now = Date.now()): string {
  const ms = Math.max(0, until - now);
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatHoldRemaining(until: number, now = Date.now()): string {
  const ms = until - now;
  if (ms <= 0) {
    return 'Expired';
  }
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes === 1 ? '1 min left' : `${minutes} min left`;
}

function createHoldToken(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function clearHoldFields(slot: Omit<ParkingSlot, 'slotId'>): Omit<ParkingSlot, 'slotId'> {
  const next = { ...slot };
  delete next.heldByUserId;
  delete next.heldByName;
  delete next.heldUntil;
  delete next.holdToken;
  delete next.holdCheckIn;
  delete next.checkedInAt;
  delete next.checkedInBy;
  delete next.checkedInByName;
  return next;
}

function holdClearPatch(slotId: string): Record<string, null> {
  return {
    [`parkingSlots/${slotId}/heldByUserId`]: null,
    [`parkingSlots/${slotId}/heldByName`]: null,
    [`parkingSlots/${slotId}/heldUntil`]: null,
    [`parkingSlots/${slotId}/holdToken`]: null,
    [`parkingSlots/${slotId}/holdCheckIn`]: null,
    [`parkingSlots/${slotId}/checkedInAt`]: null,
    [`parkingSlots/${slotId}/checkedInBy`]: null,
    [`parkingSlots/${slotId}/checkedInByName`]: null,
  };
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
    Object.assign(patch, holdClearPatch(slotId));
  }
  if (Object.keys(patch).length > 0) {
    await update(ref(getFirebaseDatabase()), patch);
  }
}

export async function releaseHoldsForUser(userId: string): Promise<void> {
  await releaseOtherHolds(userId, '');
}

export async function holdBay(userId: string, fullName: string, slotId: string): Promise<string> {
  assertOnline('hold this bay');

  return withNetworkTimeout(
    (async () => {
      await releaseOtherHolds(userId, slotId);

      const token = createHoldToken();
      const expiresAt = Date.now() + HOLD_MS;
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
        const next = {
          ...current,
          heldByUserId: userId,
          heldByName: fullName,
          heldUntil: expiresAt,
          holdToken: token,
          holdCheckIn: 'pending' as const,
        };
        delete next.checkedInAt;
        delete next.checkedInBy;
        delete next.checkedInByName;
        return next;
      });

      const held = result.snapshot.val() as Omit<ParkingSlot, 'slotId'> | null;
      if (!result.committed || held?.heldByUserId !== userId || held.holdToken !== token) {
        throw new Error('That bay is no longer free. Pick another open pin.');
      }

      return token;
    })(),
    15_000,
    'Holding this bay is taking too long. Check your connection and try again.',
  );
}

export async function checkInAtBay(
  userId: string,
  fullName: string,
  scannedSlotId: string,
  expectedSlotId?: string,
): Promise<ParkingSlot> {
  assertOnline('check in at this bay');

  return withNetworkTimeout(
    (async () => {
      const db = getFirebaseDatabase();
      const scannedRef = ref(db, `parkingSlots/${scannedSlotId}`);
      const scannedSnap = await get(scannedRef);
      if (!scannedSnap.exists()) {
        throw new Error('That QR is not linked to a ParkSense bay.');
      }
      const scanned = scannedSnap.val() as Omit<ParkingSlot, 'slotId'>;

      if (expectedSlotId && expectedSlotId !== scannedSlotId) {
        const expectedSnap = await get(ref(db, `parkingSlots/${expectedSlotId}`));
        const expectedNumber =
          (expectedSnap.val() as Omit<ParkingSlot, 'slotId'> | null)?.slotNumber ?? expectedSlotId;
        throw new Error(
          `That QR is for ${scanned.slotNumber}. Scan the sticker on ${expectedNumber}.`,
        );
      }

      const occupiedByOther =
        scanned.status === 'Occupied' &&
        scanned.occupiedByUserId &&
        scanned.occupiedByUserId !== userId;
      if (occupiedByOther) {
        throw new Error(`${scanned.slotNumber} is already taken.`);
      }

      const until = Number(scanned.heldUntil ?? 0);
      const heldByOther =
        Boolean(scanned.heldByUserId) &&
        scanned.heldByUserId !== userId &&
        until > Date.now();
      if (heldByOther) {
        throw new Error(`${scanned.slotNumber} is held for another driver.`);
      }

      await releaseOtherHolds(userId, scannedSlotId);

      const now = Date.now();
      const result = await runTransaction(scannedRef, (current) => {
        if (!current) {
          return current;
        }

        const liveUntil = Number(current.heldUntil ?? 0);
        const liveHold = Boolean(current.heldByUserId) && liveUntil > now;
        if (liveHold && current.heldByUserId !== userId) {
          return;
        }
        if (
          current.status === 'Occupied' &&
          current.occupiedByUserId &&
          current.occupiedByUserId !== userId
        ) {
          return;
        }

        const keepUntil = liveHold && current.heldByUserId === userId ? liveUntil : 0;
        const heldUntil = Math.max(now + CHECK_IN_GRACE_MS, keepUntil);
        return {
          ...current,
          heldByUserId: userId,
          heldByName: fullName,
          heldUntil,
          holdToken:
            typeof current.holdToken === 'string' && current.holdToken
              ? current.holdToken
              : createHoldToken(),
          holdCheckIn: 'admitted' as const,
          checkedInAt: now,
          checkedInBy: userId,
          checkedInByName: fullName,
        };
      });

      const checked = result.snapshot.val() as Omit<ParkingSlot, 'slotId'> | null;
      if (!result.committed || checked?.heldByUserId !== userId || checked.holdCheckIn !== 'admitted') {
        throw new Error('Could not check in at this bay. It may have just been taken.');
      }

      return { ...checked, slotId: scannedSlotId };
    })(),
    15_000,
    'Checking in is taking too long. Check your connection and try again.',
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
