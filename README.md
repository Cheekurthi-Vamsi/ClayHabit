# ClayHabit

A premium, offline-first productivity app — tasks, streaks, notes, reminders, calendar, goals, and
focus sessions in one workspace. Built with Expo, TypeScript, and Expo Router.

## Stack

- **Expo SDK 57** + **Expo Router** (file-based routing, `src/app`)
- **TypeScript** (strict mode)
- **React Native Reanimated** + **Gesture Handler** for animation and swipe gestures
- **expo-sqlite** with a hand-rolled versioned migration runner — no ORM
- **Zustand** for small client UI state, **TanStack Query** for all SQLite reads/writes
- **expo-notifications** for local reminders, **expo-local-authentication** + **expo-secure-store**
  for App Lock
- **Jest** (`jest-expo`), with repository/migration tests run against a real SQLite engine via
  Node's built-in `node:sqlite` (see `src/data/db/testing/create-test-db.ts`) rather than mocks

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on a physical device, or press `a` / `i` for
an Android/iOS emulator if you have one configured. There is no backend to run — everything is
local SQLite.

## Project structure

```
src/
  app/            Expo Router routes (thin — screens import from features/)
  features/       Screen-level UI grouped by domain (tasks, notes, streaks, calendar, goals, focus, security, settings)
  components/ui/  The shared design system (Button, Card, BentoCard, ProgressRing, ...)
  data/           SQLite client, migrations, and repositories (the only layer that touches SQL)
  domain/         Entity types and pure domain services (recurrence, streak engine)
  lib/            Cross-cutting service wrappers (notifications, security)
  store/          Zustand stores (settings, ephemeral app-lock session state)
  theme/          Design tokens: colors, typography, spacing, radii, motion
  hooks/, utils/  Shared hooks and pure utility functions
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` / `npm run ios` | Build the native debug app and run it on a device/emulator |
| `npm run web` | Start Metro and open the web build |
| `npm run android:prebuild` / `android:apk` / `android:aab` | See [Android builds](#android-builds) |
| `npm test` | Run the Jest test suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write mode |

## Android builds

`android/` is generated from `app.json`, `app.config.ts` and `plugins/with-android-build.js`, and is
git-ignored. Don't edit it by hand: change the config and regenerate.

**Prerequisites:** Android Studio (SDK + NDK), `ANDROID_HOME` set to the SDK, and a JDK 21 install
(Android Studio → Settings → Build Tools → Gradle → Download JDK → JetBrains Runtime 21). Newer JDKs
break this build, so the Gradle daemon is pinned to 21 by `android/gradle/gradle-daemon-jvm.properties`.

| Command | What it does |
| --- | --- |
| `npm run android:prebuild` | Delete and regenerate `android/` from the config |
| `npm run android` | Debug build (dev client) installed on a device/emulator; loads JS from Metro |
| `npm run android:apk` | Standalone release APK → `android/app/build/outputs/apk/release/app-release.apk` |
| `npm run android:aab` | Play Store bundle → `android/app/build/outputs/bundle/release/app-release.aab` |

**Android Studio:** open the `android/` folder, not the repo root. Debug builds need Metro running
(`npx expo start`). To get a standalone build, switch the Build Variants panel to `release`, then use
Build → Generate App Bundles or APKs.

**Permissions and native modules:** `android.blockedPermissions` in `app.json` removes permissions
that libraries add but ClayHabit never uses: draw-over-apps, external storage, launcher badge counts
(ShortcutBadger), and install referrer. `expo.autolinking.android.exclude` in `package.json` keeps
Clerk's Solana wallet module out of the APK, because the app's JS never loads it. Both tend to trip
antivirus heuristics. Remove an entry only when a feature actually needs it.

**Release signing:** release builds use the debug key unless an upload key is configured in
`~/.gradle/gradle.properties`. That file is outside the repo, so the setting survives regeneration:

```properties
CLAYHABIT_UPLOAD_STORE_FILE=C:/keys/clayhabit-upload.keystore
CLAYHABIT_UPLOAD_KEY_ALIAS=clayhabit
CLAYHABIT_UPLOAD_STORE_PASSWORD=...
CLAYHABIT_UPLOAD_KEY_PASSWORD=...
```

Create the key with
`keytool -genkeypair -v -keystore clayhabit-upload.keystore -alias clayhabit -keyalg RSA -keysize 2048 -validity 10000`
and back it up, because every Play update must be signed with the same key. Google sign-in matches
the signing certificate's SHA-1. Register the upload key's SHA-1 (and Play's app-signing SHA-1 from
Play Console) on the Android OAuth client in Google Cloud before shipping a build signed with it.
Bump `android.versionCode` in `app.json` for every Play upload.

## Sign-in and data storage

Sign-in is **Google only** (no ClayHabit passwords):

1. *Continue with Google* opens the native Google account sheet
   (`@react-native-google-signin/google-signin`). Its ID token goes to Clerk with the
   `google_one_tap` strategy, and Clerk starts the session (`features/auth/use-google-auth.ts`).
   In Expo Go, or when Clerk isn't set up for native tokens, it falls back to Clerk's browser OAuth.
2. Once per account, the person chooses where the data lives (`features/cloud/storage-choice-screen.tsx`):
   - **This phone**: SQLite on the device only. Nothing is uploaded, and Google Drive is never asked for.
   - **Google Drive**: the same SQLite database, plus an AES-256-GCM encrypted snapshot in Drive's
     hidden app folder (`drive.appdata` scope), synced in the background. The key is kept with the
     Clerk account, so a new phone restores with no extra step.

   The choice is cached on the phone and saved with the account. Settings → Cloud switches either way.

### One-time setup

**Google Cloud Console** (one project for all of the below):

- *APIs & Services → Library*: turn on the **Google Drive API**. When it's off, Drive calls fail
  with 403 `accessNotConfigured`, and the app says so.
- *Google Auth Platform → Branding / Audience*: fill in the consent screen. While it's in *Testing*,
  add every Google account that will sign in as a **test user**, or publish the app.
- *Data access*: add the scope `https://www.googleapis.com/auth/drive.appdata`.
- *Clients*:
  - **Web application** client: its ID goes in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`.env.local`).
    Add Clerk's *Authorized redirect URI* (shown in Clerk's Google settings) to it for the browser fallback.
  - **Android** client: package `com.kernalpanic.clayhabit` + the SHA-1 of the key that signs the
    APK you install. The debug/template key is `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
    Add one Android client per signing key (upload key, Play app-signing key). A mismatch shows as `DEVELOPER_ERROR`.

**Clerk Dashboard**:

- *SSO connections → Google*: turn on **Use custom credentials** and paste the **web** client's ID and
  secret. Native sign-in needs this, because Clerk only accepts ID tokens issued for that client ID.
- *User & authentication*: turn off email/password sign-up. Also make username, phone and password
  optional, or Google sign-ups end in `missing_requirements`.
- *Native applications*: allowlist `clayhabit://sso-callback` for the browser fallback.

## Database

The schema evolves through numbered migrations in `src/data/db/migrations/`, applied in order and
tracked via SQLite's `PRAGMA user_version` (see `src/data/db/migrate.ts`). Add a new migration file
rather than editing an existing one once it has shipped.

## Design system

`/dev/ui-showcase` (linked from Settings → Developer in dev builds) renders every component in the
shared design system for visual review.
