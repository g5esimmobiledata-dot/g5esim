# Transfer notes

Source mapping:

- `web/`: `eSIM PWA`
- `web-classic/`: `eSIM`
- `mobile/`: `Mobile_App`
- `desktop/`: `g5esim-desktop-wrapper`, including its local uncommitted changes

This is a source snapshot, not a merge of the two web variants. Deployment archives/scripts, production database contents, customer uploads, build output, installed dependencies, signing material, private environment files, and machine-specific settings were omitted.

Changes in this copy:

- Removed private Google service-account JSON files and embedded token values, including tokens in commented code and a translation.
- Replaced environment templates with blank credential fields and local development defaults.
- Replaced hard-coded Razorpay credentials in a legacy verification function with environment variable references.
- Made Android signing configuration conditional on private signing settings being present and removed the local Maven cache path.
- Updated the desktop repository link and added the macOS DMG build command.
- Added root ignore rules and macOS setup instructions.

Secret scanning was performed before publishing. Remaining scanner matches in CocoaPods lockfile checksums and API documentation examples were reviewed as non-secret values. Source and dependency checks do not validate production integrations, payment flows, or iOS/macOS packaging.
