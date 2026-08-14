import type { ExpoConfig } from 'expo/config';

const mapsAndroid =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  '';
const mapsIos =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const config: ExpoConfig = {
  name: 'ParkSense',
  slug: 'parksense',
  scheme: 'parksense',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.parksense.app',
    appleTeamId: '58A453DVAT',
    googleServicesFile: './GoogleService-Info.plist',
    config: {
      googleMapsApiKey: mapsIos,
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'ParkSense uses your location to show nearby parking and navigate to the selected slot.',
      NSFaceIDUsageDescription:
        'ParkSense uses Face ID to unlock the app and sign you in securely.',
      NSPhotoLibraryUsageDescription:
        'ParkSense uses your photos so you can set a profile picture.',
      NSCameraUsageDescription:
        'ParkSense uses the camera so you can take a profile picture.',
    },
  },
  android: {
    package: 'com.parksense.app',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#0F766E',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: mapsAndroid,
      },
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-dev-client',
    'expo-secure-store',
    '@react-native-google-signin/google-signin',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F766E',
        image: './assets/splash-icon.png',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'ParkSense uses your location to show nearby parking and navigate to the selected slot.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'ParkSense uses Face ID to unlock the app and sign you in securely.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'ParkSense uses your photos so you can set a profile picture.',
        cameraPermission: 'ParkSense uses the camera so you can take a profile picture.',
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  },
};

export default config;
