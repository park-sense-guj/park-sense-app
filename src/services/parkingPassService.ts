import { get, onValue, ref, runTransaction, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { ParkingPass, ParkingSlot, UserProfile } from '../types';
import { createNotification } from './notificationService';
import { assertOnline, withNetworkTimeout } from './networkService';
import { HOLD_MS, holdIsLive } from './parkingHoldService';

export const PASS_QR_PREFIX = 'parksense:pass:';
export const ADMIT_GRACE_MS = 5 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9]{32}$/i;

export type PassVerdictKind =
  | 'genuine'
  | 'already_admitted'
  | 'already_parked'
  | 'parked_unchecked'
  | 'expired_open'
  | 'expired_taken'
  | 'cancelled_open'
  | 'cancelled_taken'
  | 'denied'
  | 'superseded'
  | 'slot_taken'
  | 'invalid'
  | 'malformed';

export type PassVerdictTone = 'ok' | 'warn' | 'bad';

export type PassVerdict = {
  kind: PassVerdictKind;
  tone: PassVerdictTone;
  title: string;
  message: string;
  genuine: boolean;
  canAdmit: boolean;
  canDeny: boolean;
  canRestore: boolean;
  pass: ParkingPass | null;
  slot: ParkingSlot | null;
};

export function encodePassQr(token: string): string {
  return `${PASS_QR_PREFIX}${token.toLowerCase()}`;
}

export function formatPassId(token: string): string {
  return token.slice(-8).toUpperCase();
}

export function isHoldToken(value: string): boolean {
  return TOKEN_PATTERN.test(value.trim());
}

export function parsePassQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith(PASS_QR_PREFIX)) {
    const token = trimmed.slice(PASS_QR_PREFIX.length).trim();
    return isHoldToken(token) ? token.toLowerCase() : null;
  }
  const deepLink = trimmed.match(/^(?:parksense:\/\/pass\/)([a-f0-9]{32})$/i);
  if (deepLink) {
    return deepLink[1].toLowerCase();
  }
  try {
    const parsed = JSON.parse(trimmed) as { t?: unknown; token?: unknown };
    const nested = parsed.t ?? parsed.token;
    if (typeof nested === 'string' && isHoldToken(nested)) {
      return nested.toLowerCase();
    }
  } catch {
    // Not JSON — fall through to a raw token.
  }
  return isHoldToken(trimmed) ? trimmed.toLowerCase() : null;
}

