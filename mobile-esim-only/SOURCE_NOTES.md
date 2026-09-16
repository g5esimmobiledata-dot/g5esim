# Latest local eSIM-only mobile app

Imported from `eSIM Project/eSIM Only/Mobile_App`. The newest application source file modification is August 17, 2026, 17:07 Beirut time. This is a file timestamp, not a Git commit date.

Compared with the earlier full-feature mobile snapshot, this variant includes:

- Startup task timeouts and delayed Firebase/push initialization so the first screen can render.
- Splash navigation independent of the initial notification lookup, with notification setup guarded for Firebase readiness.
- Local translation loading at startup and a timeout for remote translation requests.
- Payment provider normalization and direct USDT checkout/wallet top-up handling.
- Android launch theme/rendering changes, package `com.g5esim.app`, compile SDK 36 and target SDK 35.
- eSIM-only feature scope; voice/SIP integrations differ from the full-feature app.

Credentials, signing material, and generated builds are excluded. Follow the root macOS setup guide using this folder instead of `mobile/`. No successful live card-payment test is implied by this source import.
