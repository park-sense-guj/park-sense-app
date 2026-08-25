import Constants from 'expo-constants';

export type AboutSheetId = 'howItWorks' | 'helpFaq' | 'privacy';

export type AboutSheet = {
  id: AboutSheetId;
  title: string;
  subtitle: string;
  icon: 'book-outline' | 'help-circle-outline' | 'shield-checkmark-outline';
  sections: { heading?: string; body: string }[];
};

export const ABOUT_SHEETS: AboutSheet[] = [
  {
    id: 'howItWorks',
    title: 'How ParkSense works',
    subtitle: 'Replay the walkthrough',
    icon: 'book-outline',
    sections: [
      {
        heading: '1 · Find a space',
        body: 'Open Home to see live pins. Green means open, red means taken. Open and taken counts update as drivers park and leave.',
      },
      {
        heading: '2 · Hold and scan the bay',
        body: 'Tap an open pin and choose Go there. The bay is held for you while you drive. At the stall, scan the printed QR to check in, then cover the IR sensor when you park.',
      },
      {
        heading: '3 · Park',
        body: 'Stand at the bay and cover the IR sensor. The pin turns Taken and Activity starts a session for you automatically. If the sensor never fires, no session is created.',
      },
      {
        heading: '4 · Leave',
        body: 'When you uncover the IR sensor, the pin turns Open and your session ends. Anyone watching that lot can be notified.',
      },
    ],
  },
  {
    id: 'helpFaq',
    title: 'Help & FAQ',
    subtitle: 'Parking, alerts, sensors, and your account',
    icon: 'help-circle-outline',
    sections: [
      {
        heading: 'How do I complete a parking visit?',
        body: 'Tap a green Open pin, then Go there. Scan the printed QR on that stall to check in. Cover the IR sensor to start the session. Uncover the sensor when you leave — Activity records the visit. Covering a different bay does nothing.',
      },
      {
        heading: 'What is the bay QR?',
        body: 'Each stall has a printed ParkSense code that never changes. Scanning it proves you are at that bay and checks you in. Old photos of a different stall, expired holds, and occupied bays are rejected. Admins can open Slots and print a fresh sticker any time.',
      },
      {
        heading: 'What does Watch lot do?',
        body: 'Watching is per lot, not a single pin. You’ll get an alert when any space in that lot becomes available—useful when everything looks taken.',
      },
      {
        heading: 'Why is a pin grey?',
        body: 'Grey means that bay’s ESP32 is offline or marked faulty. The pin stays on the map so the lot layout does not vanish. Pick a green Open pin to park.',
      },
      {
        heading: 'Where are Alerts?',
        body: 'Open the bell on Home or Activity. Tapping an alert marks it read; use Open Home to jump back to the map without stacking screens.',
      },
      {
        heading: 'Biometric sign-in',
        body: 'After you log out, you can sign back in faster with Face ID on iPhone or fingerprint / face unlock on Android. This is unavailable for Google sign-in accounts.',
      },
      {
        heading: 'Google accounts',
        body: 'Email is managed by Google, so you can’t edit it here. Biometric unlock is also turned off for Google accounts—use Google Sign-In again instead.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & data',
    subtitle: 'What stays on this device vs Firebase',
    icon: 'shield-checkmark-outline',
    sections: [
      {
        heading: 'On this device',
        body: 'Theme, haptics, and sound preferences are stored locally. If you enable biometrics, sign-in credentials are kept in the device secure store—not in plain text.',
      },
      {
        heading: 'Firebase Authentication',
        body: 'Your email/password or Google identity is managed by Firebase Auth so you can sign in securely across sessions.',
      },
      {
        heading: 'Realtime Database',
        body: 'Profile details, profile photo data, parking history, alerts, lot watch preferences, and live slot status sync through Firebase Realtime Database for the campus demo lot.',
      },
      {
        heading: 'Location',
        body: 'Location is used on-device to show you on the map and build a route to a slot. ParkSense does not keep a continuous location history of your trips.',
      },
      {
        heading: 'Deleting your account',
        body: 'Delete account on Profile permanently removes your profile, parking history, and alerts associated with your user ID.',
      },
    ],
  },
];

export function getAppVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  const androidBuild = Constants.expoConfig?.android?.versionCode;
  const nativeBuild =
    Constants.nativeBuildVersion ??
    (iosBuild ? String(iosBuild) : androidBuild != null ? String(androidBuild) : null);
  if (nativeBuild) {
    return `v${version} (build ${nativeBuild})`;
  }
  return `v${version}`;
}
