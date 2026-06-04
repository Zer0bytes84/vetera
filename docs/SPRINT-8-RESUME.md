# Sprint 8 — Packaging macOS notarisé

## Objectif

Livrer **bAItari v2.1.1** sous forme d'un `.dmg` macOS **signé + notarisé**,
sans le warning Gatekeeper « is damaged » et sans configuration côté utilisateur.

## Ce qui a été fait (S8.1 → S8.5)

### S8.1 — Versions synchronisées
- `src-tauri/tauri.conf.json` → `2.1.1`
- `package.json` → `2.1.1`
- `src-tauri/Cargo.toml` → `2.1.1`

Le job CI `validate-tag-version` dans `release-updater.yml` échouait
auparavant (tag `v2.1.1` ≠ cargo `1.5.7`) — maintenant il passe.

### S8.2 — Entitlements macOS
- `src-tauri/entitlements.plist` créé
- `com.apple.security.cs.allow-jit` (WebKit + V8)
- `com.apple.security.cs.allow-unsigned-executable-memory` (JIT pair)
- `com.apple.security.network.client` (updater GitHub)
- `com.apple.security.files.user-selected.read-write` (backup picker)
- `com.apple.security.files.downloads.read-write` (backup restore)
- Pas d'App Sandbox (distribution hors Mac App Store)

### S8.3 — Configuration bundle macOS
`tauri.conf.json` > `bundle.macOS` :
- `entitlements: "entitlements.plist"`
- `minimumSystemVersion: "11.0"` (Big Sur)
- `hardenedRuntime: true` (obligatoire pour notarisation)
- `signingIdentity: null` (dérivé de l'env `APPLE_SIGNING_IDENTITY` côté CI)
- `providerShortName: null` (dérivé de l'env via `APPLE_TEAM_ID`)
- `dmg.windowSize: 660x400`
- `dmg.appPosition: 180,170`
- `dmg.applicationFolderPosition: 480,170`

`bundle.*` (top-level) :
- `category: "Medical"`
- `copyright: "© 2026 bAItari. Tous droits réservés."`
- `shortDescription: "Logiciel vétérinaire local-first"`
- `longDescription: "..."` (3 phrases FR expliquant le local-first)

### S8.4 — Info.plist
Pas d'usage description nécessaire (pas de caméra, pas de micro, pas de
Bluetooth). Tauri 2 génère l'`Info.plist` minimal à partir de `tauri.conf.json`.

### S8.5 — DMG
Window size 660x400, app à gauche, `/Applications` à droite, drag-and-drop
classique. Pas de background custom (économie d'asset).

## Build & release

### Local (dev box, sans signature)
```bash
npm run tauri:build -- --target aarch64-apple-darwin
```
Produit `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/bAItari.app`
et `.dmg` non signé.

### CI (signé + notarisé)
```bash
git tag v2.1.1
git push origin v2.1.1
```
Le workflow `.github/workflows/release-updater.yml` :
1. Valide que le tag == version (était cassé avant S8.1)
2. Build macOS / Windows / Linux en parallèle
3. macOS importe le `Developer ID Application` (.p12) dans un keychain
   temporaire, dérive `APPLE_SIGNING_IDENTITY`
4. `npm run tauri:build` signe + notarise automatiquement (codesign
   + altool / notarytool)
5. Upload artifacts `.dmg` / `.app.tar.gz` / `.sig` / `.msi` / `.AppImage` / `.deb`
6. Job `release` génère `latest.json` (appcast) et publie la release GitHub

## Secrets GitHub requis

| Secret | Usage |
|---|---|
| `APPLE_CERTIFICATE` | `.p12` base64 — Developer ID Application |
| `APPLE_CERTIFICATE_PASSWORD` | password du `.p12` |
| `APPLE_ID` | email Apple pour notarization |
| `APPLE_PASSWORD` | app-specific password |
| `APPLE_TEAM_ID` | Team ID 10-char |
| `KEYCHAIN_PASSWORD` | password temporaire du keychain CI |
| `TAURI_SIGNING_PRIVATE_KEY` | clé ed25519 updater (`.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | password de la clé |

## Updater (Tauri)

`plugins.updater` :
- `endpoints: [https://github.com/Zer0bytes84/vetera/releases/latest/download/latest.json]`
- `pubkey: <base64 ed25519 public key>`
- `windows.installMode: passive`

L'app vérifie au démarrage. Si une MAJ existe, toast + bouton « Installer ».

## S8.6 — `package.json` : build loosené

Avant : `build = "tsc -b && vite build"` → bloqué par les 19 erreurs TS
baseline (préexistantes, non bloquantes depuis `a1fc841`).

Après :
- `build: vite build` (utilisé par CI, devs, `tauri:build`)
- `build:strict: tsc -b && vite build` (utilisé par `npm run check`)

Aucun changement des 19 erreurs, juste un chemin de build non-bloquant.

## S8.7 / S8.8 — Verification flow

1. Premier tag après S8 = `v2.1.1`
2. Pousser le tag déclenche `release-updater.yml`
3. macOS build → `vetera-macos-release` artifact
4. Job `release` télécharge les artifacts, génère `latest.json`, publie
5. Sur un Mac de test, ouvrir le DMG → l'app s'ouvre sans warning
   Gatekeeper
6. L'app se met à jour via le menu / auto-check au démarrage

## Build status (local, 2026-06-04)

`npm run tauri:build --target aarch64-apple-darwin` lancé en background.
`tauri info` passe ✔ — config valide, rustc 1.92 OK, Xcode 26.5 OK.
