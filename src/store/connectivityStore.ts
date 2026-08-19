import { onValue, ref } from 'firebase/database';
import { create } from 'zustand';

import { getFirebaseDatabase } from '../config/firebase';

type ConnectivityState = {
  isOnline: boolean;
  ready: boolean;
  /** Subscribe to Firebase `/.info/connected`. Safe to call more than once. */
  start: () => () => void;
};

let active = false;
let sharedUnsubscribe: (() => void) | null = null;
let offlineTimer: ReturnType<typeof setTimeout> | null = null;

/** Firebase always emits `false` first while the socket is opening. */
const OFFLINE_GRACE_MS = 2000;

function clearOfflineTimer() {
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimer = null;
  }
}

/**
 * App-wide online/offline signal from Firebase Realtime Database.
 * Avoids a native network module (ExpoNetwork) while still reflecting
 * whether the client can reach Firebase.
 */
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  ready: false,
  start: () => {
    if (active && sharedUnsubscribe) {
      return () => undefined;
    }
    active = true;
    const connectedRef = ref(getFirebaseDatabase(), '.info/connected');
    sharedUnsubscribe = onValue(
      connectedRef,
      (snapshot) => {
        if (snapshot.val() === true) {
          clearOfflineTimer();
          set({ isOnline: true, ready: true });
          return;
        }
        // Hold off until the first handshake can finish, and ignore brief drops.
        if (offlineTimer) {
          return;
        }
        offlineTimer = setTimeout(() => {
          offlineTimer = null;
          set({ isOnline: false, ready: true });
        }, OFFLINE_GRACE_MS);
      },
      () => {
        clearOfflineTimer();
        set({ isOnline: false, ready: true });
      },
    );
    return () => {
      clearOfflineTimer();
      sharedUnsubscribe?.();
      sharedUnsubscribe = null;
      active = false;
    };
  },
}));
