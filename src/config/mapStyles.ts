import type { MapStyleElement } from 'react-native-maps';

/**
 * Google Maps JSON style used when the app is in dark mode.
 * Apple Maps uses MapView `userInterfaceStyle` instead.
 */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9db5b0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c2a' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#2b3f3b' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b7cbc6' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c9ddd8' }],
  },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a3d39' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a2623' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a8bfb9' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#355650' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2f2c' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d0e4de' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f1c24' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6b78' }],
  },
];

/** Hide POI icons/labels so they don't steal taps from parking pins (Google Maps). */
export const lightMapStyle: MapStyleElement[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
