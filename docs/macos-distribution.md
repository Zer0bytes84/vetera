# macOS Distribution

Vetera can build on macOS without Apple distribution credentials, but those builds are not suitable for end users.

To ship a macOS app that opens without the "is damaged" Gatekeeper error, GitHub Actions must have:

- a `Developer ID Application` certificate exported as `.p12`
- Apple notarization credentials

## Entitlements & hardened runtime

`src-tauri/entitlements.plist` declares the capabilities required by Vetera:

- `com.apple.security.cs.allow-jit` (WebKit + V8)
- `com.apple.security.cs.allow-unsigned-executable-memory` (JIT pair)
- `com.apple.security.network.client` (updater reaches `github.com`)
- `com.apple.security.files.user-selected.read-write` (backup picker)
- `com.apple.security.files.downloads.read-write` (backup restore)

The app is **not sandboxed** — Vetera is distributed via Developer ID +
notarization, not the Mac App Store, so the Sandbox entitlement is intentionally
omitted. Local file system access is granted via the user-selected / downloads
scopes above.

Hardened runtime is enabled by default in `tauri.conf.json > bundle.macOS.hardenedRuntime`.

## Bundle config

`src-tauri/tauri.conf.json` > `bundle` :

- `category: "Medical"`
- `copyright: "© 2026 bAItari. Tous droits réservés."`
- `shortDescription` / `longDescription` (used for the App Store-style metadata)

`bundle.macOS` :

- `entitlements: "entitlements.plist"`
- `minimumSystemVersion: "11.0"` (Big Sur)
- `signingIdentity: null` — derived from the `APPLE_SIGNING_IDENTITY` env var
  that the CI workflow exports after importing the `.p12`
- `dmg.windowSize: 660x400` (drag-and-drop window)

## Required GitHub secrets

- `APPLE_CERTIFICATE`: base64-encoded `.p12` export of the `Developer ID Application` certificate
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`
- `APPLE_ID`: Apple account email used for notarization
- `APPLE_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `KEYCHAIN_PASSWORD`: temporary password used by the CI keychain
- `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: ed25519 key
  used to sign the `.app.tar.gz` updater artifacts

## Versioning rule

The `tauri.conf.json > version`, `package.json > version` and
`src-tauri/Cargo.toml > version` must stay in sync. The `release-updater.yml`
workflow runs a `validate-tag-version` step that fails the release if the git
tag does not match the in-tree version — this prevents publishing a `v2.1.1`
tag against a `1.5.7` Cargo build.

## Build commands

```bash
# Local dev build (unsigned, macOS only)
npm run tauri:build -- --target aarch64-apple-darwin

# CI release: push a git tag matching the in-tree version
git tag v2.1.1
git push origin v2.1.1
```

The CI workflow:

1. Builds macOS (signed + notarized) / Windows / Linux in parallel
2. macOS imports the `.p12` into a temporary keychain, derives
   `APPLE_SIGNING_IDENTITY` automatically
3. Tauri calls `codesign --options runtime` and `xcrun notarytool` under the
   hood
4. Uploads `.dmg`, `.app.tar.gz`, `.sig` (updater) artifacts
5. Generates `latest.json` (Tauri appcast) and publishes the GitHub release

## Notes

- An `Apple Development` certificate is not enough for public distribution.
- The workflows now fail fast on macOS if these secrets are missing, so we do not accidentally publish an unsigned app.
- Tauri reads the signing identity from `APPLE_SIGNING_IDENTITY`, which the workflow derives from the imported certificate.
