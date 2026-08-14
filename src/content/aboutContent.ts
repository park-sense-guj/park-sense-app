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
    subtitle: 'Replay the 4-step walkthrough',
    icon: 'book-outline',
    sections: [
      {
        heading: '1 · Find a space',
        body: 'Open Home to see live pins. Green means open, red means taken. Open and taken counts update as drivers park and leave.',
      },
      {
        heading: '2 · Navigate or watch',
        body: 'Tap an open pin and choose Go there for directions. If a lot is full, use Watch lot to get an alert when any space there becomes free.',
      },
      {
        heading: '3 · Park',
        body: 'When you arrive, tap I’m parked. That marks the slot taken on the map so others don’t head to an occupied space.',
      },
      {
        heading: '4 · Leave',
        body: 'When you go, tap Leave slot. The pin turns green again, your visit is saved in Activity, and anyone watching that lot can be notified.',
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
        body: 'Find a green pin → Go there → I’m parked when you arrive → Leave slot when you leave. Activity keeps a record of finished visits.',
      },
      {
        heading: 'What does Watch lot do?',
        body: 'Watching is per lot, not a single pin. You’ll get an alert when any space in that lot becomes available—useful when everything looks taken.',
      },
      {
        heading: 'Why did a pin disappear?',
        body: 'Admins can mark a sensor faulty. Offline slots are hidden from the driver map until the sensor is restored, so you don’t navigate to a dead bay.',
      },
      {
        heading: 'Where are Alerts?',
        body: 'Open the bell on Home or Activity. Tapping an alert marks it read; use Open Home to jump back to the map without stacking screens.',
      },
      {
        heading: 'Face ID / biometrics',
        body: 'After you log out, you can sign back in faster with Face ID or fingerprint on supported devices. This is unavailable for Google sign-in accounts.',
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
