# G5eSIM

G5eSIM web platform, Flutter mobile application, and Electron desktop client. Source snapshot prepared on September 16, 2026 from the existing Windows projects.

| Folder | Contents |
| --- | --- |
| `web/` | Main PWA, React frontend, Express API, database schema and migrations, integrations, and Laravel port |
| `mobile/` | Flutter Android and iOS app, assets, tests, and local Dart dependencies |
| `mobile-esim-only/` | Newer eSIM-only mobile variant, with local source updates through August 17, 2026 |
| `desktop/` | Electron client for the G5eSIM portal, with Windows and macOS packaging commands |
| `web-classic/` | Earlier standalone web platform, retained separately from the PWA version |

Start with **[MACOS_SETUP.md](MACOS_SETUP.md)** on your Mac.

For the latest local eSIM-only mobile version, use `mobile-esim-only/`. The original `mobile/` folder retains the earlier full-feature variant, including voice features. The newer variant uses Android package `com.g5esim.app`; it is not a drop-in replacement for every feature of `mobile/`.

This repository contains source, not the production database or a configured deployment. Environment files, customer uploads, service-account credentials, signing keys, dependency caches, and generated builds are excluded. Supply your own private configuration locally. Firebase API-key placeholders must be replaced through your Firebase project setup before running the mobile app.

The mobile app targets Android and iOS. Use a Mac to develop and build iOS; a native Flutter macOS desktop target is not currently configured. The separate Electron client is the desktop option.

The original source folders were preserved. See [TRANSFER_NOTES.md](TRANSFER_NOTES.md) for the limited portability and credential-removal changes made to this snapshot. Existing component license notices are retained; this import does not grant new rights to third-party code or assets.
