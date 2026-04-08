# Vetera

Application desktop Vetera construite avec React, TypeScript, Vite et Tauri.

## Development

```bash
npm install
npm run tauri:dev
```

## Desktop build

```bash
npm run tauri:build
```

## Automatic updates

Le projet publie des releases GitHub versionnees pour le systeme de mise a jour integree.

- l'application verifie les mises a jour au demarrage
- un tag Git `vX.Y.Z` declenche la release de mise a jour
- le manifeste `latest.json` est publie avec les artefacts desktop

Voir `docs/updates.md` pour le flux complet.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
