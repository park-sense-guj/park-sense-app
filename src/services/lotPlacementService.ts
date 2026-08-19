import * as Location from 'expo-location';

import type { LotPlacement } from './seedService';

export async function readDeviceLotPlacement(): Promise<LotPlacement> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Allow location so the parking pins can sit where the sensors are.');
  }
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const center = {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
  let locationName = 'Live hardware lot';
  try {
    const places = await Location.reverseGeocodeAsync(center);
    const city = places[0]?.city ?? places[0]?.subregion ?? places[0]?.district;
    if (city) {
      locationName = `Live lot · ${city}`;
    }
  } catch {
    // Keep the default name if reverse geocode is unavailable.
  }
  return { center, locationName };
}
