import { Linking, Platform } from 'react-native';

import { env } from '../config/env';
import { fetchWithTimeout, readableNetworkError } from './networkService';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RouteStep = {
  instruction: string;
  distanceText?: string;
  durationText?: string;
  end: LatLng;
};

export type RouteResult = {
  coordinates: LatLng[];
  steps: RouteStep[];
  distanceText?: string;
  durationText?: string;
  /** True when Directions failed / timed out and we drew a straight line instead. */
  isFallback?: boolean;
  /** Short user-facing note when the live route could not be loaded. */
  warning?: string;
};

function stripHtml(value: string): string {
  return value
    .replace(/<div[^>]*>/gi, '. ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}

function straightLine(origin: LatLng, destination: LatLng, warning?: string): RouteResult {
  return {
    coordinates: [origin, destination],
    steps: [
      {
        instruction: 'Head to the parking space',
        end: destination,
      },
    ],
    isFallback: true,
    warning,
  };
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Approximate distance from a point to the nearest segment on a polyline. */
export function distanceToRouteMeters(point: LatLng, route: LatLng[]): number {
  if (route.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (route.length === 1) {
    return distanceMeters(point, route[0]);
  }
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < route.length - 1; i += 1) {
    best = Math.min(best, distanceToSegmentMeters(point, route[i], route[i + 1]));
  }
  return best;
}

function distanceToSegmentMeters(point: LatLng, a: LatLng, b: LatLng): number {
  // Local equirectangular projection around point A for a short campus-scale segment.
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cosLat = Math.cos(toRad(a.latitude));
  const bx = (b.longitude - a.longitude) * cosLat;
  const by = b.latitude - a.latitude;
  const px = (point.longitude - a.longitude) * cosLat;
  const py = point.latitude - a.latitude;
  const denom = bx * bx + by * by;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / denom));
  const closest: LatLng = {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };
  return distanceMeters(point, closest);
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
  // Prefer the shared API key for Directions REST calls. Android/iOS SDK keys are
  // usually app-restricted and return REQUEST_DENIED for HTTPS Directions.
  const key = env.googleMapsApiKey || env.googleMapsAndroidKey || env.googleMapsIosKey;
  if (!key) {
    return straightLine(
      origin,
      destination,
      'Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY with Directions API enabled.',
    );
  }

  // departure_time=now unlocks duration_in_traffic when Google has traffic data.
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving&departure_time=now&traffic_model=best_guess&key=${key}`;

  try {
    const response = await fetchWithTimeout(url, {}, 12_000);
    if (!response.ok) {
      return straightLine(
        origin,
        destination,
        `Directions HTTP ${response.status}. Check the Maps API key and try again.`,
      );
    }

    const json = (await response.json()) as {
      status: string;
      error_message?: string;
      routes?: {
        overview_polyline?: { points: string };
        legs?: {
          distance?: { text: string };
          duration?: { text: string };
          duration_in_traffic?: { text: string };
          steps?: {
            html_instructions?: string;
            distance?: { text: string };
            duration?: { text: string };
            end_location?: { lat: number; lng: number };
          }[];
        }[];
      }[];
    };

    if (json.status !== 'OK' || !json.routes?.[0]?.overview_polyline?.points) {
      return straightLine(origin, destination, directionsStatusMessage(json.status, json.error_message));
    }

    const leg = json.routes[0].legs?.[0];
    const steps: RouteStep[] = [];
    for (const step of leg?.steps ?? []) {
      if (!step.end_location) {
        continue;
      }
      steps.push({
        instruction: stripHtml(step.html_instructions ?? 'Continue'),
        distanceText: step.distance?.text,
        durationText: step.duration?.text,
        end: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      });
    }

    const etaText = leg?.duration_in_traffic?.text || leg?.duration?.text;

    return {
      coordinates: decodePolyline(json.routes[0].overview_polyline.points),
      steps:
        steps.length > 0
          ? steps
          : [{ instruction: 'Head to the parking space', end: destination }],
      distanceText: leg?.distance?.text,
      durationText: etaText,
    };
  } catch (error) {
    return straightLine(
      origin,
      destination,
      readableNetworkError(
        error,
        'Couldn’t load turn guidance. You can still follow the map line.',
      ),
    );
  }
}

function directionsStatusMessage(status: string, errorMessage?: string): string {
  if (status === 'REQUEST_DENIED') {
    return (
      'Directions key blocked. In Google Cloud, use EXPO_PUBLIC_GOOGLE_MAPS_API_KEY with ' +
      'Directions API enabled and Application restriction = None (API restriction: Directions only).'
    );
  }
  if (status === 'OVER_QUERY_LIMIT') {
    return 'Directions quota exceeded for today. Try again later or open Apple/Google Maps.';
  }
  if (status === 'ZERO_RESULTS') {
    return 'No driving route found to that pin. Try Open in Maps.';
  }
  if (status === 'NOT_FOUND' || status === 'INVALID_REQUEST') {
    return 'Invalid route request. Check origin/destination and try again.';
  }
  if (errorMessage) {
    return `Directions: ${errorMessage}`;
  }
  return `Directions unavailable (${status || 'unknown'}). You can still follow the map line.`;
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
