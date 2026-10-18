# Correctif de chargement Produits 3.3.16

Date : 15 octobre 2026.

Les onglets **Lots** et **Opérations** échouaient sur la base existante de la version 3.3.15. La table `products` ne contenait pas `archived_at`, bien que la migration 017 soit déjà enregistrée. Les deux lectures utilisaient cette colonne et levaient `no such column: p.archived_at`. Actualiser ne pouvait pas corriger le schéma.

La migration additive **034** vérifie la présence de cette colonne dans la transaction de migration. Elle l’ajoute uniquement si elle manque. Si elle existe déjà, ses valeurs sont conservées et la migration est simplement enregistrée. Les anciennes migrations ne sont pas rejouées. Aucun produit, stock, lot ou historique n’est reconstruit ou supprimé.

## Vérifications

- Régression reproduite avant correction : les deux lectures échouent sur un schéma 033 sans la colonne.
- Mise à niveau depuis ce schéma : chargement des lots, emplacements, codes-barres, consommation et transferts.
- Conservation des quantités et de l’historique ; nouvelle ouverture sans rejouer la migration.
- Base avec colonne déjà présente : conservation des dates d’archivage et des filtres correspondants.
- Base ancienne antérieure aux lots : quantité exacte conservée.
- Installation neuve : une seule colonne d’archivage et chargement des deux onglets.
- Échec d’une réparation conditionnelle : annulation de toute la transaction, réessai possible.

Contrôle supplémentaire sur une **copie SQLite isolée de la base installée**, obtenue avec l’API de sauvegarde SQLite en ouvrant la source en lecture seule : erreurs reproduites avant migration, lectures applicatives réussies après migration, empreintes des données inchangées dans les **64 tables** contrôlées, intégrité SQLite `ok`, contrôle des clés étrangères inchangé et seconde ouverture idempotente. La base utilisée par l’application n’a pas été modifiée par ce contrôle. Ce contrôle exécute les fonctions TypeScript de lecture sur une vraie copie SQLite, sans simuler des données métier ; il ne constitue pas un parcours de clics dans l’application native.

Résultats : **typecheck 0 erreur**, **lint 0 erreur et 0 avertissement**, **678 tests Vitest réussis dans 88 fichiers**, **13 tests de licences réussis**.

Le reçu du contrôle de mise à niveau est dans `.impeccable/review/stock-loading-3.3.16/upgrade-receipt.json`.

## Build

Version des manifestes : **3.3.16**. Build macOS Apple Silicon en production, signature locale ad hoc. La mise à niveau du schéma se lance au démarrage de la nouvelle version.

Compilation réussie. Signature de l’application vérifiée avec `codesign --verify --deep --strict`, image DMG vérifiée et remontée en lecture seule. Le contenu de l’application dans le DMG correspond exactement à celui du build signé. Reçu : `.impeccable/review/stock-loading-3.3.16/build-receipt.json`.

Artefacts disponibles :

- `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Baitari.app`
- `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/Baitari_3.3.16_aarch64.dmg`

Empreinte SHA-256 du DMG : `7a940bf9eff1926ba2de749164094affb5a9dcf7becf629c8bdc4845adb97319`.

Commande de lancement depuis la racine du projet :

```sh
open "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Baitari.app"
```

Pour tester : ouvrir la nouvelle version, puis **Produits > Lots** et **Produits > Opérations**. Les tableaux doivent charger le stock existant et, en l’absence de codes-barres ou de transferts, afficher leurs états vides normaux.
