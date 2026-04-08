# macOS Distribution

Vetera can build on macOS without Apple distribution credentials, but those builds are not suitable for end users.

To ship a macOS app that opens without the "is damaged" Gatekeeper error, GitHub Actions must have:

- a `Developer ID Application` certificate exported as `.p12`
- Apple notarization credentials

Required GitHub secrets:

- `APPLE_CERTIFICATE`: base64-encoded `.p12` export of the `Developer ID Application` certificate
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`
- `APPLE_ID`: Apple account email used for notarization
- `APPLE_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `KEYCHAIN_PASSWORD`: temporary password used by the CI keychain

Notes:

- An `Apple Development` certificate is not enough for public distribution.
- The workflows now fail fast on macOS if these secrets are missing, so we do not accidentally publish an unsigned app.
- Tauri reads the signing identity from `APPLE_SIGNING_IDENTITY`, which the workflow derives from the imported certificate.
