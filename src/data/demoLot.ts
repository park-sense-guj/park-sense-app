import type { ParkingSlot, Sensor } from '../types';

export type LotCenter = {
  latitude: number;
  longitude: number;
};

/** Fallback only — live pins are placed at the admin’s GPS. */
export const DEMO_LOT = {
  locationName: 'Live hardware lot',
  center: {
    latitude: 32.1877,
    longitude: 74.1945,
  },
  latitudeDelta: 0.004,
  longitudeDelta: 0.004,
};

const GRID = [
  { slotNumber: 'A-01', status: 'Available' as const },
  { slotNumber: 'A-02', status: 'Available' as const },
  { slotNumber: 'A-03', status: 'Available' as const },
];

export function bayCoordinate(center: LotCenter, index: number): LotCenter {
  return {
    latitude: center.latitude - 0.00008,
    longitude: center.longitude + (index - 1) * 0.00018,
  };
}

export function buildDemoSlots(
  center: LotCenter = DEMO_LOT.center,
  locationName: string = DEMO_LOT.locationName,
): ParkingSlot[] {
  return GRID.map((item, index) => {
    const position = bayCoordinate(center, index);
    return {
      slotId: `slot-${item.slotNumber.toLowerCase()}`,
      slotNumber: item.slotNumber,
      locationName,
      latitude: position.latitude,
      longitude: position.longitude,
      status: item.status,
    };
  });
}

export function buildDemoSensors(slots: ParkingSlot[]): Sensor[] {
  return slots.map((slot) => ({
    sensorId: `sensor-${slot.slotId}`,
    slotId: slot.slotId,
    sensorType: 'IR',
    sensorStatus: 'Active',
    lastUpdated: Date.now(),
  }));
}

export function isLiveHardwareSensor(sensor: Sensor): boolean {
  return sensor.sensorType === 'IR' || sensor.sensorType === 'Ultrasonic';
}

/** ESP32 heartbeat is 15s. After this with no new write, mark the pin Offline — do not hide it. */
export const SENSOR_STALE_MS = 60_000;

export function isWallClockTimestamp(value: number): boolean {
  return value > 1_700_000_000_000;
}

export function isSensorHeartbeatStale(
  lastUpdated: number,
  now: number,
  unchangedSince: number,
): boolean {
  if (isWallClockTimestamp(lastUpdated) && now - lastUpdated > SENSOR_STALE_MS) {
    return true;
  }
  return now - unchangedSince > SENSOR_STALE_MS;
}
