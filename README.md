# ParkSense

IoT-Based Smart Parking Locator with Google Maps integration.

The phone app talks only to **Firebase**. Sensors / ESP32 write the same database paths. Until hardware is attached, the admin dashboard simulates those writes.

## Stack

- Expo SDK 57 · React Native 0.86 · TypeScript
- Firebase Authentication (email/password)
- Firebase Realtime Database
- `react-native-maps` + device GPS
- pnpm

Package / bundle ID: `com.parksense.app`

## Setup

1. Copy environment and native Firebase files:

```bash
cp .env.example .env
```

Place these in the project root (they are gitignored):

- `.env`
- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)

2. In Firebase Console:

- Enable **Authentication → Email/Password**
- Enable **Realtime Database**
- Paste `database.rules.json` into Realtime Database → Rules → Publish

3. Install and run:

```bash
pnpm install
pnpm start
```

Then press `i` for iOS Simulator or `a` for Android emulator.

## First accounts

Register normally in the app.

- Driver: any email
- Admin: register `admin@parksense.app` (see `EXPO_PUBLIC_ADMIN_EMAIL`)

Open the admin **Dashboard** and tap **Seed demo lot if empty**. Green/red pins appear on the user map. Toggle slots on the **Slots** tab to simulate an ESP32.

## Google Maps keys

Maps SDK keys were not available at scaffold time. Until you add them:

- **iOS Simulator** uses Apple Maps (`PROVIDER_DEFAULT`) and still shows pins + navigation via the Maps app
- **Android** needs a Maps SDK key in `.env` for the in-app Google Map
- Turn-by-turn inside the app uses Directions API when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise a straight-line preview + **Open in Maps** is used

Add keys to `.env`, then rebuild a [development build](https://docs.expo.dev/develop/development-builds/introduction/) so native Google Maps config is applied:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
```

Enable in Google Cloud: Maps SDK for Android, Maps SDK for iOS, Directions API. Restrict keys to `com.parksense.app`.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm android
pnpm ios
```

## Security

Do not commit `.env`, `google-services.json`, `GoogleService-Info.plist`, keystores, or the Google OAuth **client secret**. Mobile Firebase API keys are client identifiers — restrict them in Google Cloud / Firebase.

The OAuth client secret is a **server** credential and is not used by this app (email/password only).
