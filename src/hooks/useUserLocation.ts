import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { LatLng } from '../services/mapService';

export function useUserLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (!cancelled) {
          setDenied(true);
        }
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!cancelled) {
        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, denied };
}
