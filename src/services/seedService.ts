import { get, ref, set } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import { buildDemoSensors, buildDemoSlots } from '../data/demoLot';

export async function seedDemoLotIfEmpty(): Promise<boolean> {
  const slotsRef = ref(getFirebaseDatabase(), 'parkingSlots');
  const snapshot = await get(slotsRef);
  if (snapshot.exists()) {
    return false;
  }
  await seedDemoLot();
  return true;
}

export async function seedDemoLot(): Promise<void> {
  const slots = buildDemoSlots();
  const sensors = buildDemoSensors(slots);
  const slotTree = Object.fromEntries(
    slots.map(({ slotId, ...rest }) => [slotId, rest]),
  );
  const sensorTree = Object.fromEntries(
    sensors.map(({ sensorId, ...rest }) => [sensorId, rest]),
  );

  await Promise.all([
    set(ref(getFirebaseDatabase(), 'parkingSlots'), slotTree),
    set(ref(getFirebaseDatabase(), 'sensors'), sensorTree),
  ]);
}
