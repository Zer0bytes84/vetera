# Premium par défaut et Centre d’Activation propriétaire

## Périmètre retenu

Le dernier récapitulatif du 16 octobre prime : Premium au premier lancement et toggle d’apparence conservé. L’ancienne interface StudioDashboard est retirée, sans retirer les deux vues actuelles Vue d’ensemble et Journée clinique. Les préférences Classique explicitement enregistrées restent respectées.

## Modifications

- Premium remplace Classique comme valeur initiale et comme repli pour une préférence absente ou invalide.
- L’ancienne branche StudioDashboard, ses widgets exclusifs et ses feuilles de style exclusives sont retirés. 20 fichiers obsolètes supprimés. Les modèles métier testés et les composants utilisés par la journée clinique restent présents.
- `dashboard.version=classic`, ancien nom de la vue d’ensemble, est accepté lors de la lecture puis normalisé en `analytics`. La réorganisation des widgets ouvre désormais la journée clinique, qui possède toujours cette fonction.
- Le Centre d’Activation est caché pour toute adresse différente de `zohir.kh@gmail.com`, y compris un autre administrateur. Le contrôle est répété à l’ouverture de la fenêtre, lors de l’accès direct et avant chaque requête de gestion de licences.
- Le contrôle lit la session active et non le seul profil affiché. Le propriétaire doit aussi fournir le jeton de gestion, vérifié par `/v1/admin/verify` avant que l’écran de gestion soit monté. Aucun secret n’est inclus dans le code, ni persisté dans localStorage. Les contrôles du serveur restent appliqués à chaque requête.
- La réinitialisation locale reste réservée aux administrateurs, indépendamment du verrou propriétaire des licences. Aucun compte, mot de passe ou donnée de production n’a été réinitialisé.
- Premier lancement : correction du texte noir sur fond sombre, surfaces du formulaire opaques, champs et indicateur d’étapes lisibles dans les deux modes. La variable `--card` est transparente en Premium ; le formulaire emploie donc `--surface`.
- Import React inutilisé retiré. `noUnusedLocals` et `noUnusedParameters` activés pour l’ensemble des sources applicatives.

## Vérifications

- Typecheck : 0 erreur.
- ESLint avec `--max-warnings=0` : 0 erreur, 0 avertissement.
- Vitest : 745 tests, 96 fichiers, tous réussis.
- Serveur d’activation : 13 tests réussis.
- Chromium et WebKit : 32 contrôles UI réussis au total, dont les deux vues du dashboard, le retour au style alternatif, le premier lancement clair/sombre, le refus d’un autre administrateur par navigation directe, le rejet d’un jeton incorrect et le déverrouillage avec un jeton valide de test.
- Les vérifications UI utilisent un environnement isolé ; aucune licence réelle n’a été créée, révoquée ou modifiée. Le secret de production n’a pas été utilisé.

## Preuves

- `outputs/premium-only-2026-10-16/task-changes.json` : inventaire isolé de ce chantier, malgré les modifications préexistantes dans le dépôt.
- `outputs/premium-only-2026-10-16/task.patch` : diff de ce chantier par rapport à la sauvegarde préalable.
- `outputs/premium-only-2026-10-16/checks/` : logs des vérifications.
- Captures : `/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/premium-default-2026-10-16/`, variantes Chromium et WebKit.

Aucun push, tag ou release. Build locale 3.3.24 uniquement.

## Build macOS

Build frontend réussi, compilation Rust release réussie, deux bundles générés. Version Info.plist : 3.3.24. Binaire Mach-O arm64. DMG vérifié par `hdiutil verify` : VALID.

Artefact : `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Baitari_3.3.24_aarch64.dmg`.

Commande de lancement de la build sans remplacer l’application installée :

```sh
open "/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 2.1/bAItari/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Baitari.app"
```

Le build frontend signale son avertissement existant sur les chunks JavaScript dépassant 500 kB. Aucun échec de build, ni avertissement ESLint.
