import { get, ref, runTransaction, set, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { BayKind, ParkingPass, ParkingSlot } from '../types';
import { assertOnline, withNetworkTimeout } from './networkService';

/** How long “Go there” holds an empty bay for this driver. */
export const HOLD_MS = 8 * 60 * 1000;

export type HoldIdentity = {
  email?: string;
  photoUrl?: string;
};

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

async function cancelPassTokens(tokens: string[], status: 'cancelled' | 'denied'): Promise<void> {
  const unique = [...new Set(tokens.filter(Boolean))];
  if (unique.length === 0) {
    return;
  }
  const db = getFirebaseDatabase();
  const now = Date.now();
  const patch: Record<string, string | number> = {};
  for (const token of unique) {
    const snap = await get(ref(db, `parkingPasses/${token}`));
    if (!snap.exists()) {
      continue;
    }
    const current = snap.val() as ParkingPass;
    if (current.status === 'consumed' || current.status === 'denied') {
      continue;
    }
    patch[`parkingPasses/${token}/status`] = status;
    if (status === 'cancelled') {
      patch[`parkingPasses/${token}/cancelledAt`] = now;
    }
  }
  if (Object.keys(patch).length > 0) {
    await update(ref(db), patch);
  }
}

async function writePass(pass: ParkingPass): Promise<void> {
  await set(ref(getFirebaseDatabase(), `parkingPasses/${pass.token}`), pass);
}

async function releaseOtherHolds(userId: string, exceptSlotId: string): Promise<void> {
  const snapshot = await get(ref(getFirebaseDatabase(), 'parkingSlots'));
  const value = snapshot.val() as Record<string, Omit<ParkingSlot, 'slotId'>> | null;
  if (!value) {
    return;
  }
  const patch: Record<string, null> = {};
  const tokens: string[] = [];
  for (const [slotId, slot] of Object.entries(value)) {
    if (slotId === exceptSlotId || slot.heldByUserId !== userId) {
      continue;
    }
    Object.assign(patch, holdClearPatch(slotId));
    if (slot.holdToken) {
      tokens.push(slot.holdToken);
    }
  }
  if (Object.keys(patch).length > 0) {
    await update(ref(getFirebaseDatabase()), patch);
  }
  await cancelPassTokens(tokens, 'cancelled');
}

export async function releaseHoldsForUser(userId: string): Promise<void> {
  await releaseOtherHolds(userId, '');
}

export async function holdBay(
  userId: string,
  fullName: string,
  slotId: string,
  identity?: HoldIdentity,
): Promise<string> {
  assertOnline('hold this bay');

  return withNetworkTimeout(
    (async () => {
      await releaseOtherHolds(userId, slotId);

      const token = createHoldToken();
      const issuedAt = Date.now();
      const expiresAt = issuedAt + HOLD_MS;
      const slotRef = ref(getFirebaseDatabase(), `parkingSlots/${slotId}`);
      let previousToken: string | undefined;
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
        previousToken =
          typeof current.holdToken === 'string' && current.holdToken !== token
            ? current.holdToken
            : undefined;
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

      const pass: ParkingPass = {
        token,
        slotId,
        slotNumber: held.slotNumber,
        locationName: held.locationName,
        userId,
        userName: fullName,
        issuedAt,
        expiresAt,
        status: 'issued',
      };
      const email = identity?.email?.trim().toLowerCase();
      if (email) {
        pass.userEmail = email;
      }
      if (identity?.photoUrl) {
        pass.photoUrl = identity.photoUrl;
      }

      try {
        await writePass(pass);
      } catch (error) {
        await runTransaction(slotRef, (current) => {
          if (!current || current.holdToken !== token) {
            return current;
          }
          return clearHoldFields(current);
        });
        throw error;
      }

      if (previousToken) {
        await cancelPassTokens([previousToken], 'cancelled');
      }

      return token;
    })(),
    15_000,
    'Holding this bay is taking too long. Check your connection and try again.',
  );
}

export async function ensureHoldPass(
  userId: string,
  fullName: string,
  slotId: string,
  identity?: HoldIdentity,
): Promise<string> {
  const slotRef = ref(getFirebaseDatabase(), `parkingSlots/${slotId}`);
  const snapshot = await get(slotRef);
  if (!snapshot.exists()) {
    throw new Error('That bay was not found.');
  }
  const slot = snapshot.val() as Omit<ParkingSlot, 'slotId'>;
  if (!holdIsLive({ ...slot, slotId }) || slot.heldByUserId !== userId) {
    throw new Error('This bay is not held for you anymore.');
  }
  if (slot.holdToken) {
    const passSnap = await get(ref(getFirebaseDatabase(), `parkingPasses/${slot.holdToken}`));
    if (passSnap.exists()) {
      return slot.holdToken;
    }
  }
  return holdBay(userId, fullName, slotId, identity);
}

export async function releaseHold(userId: string, slotId: string): Promise<void> {
  const slotRef = ref(getFirebaseDatabase(), `parkingSlots/${slotId}`);
  let releasedToken: string | undefined;
  await runTransaction(slotRef, (current) => {
    if (!current) {
      return current;
    }
    if (current.heldByUserId && current.heldByUserId !== userId) {
      return;
    }
    releasedToken = typeof current.holdToken === 'string' ? current.holdToken : undefined;
    return clearHoldFields(current);
  });
  if (releasedToken) {
    await cancelPassTokens([releasedToken], 'cancelled');
  }
}