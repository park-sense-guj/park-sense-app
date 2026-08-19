import { get, ref, set, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import {
  bayCoordinate,
  buildDemoSensors,
  buildDemoSlots,
  isLiveHardwareSensor,
  type LotCenter,
} from '../data/demoLot';
import type { ParkingSlot, Sensor } from '../types';

export type LotPlacement = {
  center: LotCenter;
  locationName: string;
};

export async function seedDemoLotIfEmpty(placement?: LotPlacement): Promise<boolean> {
  const slotsRef = ref(getFirebaseDatabase(), 'parkingSlots');
  const snapshot = await get(slotsRef);
  if (snapshot.exists()) {
    return false;
  }
  await seedDemoLot(placement);
  return true;
}

export async function seedDemoLot(placement?: LotPlacement): Promise<void> {
  const slots = buildDemoSlots(placement?.center, placement?.locationName);
  const sensors = buildDemoSensors(slots);
  const slotTree = Object.fromEntries(slots.map(({ slotId, ...rest }) => [slotId, rest]));
  const sensorTree = Object.fromEntries(
    sensors.map(({ sensorId, ...rest }) => [sensorId, rest]),
  );

  await Promise.all([
    set(ref(getFirebaseDatabase(), 'parkingSlots'), slotTree),
    set(ref(getFirebaseDatabase(), 'sensors'), sensorTree),
  ]);
}

/** Move live IR bays to a GPS point. Occupancy from the ESP32s is left as-is. */
export async function relocateLiveLot(placement: LotPlacement): Promise<number> {
  const db = getFirebaseDatabase();
  const [slotsSnap, sensorsSnap] = await Promise.all([
    get(ref(db, 'parkingSlots')),
    get(ref(db, 'sensors')),
  ]);

  const slotsValue = (slotsSnap.val() ?? {}) as Record<string, Omit<ParkingSlot, 'slotId'>>;
  const sensorsValue = (sensorsSnap.val() ?? {}) as Record<string, Omit<Sensor, 'sensorId'>>;

  const liveIds = new Set<string>();
  for (const [sensorId, sensor] of Object.entries(sensorsValue)) {
    if (isLiveHardwareSensor({ ...sensor, sensorId })) {
      liveIds.add(sensor.slotId);
    }
  }

  const ids = (liveIds.size > 0 ? [...liveIds] : Object.keys(slotsValue)).sort();
  if (ids.length === 0) {
    throw new Error('No parking slots in Firebase yet. Seed the live lot first.');
  }

  const patch: Record<string, string | number> = {};
  ids.forEach((slotId, index) => {
    const position = bayCoordinate(placement.center, index);
    patch[`parkingSlots/${slotId}/latitude`] = position.latitude;
    patch[`parkingSlots/${slotId}/longitude`] = position.longitude;
    patch[`parkingSlots/${slotId}/locationName`] = placement.locationName;
  });

  await update(ref(db), patch);
  return ids.length;
}