export function listenParkingPasses(
  onChange: (items: ParkingPass[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const passesRef = ref(getFirebaseDatabase(), 'parkingPasses');
  return onValue(
    passesRef,
    (snapshot) => {
      const value = snapshot.val() as Record<string, ParkingPass> | null;
      const items = value
        ? Object.entries(value).map(([token, item]) => ({ ...item, token: item.token ?? token }))
        : [];
      onChange(items.sort((a, b) => b.issuedAt - a.issuedAt));
    },
    (error) => onError?.(error),
  );
}

export async function inspectPass(token: string): Promise<PassVerdict> {
  const normalized = parsePassQr(token) ?? (isHoldToken(token) ? token.toLowerCase() : null);
  if (!normalized) {
    return emptyVerdict(
      'malformed',
      'Not a ParkSense pass',
      'That QR is not a ParkSense arrival code. Ask the driver to open the arrival pass in the app.',
    );
  }

  assertOnline('verify this pass');
  return withNetworkTimeout(
    (async () => {
      const db = getFirebaseDatabase();
      const passSnap = await get(ref(db, `parkingPasses/${normalized}`));
      if (!passSnap.exists()) {
        return emptyVerdict(
          'invalid',
          'Unknown pass',
          'This QR is not on file. It may be a screenshot of an old code, or the hold never saved.',
        );
      }
      const pass = { ...(passSnap.val() as ParkingPass), token: normalized };
      const slotSnap = await get(ref(db, `parkingSlots/${pass.slotId}`));
      const slot = slotSnap.exists()
        ? ({ ...(slotSnap.val() as Omit<ParkingSlot, 'slotId'>), slotId: pass.slotId } as ParkingSlot)
        : null;
      return evaluatePass(pass, slot);
    })(),
    12_000,
    'Checking this pass is taking too long. Check your connection and try again.',
  );
}

export function evaluatePass(pass: ParkingPass, slot: ParkingSlot | null, now = Date.now()): PassVerdict {
  const occupiedByHolder = slot?.occupiedByUserId === pass.userId;
  const occupiedByOther = Boolean(slot?.occupiedByUserId) && slot?.occupiedByUserId !== pass.userId;
  const liveHold = slot ? holdIsLive(slot, now) : false;
  const heldByHolder = slot?.heldByUserId === pass.userId;
  const heldByOther = liveHold && slot?.heldByUserId !== pass.userId;
  const tokenMatches = Boolean(slot?.holdToken) && slot?.holdToken === pass.token;
  const slotOpen = Boolean(slot) && slot?.status === 'Available' && !liveHold && !occupiedByOther;

  if (pass.status === 'denied') {
    return {
      kind: 'denied',
      tone: 'bad',
      title: 'Already turned away',
      message: `${pass.userName} was denied${pass.deniedByName ? ` by ${pass.deniedByName}` : ''}${pass.denyReason ? ` (${pass.denyReason})` : ''}. They need a new hold to try again.`,
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (occupiedByHolder || pass.status === 'consumed') {
    const unchecked = !pass.admittedAt && pass.status !== 'admitted';
    if (unchecked) {
      return {
        kind: 'parked_unchecked',
        tone: 'warn',
        title: 'Parked without gate check',
        message: `${pass.userName} is already in ${pass.slotNumber}. Confirm they match this pass. Occupancy stays with the IR sensor.`,
        genuine: true,
        canAdmit: true,
        canDeny: false,
        canRestore: false,
        pass,
        slot,
      };
    }
    return {
      kind: 'already_parked',
      tone: 'ok',
      title: 'Already parked',
      message: `${pass.userName} is in ${pass.slotNumber}. The visit is live; occupancy is owned by the IR sensor.`,
      genuine: true,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (pass.status === 'admitted') {
    if (heldByOther || occupiedByOther) {
      return {
        kind: 'slot_taken',
        tone: 'bad',
        title: 'Bay no longer theirs',
        message: `${pass.slotNumber} is now held or occupied by someone else.`,
        genuine: false,
        canAdmit: false,
        canDeny: false,
        canRestore: false,
        pass,
        slot,
      };
    }
    return {
      kind: 'already_admitted',
      tone: 'ok',
      title: 'Already verified',
      message: `${pass.userName} was admitted${pass.admittedByName ? ` by ${pass.admittedByName}` : ''}. They can proceed to ${pass.slotNumber}.`,
      genuine: true,
      canAdmit: false,
      canDeny: liveHold && heldByHolder,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (pass.status === 'cancelled') {
    if (slotOpen) {
      return {
        kind: 'cancelled_open',
        tone: 'warn',
        title: 'Hold was cancelled',
        message: `${pass.userName} released this pass. ${pass.slotNumber} is free — restore the hold if they are at the gate.`,
        genuine: false,
        canAdmit: false,
        canDeny: false,
        canRestore: true,
        pass,
        slot,
      };
    }
    return {
      kind: 'cancelled_taken',
      tone: 'bad',
      title: 'Hold was cancelled',
      message: 'This pass was cancelled and the bay is no longer free for this driver.',
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (!slot) {
    return {
      kind: 'invalid',
      tone: 'bad',
      title: 'Bay not found',
      message: 'This pass points at a bay that is no longer in the lot.',
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (heldByOther || occupiedByOther) {
    return {
      kind: 'slot_taken',
      tone: 'bad',
      title: 'Bay no longer theirs',
      message: `${pass.slotNumber} is held or occupied by someone else.`,
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (liveHold && heldByHolder && slot.holdToken && !tokenMatches) {
    return {
      kind: 'superseded',
      tone: 'bad',
      title: 'Old QR code',
      message: 'This driver has a newer arrival pass. Ask them to show the latest QR in the app.',
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (liveHold && heldByHolder) {
    return {
      kind: 'genuine',
      tone: 'ok',
      title: 'Pass is genuine',
      message: `${pass.userName} holds ${pass.slotNumber}. Confirm they match the name and photo, then admit them.`,
      genuine: true,
      canAdmit: true,
      canDeny: true,
      canRestore: false,
      pass,
      slot,
    };
  }

  if (slotOpen) {
    const expired = (pass.expiresAt ?? 0) <= now || (slot.heldUntil ?? 0) <= now;
    return {
      kind: expired ? 'expired_open' : 'cancelled_open',
      tone: 'warn',
      title: expired ? 'Hold expired' : 'Hold is no longer live',
      message: expired
        ? `The hold for ${pass.slotNumber} ran out, but the bay is still free. Restore it if this is the driver at the gate.`
        : `${pass.slotNumber} is free. Restore the hold if this driver is at the gate.`,
      genuine: false,
      canAdmit: false,
      canDeny: false,
      canRestore: true,
      pass,
      slot,
    };
  }

  return {
    kind: 'expired_taken',
    tone: 'bad',
    title: 'Hold expired',
    message: 'This pass has expired and the bay is not free.',
    genuine: false,
    canAdmit: false,
    canDeny: false,
    canRestore: false,
    pass,
    slot,
  };
}

export async function admitPass(
  token: string,
  receptionist: Pick<UserProfile, 'userId' | 'fullName'>,
): Promise<PassVerdict> {
  assertOnline('admit this driver');
  if (receptionist.userId === undefined) {
    throw new Error('You need to be signed in as a receptionist.');
  }

  return withNetworkTimeout(
    (async () => {
      const current = await inspectPass(token);
      if (current.kind === 'already_admitted' || current.kind === 'already_parked') {
        return current;
      }
      if (!current.canAdmit && !current.canRestore) {
        throw new Error(current.message);
      }
      const pass = current.pass;
      if (!pass) {
        throw new Error('That pass is no longer valid.');
      }

      const db = getFirebaseDatabase();
      const admittedAt = Date.now();
      const slotRef = ref(db, `parkingSlots/${pass.slotId}`);
      const result = await runTransaction(slotRef, (slot) => {
        if (!slot) {
          return slot;
        }
        if (slot.occupiedByUserId && slot.occupiedByUserId !== pass.userId) {
          return;
        }
        const until = Number(slot.heldUntil ?? 0);
        const liveOther =
          Boolean(slot.heldByUserId) && slot.heldByUserId !== pass.userId && until > Date.now();
        if (liveOther) {
          return;
        }
        const keepUntil = slot.heldByUserId === pass.userId ? until : 0;
        const restoreUntil = current.canRestore ? admittedAt + HOLD_MS : 0;
        const heldUntil = Math.max(admittedAt + ADMIT_GRACE_MS, keepUntil, restoreUntil);
        return {
          ...slot,
          heldByUserId: pass.userId,
          heldByName: pass.userName,
          heldUntil,
          holdToken: pass.token,
          holdCheckIn: 'admitted',
          checkedInAt: admittedAt,
          checkedInBy: receptionist.userId,
          checkedInByName: receptionist.fullName,
        };
      });

      const held = result.snapshot.val() as Omit<ParkingSlot, 'slotId'> | null;
      if (!result.committed || held?.heldByUserId !== pass.userId) {
        throw new Error('Could not admit this driver. The bay changed — scan again.');
      }

      await update(ref(db, `parkingPasses/${pass.token}`), {
        status: 'admitted',
        admittedAt,
        admittedBy: receptionist.userId,
        admittedByName: receptionist.fullName,
        expiresAt: held.heldUntil ?? admittedAt + ADMIT_GRACE_MS,
      });

      await createNotification({
        userId: pass.userId,
        slotId: pass.slotId,
        message: `Reception confirmed your arrival at ${pass.slotNumber}. Park and cover the IR sensor to start your session.`,
      });

      return inspectPass(pass.token);
    })(),
    15_000,
    'Admitting this driver is taking too long. Check your connection and try again.',
  );
}

export async function denyPass(
  token: string,
  receptionist: Pick<UserProfile, 'userId' | 'fullName'>,
  reason = 'Did not match the pass',
): Promise<PassVerdict> {
  assertOnline('deny this driver');

  return withNetworkTimeout(
    (async () => {
      const current = await inspectPass(token);
      if (!current.canDeny) {
        throw new Error(
          current.kind === 'already_parked' || current.kind === 'parked_unchecked'
            ? 'They are already in the bay. Occupancy is controlled by the IR sensor.'
            : current.message,
        );
      }
      const pass = current.pass;
      if (!pass) {
        throw new Error('That pass is no longer valid.');
      }

      const db = getFirebaseDatabase();
      const deniedAt = Date.now();
      const slotRef = ref(db, `parkingSlots/${pass.slotId}`);
      await runTransaction(slotRef, (slot) => {
        if (!slot) {
          return slot;
        }
        if (slot.heldByUserId && slot.heldByUserId !== pass.userId) {
          return slot;
        }
        if (slot.occupiedByUserId === pass.userId) {
          return slot;
        }
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
      });

      await update(ref(db, `parkingPasses/${pass.token}`), {
        status: 'denied',
        deniedAt,
        deniedBy: receptionist.userId,
        deniedByName: receptionist.fullName,
        denyReason: reason,
      });

      await createNotification({
        userId: pass.userId,
        slotId: pass.slotId,
        message: `Arrival was not confirmed for ${pass.slotNumber}. The hold was released.`,
      });

      return inspectPass(pass.token);
    })(),
    15_000,
    'Updating this pass is taking too long. Check your connection and try again.',
  );
}

function emptyVerdict(kind: PassVerdictKind, title: string, message: string): PassVerdict {
  return {
    kind,
    tone: kind === 'malformed' || kind === 'invalid' ? 'bad' : 'warn',
    title,
    message,
    genuine: false,
    canAdmit: false,
    canDeny: false,
    canRestore: false,
    pass: null,
    slot: null,
  };
}
