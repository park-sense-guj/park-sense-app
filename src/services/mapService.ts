import { Linking, Platform } from 'react-native';

import { env } from '../config/env';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type RouteResult = {
  coordinates: LatLng[];
  distanceText?: string;
  durationText?: string;
};

export async function openExternalNavigation(destination: LatLng, label: string): Promise<void> {
  const encodedLabel = encodeURIComponent(label);
  const google = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&destination_place_id=&travelmode=driving`;
  const apple = `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&q=${encodedLabel}&dirflg=d`;
  const url = Platform.OS === 'ios' ? apple : google;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }
  await Linking.openURL(google);
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<RouteResult | null> {
  const key = env.googleMapsApiKey || env.googleMapsAndroidKey || env.googleMapsIosKey;
  if (!key) {
    return {
      coordinates: [origin, destination],
    };
  }

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=driving&key=${key}`;

  const response = await fetch(url);
  const json = (await response.json()) as {
    status: string;
    routes?: {
      overview_polyline?: { points: string };
      legs?: { distance?: { text: string }; duration?: { text: string } }[];
    }[];
  };

  if (json.status !== 'OK' || !json.routes?.[0]?.overview_polyline?.points) {
    return {
      coordinates: [origin, destination],
    };
  }

  const leg = json.routes[0].legs?.[0];
  return {
    coordinates: decodePolyline(json.routes[0].overview_polyline.points),
    distanceText: leg?.distance?.text,
    durationText: leg?.duration?.text,
  };
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
