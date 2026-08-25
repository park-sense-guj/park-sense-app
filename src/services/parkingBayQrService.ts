import type { ParkingSlot } from '../types';

export const BAY_QR_PREFIX = 'parksense:bay:';

const SLOT_ID_PATTERN = /^slot-[a-z0-9-]+$/i;

export function encodeBayQr(slotId: string): string {
  return `${BAY_QR_PREFIX}${slotId.trim().toLowerCase()}`;
}

export function parseBayQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const prefixed = trimmed.match(/^parksense:bay:(slot-[a-z0-9-]+)$/i);
  if (prefixed) {
    return prefixed[1].toLowerCase();
  }

  const deepLink = trimmed.match(/^parksense:\/\/bay\/(slot-[a-z0-9-]+)$/i);
  if (deepLink) {
    return deepLink[1].toLowerCase();
  }

  if (SLOT_ID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  try {
    const parsed = JSON.parse(trimmed) as { slotId?: unknown; id?: unknown };
    const nested = parsed.slotId ?? parsed.id;
    if (typeof nested === 'string' && SLOT_ID_PATTERN.test(nested)) {
      return nested.toLowerCase();
    }
  } catch {
    // Not JSON.
  }

  return null;
}

export function resolveScannedBay(raw: string, slots: ParkingSlot[]): ParkingSlot | null {
  const slotId = parseBayQr(raw);
  if (slotId) {
    return slots.find((slot) => slot.slotId.toLowerCase() === slotId) ?? null;
  }

  const slotNumber = raw.trim().toUpperCase();
  if (!slotNumber) {
    return null;
  }
  return slots.find((slot) => slot.slotNumber.toUpperCase() === slotNumber) ?? null;
}
