# Automatic Updates

Vetera uses the Tauri updater for desktop releases.

## Release flow

1. Update the version in `src-tauri/tauri.conf.json`.
2. Keep the same version in `package.json` and `src-tauri/Cargo.toml`.
3. Push a git tag using the format `vX.Y.Z`.
4. GitHub Actions builds the macOS, Windows and Linux artifacts.
5. The workflow publishes a GitHub Release and uploads `latest.json`.
6. Vetera checks `https://github.com/Zer0bytes84/vetera/releases/latest/download/latest.json` at startup.

## Required GitHub secrets

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

These secrets are used to sign updater artifacts so the app can verify downloaded updates.

## User experience

- The app checks for updates on startup.
- When a newer version exists, the user sees a notification.
- Clicking `Installer` downloads and installs the update.
- The application restarts after installation.
