import { useEffect, useMemo, useState } from 'react';

import { listenParkingSlots, listenSensors } from '../services/parkingService';
import type { ParkingSlot, Sensor } from '../types';

export function useParkingSlots() {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stopSlots = listenParkingSlots((next) => {
      setSlots(next);
      setLoading(false);
    });
    const stopSensors = listenSensors(setSensors);
    return () => {
      stopSlots();
      stopSensors();
    };
  }, []);

  const stats = useMemo(() => {
    const available = slots.filter((slot) => slot.status === 'Available').length;
    const occupied = slots.length - available;
    const healthy = sensors.filter((sensor) => sensor.sensorStatus !== 'Faulty').length;
    return {
      total: slots.length,
      available,
      occupied,
      healthySensors: healthy,
      faultySensors: sensors.length - healthy,
    };
  }, [slots, sensors]);

  return { slots, sensors, loading, stats };
}
