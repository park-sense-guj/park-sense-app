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
        set({ isOnline: snapshot.val() === true, ready: true });
      },
      () => {
        set({ isOnline: false, ready: true });
      },
    );
    return () => {
      sharedUnsubscribe?.();
      sharedUnsubscribe = null;
      active = false;
    };
  },
}));
