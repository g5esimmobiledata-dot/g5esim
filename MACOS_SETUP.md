# Set up G5eSIM on macOS

## Clone

```sh
git clone https://github.com/g5esimmobiledata-dot/g5esim.git
cd g5esim
```

## Web platform

Install Node.js 22 or newer and PostgreSQL. The project uses PostgreSQL through `pg` and Drizzle. Create a **local development database**, not a production database.

```sh
cd web
npm ci
cp .env.example .env
createdb g5esim
```

Edit `.env`: set `DATABASE_URL` to your local PostgreSQL connection string, and generate distinct random values for `SESSION_SECRET` and `JWT_SECRET` (for example, run `openssl rand -hex 32` for each). The template disables background jobs. Configure provider credentials only for the features you need.

```sh
npm run db:push
npm run dev
```

Open `http://localhost:5000`. `db:push` changes the configured database schema, so verify the connection points to your new local database first. Existing seed scripts contain demonstration accounts; review them and choose your own credentials before running any seed command. Do not use demo accounts for a public deployment.

For a production-mode build:

```sh
npm run build
npm start
```

Firebase Admin and Google Play integration require your own private service-account JSON files at `web/server/config/service-account.json` and `web/server/config/service-playstore.json`, or the environment-based configuration supported by each integration. These files are ignored by Git. App Store, payment, email, and eSIM provider integrations require their own settings. Restore required production data and uploads separately through your normal secure backup process.

`web-classic/` is an alternate earlier platform snapshot; run it independently with the same general setup, using its own database and port if needed.

## Flutter mobile app: iOS and Android

For the latest local eSIM-only version (source modified August 17, 2026), substitute `mobile-esim-only` for `mobile` in the commands below. This variant includes startup timeout handling, local-first translations, updated checkout/USDT handling, and Android launch adjustments. Its Android package is `com.g5esim.app`. Keep Firebase registration and signing aligned with the variant you build.

Install Flutter with Dart compatible with the checked-in lockfile (the project declares Dart `^3.8.1`), Xcode with iOS tools, and CocoaPods. For Android, also install Android Studio/SDK and Java 17. Check your tools with `flutter doctor -v`.

From the repository root:

```sh
cd mobile
flutter pub get
```

Set up your Firebase project before launching. Regenerate `lib/utills/firebase_options.dart` using FlutterFire with the correct project and platforms, and restore/download `android/app/google-services.json` and `ios/Runner/GoogleService-Info.plist` as required. The checked-in API-key values are placeholders; the previous iOS Firebase identifiers should be reviewed rather than assumed correct.

Example, after installing and signing in to the Firebase CLI and FlutterFire CLI:

```sh
flutterfire configure --project=YOUR_FIREBASE_PROJECT --platforms=android,ios --out=lib/utills/firebase_options.dart
cd ios
pod install
open Runner.xcworkspace
cd ..
open -a Simulator
flutter devices
flutter run -d YOUR_DEVICE_ID --dart-define=REAL_DEVICE_API_HOST=g5esim.mobile
```

In Xcode, select your Apple development team and confirm the bundle ID and capabilities. The Podfile targets iOS 15 or newer. On-device installs and App Store archives need your own signing configuration. To use a local API, replace `g5esim.mobile` with an address reachable from the device; physical devices cannot reach your Mac through `localhost`.

Android debug builds do not require a release keystore. Android release signing is optional during configuration; provide `mobile/android/app/key.properties` and your private keystore when producing a signed release. No signing keys are in this repository.

The Windows-local Maven cache is excluded; Gradle downloads dependencies from its configured public repositories. The `packages/` and `third_party/` Dart path dependencies are included.

## Electron desktop on Mac

From the repository root:

```sh
cd desktop
npm ci
npm run check
npm start
```

The desktop app opens the existing G5eSIM website. Set URLs in `desktop-config.json` if you want a different environment.

```sh
npm run build:mac
```

This requests DMG packages for Apple Silicon and Intel Macs. Apple distribution signing and notarization require your own developer credentials. The macOS and iOS builds must be verified on a Mac; they were not built on the Windows machine used for this transfer.
