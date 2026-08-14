import { Linking, Platform } from 'react-native';

import { env } from '../config/env';
import { fetchWithTimeout, readableNetworkError } from './networkService';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  coordinates: LatLng[];
  distanceText?: string;
  durationText?: string;
  /** True when Directions failed / timed out and we drew a straight line instead. */
  isFallback?: boolean;
  /** Short user-facing note when the live route could not be loaded. */
  warning?: string;
};

function straightLine(origin: LatLng, destination: LatLng, warning?: string): RouteResult {
  return {
    coordinates: [origin, destination],
    isFallback: true,
    warning,
  };
}

export async function openExternalNavigation(destination: LatLng, label: string): Promise<void> {
  const encodedLabel = encodeURIComponent(label);
  const google = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&destination_place_id=&travelmode=driving`;
  const apple = `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&q=${encodedLabel}&dirflg=d`;
  const url = Platform.OS === 'ios' ? apple : google;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
    await Linking.openURL(google);
  } catch {
    throw new Error('Could not open Maps. Try again when you have a connection.');
  }
}

/**
 * Never throws — offline / slow / API failures return a straight-line fallback
 * so Navigate never leaves an uncaught promise or a stuck “Getting your route…” state.
 */
export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<RouteResult> {
  const key = env.googleMapsApiKey || env.googleMapsAndroidKey || env.googleMapsIosKey;
  if (!key) {
    return straightLine(origin, destination);
  }

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving&key=${key}`;

  try {
    const response = await fetchWithTimeout(url, {}, 12_000);
    if (!response.ok) {
      return straightLine(
        origin,
        destination,
        'Couldn’t load turn-by-turn preview. Open Maps for directions.',
      );
    }

    const json = (await response.json()) as {
      status: string;
      routes?: {
        overview_polyline?: { points: string };
        legs?: { distance?: { text: string }; duration?: { text: string } }[];
      }[];
    };

    if (json.status !== 'OK' || !json.routes?.[0]?.overview_polyline?.points) {
      return straightLine(
        origin,
        destination,
        'Couldn’t load turn-by-turn preview. Open Maps for directions.',
      );
    }

    const leg = json.routes[0].legs?.[0];
    return {
      coordinates: decodePolyline(json.routes[0].overview_polyline.points),
      distanceText: leg?.distance?.text,
      durationText: leg?.duration?.text,
    };
  } catch (error) {
    return straightLine(
      origin,
      destination,
      readableNetworkError(
        error,
        'Couldn’t load turn-by-turn preview. Open Maps for directions.',
      ),
    );
  }
}

function decodePolyline(encoded: string): LatLng[] {
  const coordinates: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}
