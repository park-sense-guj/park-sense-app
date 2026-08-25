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

Each stall has a printed bay QR. Admins can open **Slots**, tap a bay, and print or share that sticker. Drivers scan it on arrival to check in.

## Google Maps keys

Add keys to `.env`, then rebuild a [development build](https://docs.expo.dev/develop/development-builds/introduction/) so native Google Maps config is applied:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
```

Enable in Google Cloud:

- **Maps SDK for Android** → use `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` (restrict to package `com.parksense.app`)
- **Maps SDK for iOS** → use `EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY` (restrict to bundle `com.parksense.app`)
- **Directions API** → use `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

Important for in-app turn guidance + ETA:

- Create a **separate** key for Directions (do not reuse an Android/iOS app-restricted SDK key)
- API restriction: **Directions API** only
- Application restriction: **None** (FYP / student demo). App-restricted keys return `REQUEST_DENIED` for the Directions REST call and the app falls back to a straight line
- Restart Expo after changing `.env` (`pnpm start -c`)

Without a working Directions key you still get pins + **Start guidance** map-follow + optional Apple/Google Maps.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm android
pnpm ios
```

## Security

Do not commit `.env`, `google-services.json`, `GoogleService-Info.plist`, keystores, or the Google OAuth **client secret**. Mobile Firebase API keys are client identifiers — restrict them in Google Cloud / Firebase.

Paste `database.rules.json` into **Realtime Database → Rules → Publish** before testing with real accounts. The rules:

- Let signed-in drivers update parking slot status (software occupancy until hardware/ESP32 is connected)
- Let only **admins** write sensors
- Nest history and notifications under each `userId`
- Store lot watchers under `lotWatchers` so freeing a space can notify drivers without scanning all users
- Prevent drivers from promoting themselves to admin (that role is only valid for `admin@parksense.app` on create)

After changing `database.rules.json`, paste it into **Realtime Database → Rules → Publish**. After adding `expo-camera`, rebuild the native app (`pnpm ios` / `pnpm android`) so the scanner is available.

**Software-only parking loop (no hardware):**

1. Tap a **green** pin → **Go there** → drive to the stall
2. **Scan the printed bay QR** to check in
3. Cover the IR sensor (or simulate Occupied) — pin turns red, open/taken updates
4. Leave the bay — pin turns green again
5. Tap a **red** pin → **Watch lot** — get an alert when that lot frees a space

If you change `EXPO_PUBLIC_ADMIN_EMAIL`, update the matching email string inside `database.rules.json` to match.

Password reset and account deletion are available in the app (Login → Forgot password; Profile → Delete account).

The OAuth client secret is a **server** credential and is not used by this app.
