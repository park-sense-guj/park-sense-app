import { useEffect, useMemo, useState } from 'react';

import { listenParkingSlots, listenSensors } from '../services/parkingService';
import type { ParkingSlot, Sensor } from '../types';

export function useParkingSlots() {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stopSlots = listenParkingSlots(
      (next) => {
        setSlots(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError(err.message || 'Could not load parking slots.');
      },
    );
    const stopSensors = listenSensors(setSensors, (err) => {
      setError(err.message || 'Could not load sensors.');
    });
    return () => {
      stopSlots();
      stopSensors();
    };
  }, []);

  const faultySlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sensor of sensors) {
      if (sensor.sensorStatus === 'Faulty') {
        ids.add(sensor.slotId);
      }
    }
    return ids;
  }, [sensors]);

  const onlineSlots = useMemo(
    () => slots.filter((slot) => !faultySlotIds.has(slot.slotId)),
    [slots, faultySlotIds],
  );

  const offlineSlots = useMemo(
    () => slots.filter((slot) => faultySlotIds.has(slot.slotId)),
    [slots, faultySlotIds],
  );

  const stats = useMemo(() => {
    const available = slots.filter((slot) => slot.status === 'Available').length;
    const occupied = slots.length - available;
    const onlineAvailable = onlineSlots.filter((slot) => slot.status === 'Available').length;
    const onlineOccupied = onlineSlots.length - onlineAvailable;
    const healthy = sensors.filter((sensor) => sensor.sensorStatus !== 'Faulty').length;
    return {
      total: slots.length,
      available,
      occupied,
      onlineTotal: onlineSlots.length,
      onlineAvailable,
      onlineOccupied,
      offlineSensors: faultySlotIds.size,
      healthySensors: healthy,
      faultySensors: sensors.length - healthy,
    };
  }, [slots, sensors, onlineSlots, faultySlotIds]);

  function isSensorFaulty(slotId: string): boolean {
    return faultySlotIds.has(slotId);
  }

  function sensorForSlot(slotId: string): Sensor | undefined {
    return sensors.find((sensor) => sensor.slotId === slotId);
  }

  return {
    slots,
    sensors,
    onlineSlots,
    offlineSlots,
    loading,
    error,
    stats,
    faultySlotIds,
    isSensorFaulty,
    sensorForSlot,
  };
}
