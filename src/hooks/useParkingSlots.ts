import { useEffect, useMemo, useRef, useState } from 'react';

import { listenParkingSlots, listenSensors } from '../services/parkingService';
import { holdIsLive } from '../services/parkingHoldService';
import {
  isLiveHardwareSensor,
  isSensorHeartbeatStale,
} from '../data/demoLot';
import type { ParkingSlot, Sensor } from '../types';

export function useParkingSlots() {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const heartbeatSeen = useRef<Record<string, { lastUpdated: number; since: number }>>({});

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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 4000);
    return () => clearInterval(timer);
  }, []);

  const liveSensors = useMemo(() => {
    const hardware = sensors.filter(isLiveHardwareSensor);
    return hardware.length > 0 ? hardware : sensors;
  }, [sensors]);

  const liveSlotIds = useMemo(
    () => new Set(liveSensors.map((sensor) => sensor.slotId)),
    [liveSensors],
  );

  const usingLiveHardware = liveSensors.some(
    (sensor) => sensor.sensorType === 'IR' || sensor.sensorType === 'Ultrasonic',
  );

  const visibleSlots = useMemo(() => {
    if (!usingLiveHardware) {
      return slots;
    }
    return slots.filter((slot) => liveSlotIds.has(slot.slotId));
  }, [slots, usingLiveHardware, liveSlotIds]);

  const offlineSlotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sensor of liveSensors) {
      const prev = heartbeatSeen.current[sensor.sensorId];
      if (!prev || prev.lastUpdated !== sensor.lastUpdated) {
        heartbeatSeen.current[sensor.sensorId] = {
          lastUpdated: sensor.lastUpdated,
          since: now,
        };
      }
      const seen = heartbeatSeen.current[sensor.sensorId];
      const silent = isSensorHeartbeatStale(sensor.lastUpdated, now, seen.since);
      if (sensor.sensorStatus === 'Faulty' || silent) {
        ids.add(sensor.slotId);
      }
    }
    return ids;
  }, [liveSensors, now]);

  const onlineSlots = useMemo(
    () => visibleSlots.filter((slot) => !offlineSlotIds.has(slot.slotId)),
    [visibleSlots, offlineSlotIds],
  );

  const offlineSlots = useMemo(
    () => visibleSlots.filter((slot) => offlineSlotIds.has(slot.slotId)),
    [visibleSlots, offlineSlotIds],
  );

  const stats = useMemo(() => {
    const available = visibleSlots.filter((slot) => slot.status === 'Available').length;
    const occupied = visibleSlots.length - available;
    const onlineAvailable = onlineSlots.filter((slot) => slot.status === 'Available').length;
    const onlineOccupied = onlineSlots.length - onlineAvailable;
    const held = onlineSlots.filter((slot) => holdIsLive(slot, now)).length;
    const openForDrivers = onlineSlots.filter(
      (slot) => slot.status === 'Available' && !holdIsLive(slot, now),
    ).length;
    const healthy = liveSensors.filter((sensor) => !offlineSlotIds.has(sensor.slotId)).length;
    return {
      total: visibleSlots.length,
      available,
      occupied,
      onlineTotal: onlineSlots.length,
      onlineAvailable,
      onlineOccupied,
      openForDrivers,
      held,
      offlineSensors: offlineSlotIds.size,
      healthySensors: healthy,
      faultySensors: liveSensors.length - healthy,
    };
  }, [visibleSlots, liveSensors, onlineSlots, offlineSlotIds, now]);

  function isSensorFaulty(slotId: string): boolean {
    return offlineSlotIds.has(slotId);
  }

  function sensorForSlot(slotId: string): Sensor | undefined {
    return liveSensors.find((sensor) => sensor.slotId === slotId);
  }

  return {
    slots: visibleSlots,
    sensors: liveSensors,
    onlineSlots,
    offlineSlots,
    loading,
    error,
    stats,
    now,
    faultySlotIds: offlineSlotIds,
    usingLiveHardware,
    isSensorFaulty,
    sensorForSlot,
  };
}
