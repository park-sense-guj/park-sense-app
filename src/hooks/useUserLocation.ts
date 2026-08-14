import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LatLng } from '../services/mapService';

type Options = {
  /** When true, keep watching GPS (for in-app guidance). */
  watch?: boolean;
};

export function useUserLocation(options: Options = {}) {
  const { watch = false } = options;
  const [location, setLocation] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const watchSub = useRef<Location.LocationSubscription | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setDenied(true);
        setLocation(null);
        return;
      }
      setDenied(false);
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setHeading(
        typeof current.coords.heading === 'number' && current.coords.heading >= 0
          ? current.coords.heading
          : null,
      );
    } catch {
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function startWatch() {
      if (!watch) {
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) {
        return;
      }
      if (permission.status !== 'granted') {
        setDenied(true);
        return;
      }
      setDenied(false);
      watchSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 8,
        },
        (next) => {
          setLocation({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
          });
          setHeading(
            typeof next.coords.heading === 'number' && next.coords.heading >= 0
              ? next.coords.heading
              : null,
          );
          setLoading(false);
        },
      );
    }

    void startWatch();

    return () => {
      cancelled = true;
      watchSub.current?.remove();
      watchSub.current = null;
    };
  }, [watch]);

  return { location, heading, denied, loading, refresh };
}
