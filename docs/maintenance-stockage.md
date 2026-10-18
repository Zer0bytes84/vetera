# Projet Baitari après nettoyage

Version conservée : **3.3.24**. Nettoyage du 16 octobre 2026.

## Organisation conservée

- `src/` : application React et logique métier.
- `src-tauri/` : application native, migrations, icônes et configuration macOS.
- `public/` : images, portraits de l’équipe, polices et motifs utilisés par l’interface. Les illustrations florales sont chargées dynamiquement ; elles restent nécessaires.
- `resources/` : ressources OCR et configuration des modèles IA locaux.
- `tests/`, `scripts/`, `activation-server/` : tests, outils de construction et serveur de licences.
- `docs/`, `briefs/`, `DESIGN.md`, `AGENTS.md`, `.agents/` : documentation et instructions du projet.
- `.git/` : historique Git conservé intégralement.
- Fichiers de configuration et lockfiles : nécessaires pour réinstaller les mêmes dépendances.

## Sauvegarde et application testable

Dossier privé de sauvegarde : `/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 2.1/Baitari-archives/3.3.24-2026-10-16-150018`.

- `Baitari-3.3.24-sources-et-historique.tar.gz` : état complet des sources, fichiers non commités, historique Git, anciens exports et paramètres locaux du projet. Les dépendances réinstallables et fichiers de compilation sont exclus.
- `Baitari_3.3.24_aarch64.dmg` : dernière build macOS Apple Silicon conservée.
- `SHA256.json`, `verification.json`, `nettoyage.json` : contrôles d’intégrité et inventaire du nettoyage.

Pour ouvrir le DMG :

```sh
open "/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 2.1/Baitari-archives/3.3.24-2026-10-16-150018/Baitari_3.3.24_aarch64.dmg"
```

L’ancien chemin dans `src-tauri/target/` n’existe plus : ce dossier était un cache de compilation de 10 Go.

## Reprendre le développement

Les dépendances installées ont été retirées pour libérer environ 1,3 Go. Les lockfiles sont conservés.

```sh
npm ci
npm run tauri:dev
```

Le prochain build Rust sera plus long : Cargo devra reconstruire son cache.

Pour les validations et un nouveau build :

```sh
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run test:licenses
npm run tauri:build -- --target aarch64-apple-darwin --bundles app,dmg
```

Les dossiers régénérables `node_modules/`, `dist/` et `src-tauri/target/` reviendront après ces commandes. Déplacer le DMG final hors de `target/` avant un nouveau nettoyage. Conserver une seule sauvegarde vérifiée sur ce disque ; transférer les archives supplémentaires sur un disque externe si nécessaire.

## Données et secrets conservés

Aucune donnée clinique, licence, clé de signature ou compte n’a été effacé. Le dossier macOS `~/Library/Application Support/com.baitari.vetera` et l’application installée dans `/Applications` restent inchangés. Les modèles IA installés y sont également conservés.

L’archive contient la configuration privée du projet et les secrets locaux du serveur d’activation. Son dossier est accessible uniquement au compte macOS propriétaire. Ne pas publier cette archive.

## Restaurer la sauvegarde

Extraire l’archive dans un **nouveau dossier vide**, puis lancer `npm ci` dans ce dossier. Ne pas écraser une version de travail sans vérifier son contenu.

Aucun push, tag ou release n’a été effectué.
