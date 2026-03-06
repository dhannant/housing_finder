# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Build profiles (EAS)

This project uses three EAS build profiles in `eas.json`:

- **development**: internal dev-client builds for active development and debugging.
- **preview**: internal release-like builds for client/stakeholder testing.
- **production**: app-store-ready release builds.

### Why this matters

- Android remote push notifications are not supported in Expo Go.
- Test push notifications with a custom EAS build (`development`, `preview`, or `production`).

### Build commands

```bash
# Android client testing build (APK)
eas build --profile preview --platform android

# iOS client testing build (TestFlight/internal)
eas build --profile preview --platform ios

# Production store builds
eas build --profile production --platform android
eas build --profile production --platform ios
```

### EAS CLI setup

- Recommended for multi-project use: install EAS CLI globally (`npm i -g eas-cli`).
- Alternative: run with `npx eas ...` if you prefer not to install globally.

### First iOS TestFlight checklist

1. **Apple account setup**
   - Confirm you are enrolled in the Apple Developer Program.
   - In Expo, run `eas login` and `eas build:configure` if not already configured.

2. **App identity**
   - Verify `ios.bundleIdentifier` in app config is final and unique.
   - Confirm app name, icon, and splash assets are ready for client-facing testing.

3. **Credentials & signing**
   - Run `eas credentials` and let EAS manage certificates/provisioning profiles (recommended).
   - Ensure the correct Apple Team is selected if you belong to multiple teams.

4. **Create preview build**
   - Run `eas build --profile preview --platform ios`.
   - Wait for build completion and confirm the artifact appears in Expo dashboard.

5. **Submit to TestFlight**
   - Run `eas submit --platform ios --latest` (or submit from Expo dashboard).
   - In App Store Connect, complete required app metadata for the first submission.

6. **Add testers**
   - Add internal testers (fastest) first.
   - Add external testers after beta app review if needed.

7. **Install and verify on device**
   - Tester installs TestFlight app from App Store.
   - Accept invite, install build, and run smoke test: login, core navigation, Firestore read/write, push notification flow.

8. **Common first-time blockers**
   - Missing compliance/privacy fields in App Store Connect.
   - Incorrect bundle identifier or Apple team selection.
   - Push entitlement/capability mismatch between app config and Apple project settings.

### Android internal testing checklist

1. **Google Play setup**
   - Confirm you have a Google Play Console account.
   - Create the app entry in Play Console (first time only).

2. **App identity**
   - Verify `android.package` in app config is final and unique.
   - Confirm app name, icon, and splash assets are ready for client-facing testing.

3. **Create preview build**
   - Run `eas build --profile preview --platform android` (APK for direct install/testing).
   - For Play internal track testing, use production profile (AAB): `eas build --profile production --platform android`.

4. **Distribute build**
   - **Direct install path**: share preview APK/install link from Expo build details.
   - **Play internal track path**: upload AAB in Play Console → Internal testing track.

5. **Add testers**
   - Add tester emails or Google Groups in Play Console internal testing.
   - Share the opt-in testing link with clients/stakeholders.

6. **Install and verify on device**
   - Install from APK link or Play internal testing channel.
   - Run smoke test: login, core navigation, Firestore read/write, push notification flow.

7. **Common first-time blockers**
   - Package name mismatch between app config and Play Console app.
   - Signing key confusion (Play App Signing vs local expectations).
   - Testers not seeing the build because they did not accept the opt-in link.
   - Notification permission/runtime settings not enabled on Android 13+ devices.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.


## Backend & API Integrations

### Firebase & Firestore
- Firebase Authentication is used for user registration and login.
- Firestore is used for storing user data, app settings, and caching property search results.
- Firebase Cloud Functions are used for backend APIs, ingestion, and scheduled jobs.
- Store your Firebase credentials as environment variables (never in client code).

### RapidAPI (Realtor API)
- Property data is fetched from a Realtor API via [RapidAPI](https://rapidapi.com/).
- API requests are executed from Firebase Functions using Firebase Secrets for API key protection.
- Results can be cached in Firestore to reduce API calls and improve performance.

### Google Maps Platform (Android map rendering)
- The app map uses `react-native-maps`.
- On Android release builds, this uses the native Google Maps SDK and requires a Google Maps API key.
- Billing must be enabled on the Google Cloud project for Maps SDK usage.

#### APIs currently in use
1. RapidAPI Realtor API (server-side via Firebase Functions secrets)
2. Google Maps Platform (Android client-side map SDK key)

#### Android Maps key setup checklist
1. In Google Cloud Console, enable `Maps SDK for Android`.
2. Create an API key in `APIs & Services -> Credentials`.
3. Restrict the key:
   - Application restriction: `Android apps`
   - Package name: `com.hitsolutions.leadingedgerealtyapp`
   - SHA-1: use the EAS Android signing certificate fingerprint
   - API restriction: `Maps SDK for Android` only
4. Store the key in EAS as a build secret (do not commit key values):

```bash
eas secret:create --name GOOGLE_MAPS_ANDROID_API_KEY --value YOUR_ANDROID_MAPS_KEY
```

5. Inject the key at build time via app config (`app.config.ts`) or controlled config pipeline.
6. Build a new Android binary after any maps key/config changes:

```bash
eas build --profile preview --platform android
```

#### iOS note
- Default iOS map rendering uses Apple MapKit and does not require a Google Maps key.
- If switching iOS provider to Google, create a separate iOS-restricted key.

#### Example API Flow
1. Firebase Functions fetch property data from RapidAPI on schedule or HTTP trigger.
2. Function normalizes/upserts records into Firestore `properties`.
3. App reads from Firestore collections directly.

---