import { useEffect, useRef } from 'react';

import { useParkingHistory } from './useParkingHistory';
import { useParkingSlots } from './useParkingSlots';
import { startParkingSession, endParkingSession } from '../services/historyService';
import { holdIsLive } from '../services/parkingHoldService';
import { useAuthStore } from '../store/authStore';
import { useConnectivityStore } from '../store/connectivityStore';

/**
 * Sensor owns Occupied/Available. The driver owns which bay is theirs.
 * A session starts only if this user already holds the bay and IR reports Occupied.
 */
export function useAutoParkingSession() {
  const profile = useAuthStore((state) => state.profile);
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const { slots } = useParkingSlots();
  const { activeSession } = useParkingHistory(profile?.userId);
  const busy = useRef(false);

  useEffect(() => {
    if (!profile || profile.role === 'admin' || !isOnline || busy.current) {
      return;
    }

    if (activeSession) {
      const slot = slots.find((item) => item.slotId === activeSession.slotId);
      if (slot?.status === 'Available') {
        busy.current = true;
        void endParkingSession(profile.userId, activeSession.historyId)
          .catch(() => undefined)
          .finally(() => {
            busy.current = false;
          });
      }
      return;
    }

    const held = slots.find(
      (slot) =>
        holdIsLive(slot) &&
        slot.heldByUserId === profile.userId &&
        slot.holdCheckIn === 'admitted' &&
        slot.status === 'Occupied',
    );
    if (!held) {
      return;
    }

    busy.current = true;
    void startParkingSession(profile.userId, held, { fullName: profile.fullName })
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
      });
  }, [profile, isOnline, slots, activeSession]);
}
