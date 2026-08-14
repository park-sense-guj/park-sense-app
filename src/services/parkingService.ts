import { onValue, ref, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { ParkingSlot, Sensor, SlotStatus } from '../types';

function mapSlots(value: Record<string, Omit<ParkingSlot, 'slotId'>> | null): ParkingSlot[] {
  if (!value) {
    return [];
  }
  return Object.entries(value).map(([slotId, slot]) => ({ ...slot, slotId }));
}

function mapSensors(value: Record<string, Omit<Sensor, 'sensorId'>> | null): Sensor[] {
  if (!value) {
    return [];
  }
  return Object.entries(value).map(([sensorId, sensor]) => ({ ...sensor, sensorId }));
}

export function listenParkingSlots(
  onChange: (slots: ParkingSlot[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const slotsRef = ref(getFirebaseDatabase(), 'parkingSlots');
  return onValue(
    slotsRef,
    (snapshot) => {
      onChange(mapSlots(snapshot.val()));
    },
    (error) => onError?.(error),
  );
}

export function listenSensors(
  onChange: (sensors: Sensor[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const sensorsRef = ref(getFirebaseDatabase(), 'sensors');
  return onValue(
    sensorsRef,
    (snapshot) => {
      onChange(mapSensors(snapshot.val()));
    },
    (error) => onError?.(error),
  );
}

export async function setSlotStatus(slotId: string, status: SlotStatus): Promise<void> {
  await update(ref(getFirebaseDatabase(), `parkingSlots/${slotId}`), { status });
}

export async function setSlotOccupancy(slotId: string, status: SlotStatus): Promise<void> {
  const now = Date.now();
  await update(ref(getFirebaseDatabase()), {
    [`parkingSlots/${slotId}/status`]: status,
    [`sensors/sensor-${slotId}/lastUpdated`]: now,
    [`sensors/sensor-${slotId}/sensorStatus`]: 'Simulated',
  });
}

export async function setSensorStatus(
  sensorId: string,
  sensorStatus: Sensor['sensorStatus'],
): Promise<void> {
  await update(ref(getFirebaseDatabase()), {
    [`sensors/${sensorId}/sensorStatus`]: sensorStatus,
    [`sensors/${sensorId}/lastUpdated`]: Date.now(),
  });
}
