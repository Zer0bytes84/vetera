# Build locale 3.3.26 : compatibilité de la base 036

Validation du 17 octobre 2026. Aucun push, tag ou release.

## Diagnostic

L’instance bloquée provenait de `/Applications/Baitari.app`, dont le bundle indiquait **3.3.24**. Sa fenêtre affichait le refus d’ouverture d’une base contenant la migration 036. La base locale était intacte, en version 036. Les sources et le bundle frontend de production actuel incluaient déjà les migrations 036 (rappels médicaux) et 037 (documents administrables).

La nouvelle build porte le numéro **3.3.26** dans les manifestes npm, Cargo et Tauri. Aucun contournement du contrôle de schéma, aucune rétrogradation et aucune réinitialisation n’ont été introduits.

## Vérification de la mise à niveau

- Sauvegarde cohérente de la base 036 par l’API SQLite avant lancement.
- Exécution des migrations réelles sur une copie privée : seule 037 est appliquée, puis aucune migration au second démarrage.
- Empreintes identiques des données des 64 tables métier préexistantes contrôlées ; paramètres et corps des modèles historiques conservés.
- Intégrité SQLite correcte et aucune violation de clé étrangère, avant et après la mise à niveau.
- Test de non-régression ajouté dans `tests/modules/patient-reminders/medical-migration.test.ts` : ouverture d’une base 036, conservation des rappels manuels et médicaux et second démarrage sans rejeu.

## Application effectivement lancée

L’ancienne instance a été fermée normalement. Son bundle a été conservé dans le dossier de livraison, puis `/Applications/Baitari.app` a été remplacé par la build vérifiée 3.3.26. L’exécutable installé est identique à celui du build.

L’application native a été lancée et son arbre d’accessibilité confirme le tableau de bord à `tauri://localhost#/dashboard`, avec les rappels médicaux affichés. La base locale contient désormais les migrations 036 et 037, avec `user_version = 37`, intégrité correcte et aucune violation de clé étrangère.

## Reçus

- Typecheck : 0 erreur.
- ESLint : 0 erreur, 0 avertissement.
- Tests application : **852 passés** dans 107 fichiers.
- Tests licences : **13 passés**.
- Total : **865 tests passés**.
- Builds frontend et macOS Apple Silicon réussis.
- Présence de 036 et 037 vérifiée dans le JavaScript de production.
- Contrôle du chargement initial réussi.
- Signature locale ad hoc et intégrité du DMG vérifiées. Build de test locale, non notariée.

Les journaux, contrôles de migration et empreintes SHA-256 sont dans `output/builds/3.3.26-documents-2026-10-17/`. Le DMG y est conservé hors du cache Cargo. `verification.json` indique aussi le chemin de la sauvegarde SQLite préalable et de l’ancien bundle.

```sh
open "/Applications/Baitari.app"
```
