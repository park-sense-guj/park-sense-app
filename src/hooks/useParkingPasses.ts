import { useEffect, useState } from 'react';

import { holdIsLive } from '../services/parkingHoldService';
import { listenParkingPasses } from '../services/parkingPassService';
import type { ParkingPass, ParkingSlot } from '../types';

export function useParkingPasses() {
  const [passes, setPasses] = useState<ParkingPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stop = listenParkingPasses(
      (next) => {
        setPasses(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Could not load arrival passes.');
      },
    );
    return stop;
  }, []);

  return { passes, loading, error };
}

const RECENT_MS = 12 * 60 * 60 * 1000;

export function groupArrivalPasses(
  passes: ParkingPass[],
  slots: ParkingSlot[],
  now = Date.now(),
) {
  const slotById = new Map(slots.map((slot) => [slot.slotId, slot]));
  const incoming: ParkingPass[] = [];
  const waiting: ParkingPass[] = [];
  const attention: ParkingPass[] = [];
  const recent: ParkingPass[] = [];

  for (const pass of passes) {
    const slot = slotById.get(pass.slotId);
    const live = Boolean(slot && holdIsLive(slot, now) && slot.heldByUserId === pass.userId);
    const parkedHere = slot?.occupiedByUserId === pass.userId;
    const stamp =
      pass.admittedAt ??
      pass.deniedAt ??
      pass.consumedAt ??
      pass.cancelledAt ??
      pass.issuedAt;
    const fresh = now - stamp < RECENT_MS;

    if (pass.status === 'issued' && live) {
      incoming.push(pass);
      continue;
    }
    if (pass.status === 'admitted' && (live || parkedHere)) {
      waiting.push(pass);
      continue;
    }
    if (!fresh) {
      continue;
    }
    if (
      (pass.status === 'issued' && !live) ||
      (pass.status === 'consumed' && !pass.admittedAt) ||
      pass.status === 'cancelled'
    ) {
      attention.push(pass);
      continue;
    }
    recent.push(pass);
  }

  return { incoming, waiting, attention, recent };
}
