import type { ParkingSlot, Sensor } from '../types';

/** Demo lot near Lahore — replace with campus coordinates when ready. */
export const DEMO_LOT = {
  locationName: 'VU Main Campus Lot',
  center: {
    latitude: 31.5204,
    longitude: 74.3587,
  },
  latitudeDelta: 0.004,
  longitudeDelta: 0.004,
};

const GRID = [
  { slotNumber: 'A-01', status: 'Available' as const },
  { slotNumber: 'A-02', status: 'Occupied' as const },
  { slotNumber: 'A-03', status: 'Available' as const },
  { slotNumber: 'A-04', status: 'Available' as const },
  { slotNumber: 'A-05', status: 'Occupied' as const },
  { slotNumber: 'B-11', status: 'Available' as const },
  { slotNumber: 'B-12', status: 'Occupied' as const },
  { slotNumber: 'B-13', status: 'Available' as const },
  { slotNumber: 'B-14', status: 'Available' as const },
  { slotNumber: 'B-15', status: 'Occupied' as const },
];

export function buildDemoSlots(): ParkingSlot[] {
  return GRID.map((item, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    return {
      slotId: `slot-${item.slotNumber.toLowerCase()}`,
      slotNumber: item.slotNumber,
      locationName: DEMO_LOT.locationName,
      latitude: DEMO_LOT.center.latitude + row * 0.00018 - 0.00009,
      longitude: DEMO_LOT.center.longitude + col * 0.00022 - 0.00044,
      status: item.status,
    };
  });
}

export function buildDemoSensors(slots: ParkingSlot[]): Sensor[] {
  return slots.map((slot) => ({
    sensorId: `sensor-${slot.slotId}`,
    slotId: slot.slotId,
    sensorType: 'Mock',
    sensorStatus: 'Simulated',
    lastUpdated: Date.now(),
  }));
}
