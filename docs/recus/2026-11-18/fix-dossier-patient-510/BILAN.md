# Dossier patient, Soins et Hospitalisation en panne dans la 5.1.0 installée, 18 novembre 2026

**Le constat de l'utilisateur.** Sur la 5.1.0 installée, trois vues du périmètre Clinique sont en panne, pour tous les patients :
- le dossier patient et Soins affichent « Cette vue n'a pas pu être chargée » ;
- Hospitalisation est visible mais semble incliquable.

Le reste de l'application fonctionne et les données sont intactes.

**La branche :** `chantier/fix-dossier-patient-2026-11-18`, partie du tag `v5.1.0` (`0028a74`), dans le worktree `~/work/fixdossier-wt`.
- Commit du correctif : `7b3cfc2`, plus celui de ce bilan.
- Rien n'est poussé, fusionné ni tagué.
- Le dossier principal (HEAD détaché sur `ad9ecd3`) n'a pas été touché.
- Le chantier « erreurs » est en pause, sa famille 2 non commitée dans `~/work/erreurs-wt`.

## 1. L'erreur exacte

```
TypeError: require_get is not a function
    at …/assets/vendor-charts-….js:1522:42
[View] Module render failed: … at Lazy … at Suspense …
```

C'est le garde-fou `ViewErrorBoundary` (`src/app/config/view-registry.tsx`) qui l'attrape, au chargement paresseux de la vue. À la ligne 1522 du morceau `vendor-charts`, recharts (`es6/util/round.js`) appelle au chargement `require_get()`, le `get` d'es-toolkit. Ce `get` n'existe pas encore à ce moment-là.

## 2. La cause, mesurée

- **Le groupe `vendor-charts`** (`vite.config.ts`, `build.rolldownOptions.output.codeSplitting`) ne capturait que `recharts` et `d3-*`.
- **La pile sur laquelle recharts 3 tourne restait hors du groupe :** es-toolkit, Redux Toolkit, react-redux, redux, reselect, immer, victory-vendor, decimal.js-light, internmap, use-sync-external-store.
- **Rolldown la plaçait dans un morceau commun aux deux vues qui l'utilisent**, `isPlainObject-*.js`, avec l'icône `Syringe`.
- **Ce morceau importe `vendor-charts`,** puisque victory-vendor dépend de d3, et `vendor-charts` l'importe en retour, puisque recharts dépend d'es-toolkit. C'est un **import circulaire entre deux morceaux**.
- **Seules deux vues importent ces morceaux,** et toutes deux chargent le morceau en cycle avant `vendor-charts` :
  - `patient-detail-page`, le dossier patient ;
  - `clinical-workspace`, Soins et Hospitalisation.
- **Dans cet ordre,** `vendor-charts` s'exécute avant que le morceau commun ait fini de s'initialiser, et recharts appelle `get` trop tôt.
- **Le tableau de bord et les autres vues** n'importent ni l'un ni l'autre, d'où la carte exacte de l'utilisateur : seul le périmètre Clinique tombe.

Le défaut n'existe **qu'au build groupé** (le `vite build` que `tauri build` lance en CI). En développement (`npm run dev`, `tauri dev`), Vite sert chaque module séparément : il n'y a ni morceaux ni cycle entre morceaux.

**Hospitalisation « incliquable » :** c'est la même vue que Soins (`clinical-workspace`). Dans une session neuve, le clic part et tombe sur le même garde-fou. L'impression d'un clic sans effet vient, très probablement, de ce qu'on était déjà sur la vue en erreur. Je ne l'ai pas reproduit à l'identique.

## 3. Pourquoi ce n'est pas une régression de la fusion

| | Développement (non groupé) | Build groupé (app installée) |
|---|---|---|
| `ad9ecd3`, l'état témoin | fonctionne (captures de l'utilisateur) | **plante** : 3 fiches sur 3, Soins et Hospitalisation, cycle `isPlainObject ↔ vendor-charts` |
| `52aa9b7`, la 5.1.0 | **fonctionne** : 16 fiches sur 16, Soins et Hospitalisation, 0 erreur | plante (app installée, et mon build) |
| `v5.0.10` | non mesuré | **plante** : 3 fiches sur 3, même erreur et même ligne |

- **Les binaires publiés par la CI** (`.deb` Linux de `v5.0.10` et `v5.1.0`, téléchargés et ouverts) contiennent les mêmes morceaux partagés, aux mêmes empreintes, que mes builds : `vendor-charts-fEwN5-EE.js` et `isPlainObject-iNJnb2-T.js`.
- **En production, le cycle et l'ordre d'import des deux vues sont identiques** en 5.0.10 et en 5.1.0, comme le montre l'analyse statique des builds (`outils/ordre.py`).
- **Les dépendances sont identiques :** les versions de recharts, Vite, Rolldown et es-toolkit sont les mêmes dans le lock, dans le `node_modules` du banc, et aux deux tags.
- **La recherche entre `ad9ecd3` et `52aa9b7` ne trouve donc pas de premier mauvais état :** les deux bornes plantent une fois groupées, et fonctionnent toutes les deux en développement. Le témoin en `tauri dev` passe quel que soit le commit.
- **La fusion est hors de cause,** et le point suspect `medical-record-summary.tsx` aussi : la même erreur se produit sur `ad9ecd3`, qui ne contient pas WhatsApp.
- **Depuis quand :** l'adoption de Vite 8 (Rolldown), le commit `55fdd54` du 9 novembre, est contenue pour la première fois dans `v5.0.6`. Le défaut existe très probablement depuis cette version, mais je n'ai pas reconstruit les tags antérieurs à 5.0.10. Si la 5.0.10 installée semblait marcher, c'est vraisemblablement que ces vues n'y avaient pas été ouvertes. Je ne l'ai pas vérifié sur ce poste.

## 4. Le correctif

**La correction :** dans `vite.config.ts`, le groupe `vendor-charts` capture maintenant recharts, `d3-*` **et toute la pile sur laquelle recharts tourne**, avec un commentaire qui explique pourquoi. Le reste de la configuration est inchangé, et aucun fichier de l'application n'est touché.

**Mesuré sur le build corrigé :**
- **plus aucun cycle entre morceaux, dans tout le build,** en production comme en build groupé de développement ;
- **le point d'entrée n'importe toujours pas `vendor-charts` :** les graphiques restent chargés à la demande ;
- **0 fiche sur 16 plante :** tous les patients actifs de la copie de la base, ouverts un par un ;
- **les 11 vues de la barre latérale chargent sans garde-fou ni erreur de console,** une session neuve pour chacune. Avant correction, Soins et Hospitalisation tombaient et les 9 autres fonctionnaient, ce qui est exactement la carte de l'utilisateur.

**Le test** `tests/build/chunk-cycles.test.ts` :
- il construit l'application en mémoire avec la vraie configuration du projet, sans rien écrire, et vérifie trois choses :
  - aucun cycle entre morceaux ;
  - recharts, es-toolkit, Redux Toolkit et victory-vendor sont bien dans `vendor-charts` ;
  - le point d'entrée n'importe pas les graphiques ;
- **il échoue sur la configuration de la 5.1.0,** en nommant le cycle (`expected [[…2…]] to deeply equal []`), et passe sur le correctif ;
- il ajoute environ 25 s à `npm test`.

**Les contrôles de la CI de publication :**

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | sortie 0 |
| `npm run lint -- --max-warnings=0` | sortie 0 |
| `npm test` | 231 fichiers, 2 110 tests verts |
| `npm run test:licenses` | 13 réussis, 0 échec |

Ultracite trouve 8 remarques sur `vite.config.ts` avant comme après.

## 5. Ce qui n'est pas prouvé

- **L'app de bureau compilée avec le correctif :** non construite dans la VM. Le banc fait tourner le même build groupé dans Chromium, avec les mêmes morceaux, et la porte de licence levée en `NODE_ENV=development`. La preuve finale est la version corrective installée chez l'utilisateur.
  - Le build de production, lui, a été vérifié sur sa structure : plus de cycle, et le point d'entrée n'importe pas `vendor-charts`. Il n'a pas été vérifié en marche, puisque la porte de licence bloque le banc.
- **« Hospitalisation incliquable »** n'est pas reproduit à l'identique (section 2).
- **L'origine en 5.0.6 :** probable, pas mesurée (section 3).

## 6. Pour la version corrective (sur ton mot)

1. **Choisir le numéro, 5.1.1 suggéré,** puis l'appliquer : le porter aux quatre endroits (`package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`) et écrire une note de version. Je ne l'ai pas fait, puisque le numéro n'est pas décidé.
2. **Un essai chez l'utilisateur sur un build groupé, pas en `tauri dev`** : `npm run tauri:build`, ou la version de la CI, puis le dossier patient, Soins et Hospitalisation.
3. **Pousser sur ton mot :**
   - fusion dans master : la branche part de `0028a74` (master et `v5.1.0`), l'avance rapide est donc possible ;
   - puis le tag et la publication par le workflow habituel.

## Refaire le banc (`outils/`)

- **`bisect-un.sh <commit> <port>`** : il construit un commit en build groupé, porte de licence levée, puis sonde les fiches, Soins et Hospitalisation.
- **`dossiers.mjs <url> [magasin] [n]`** : il ouvre chaque fiche par la liste et relève l'erreur exacte.
- **`clinique.mjs <url>` et `vues.mjs <url>`** : Soins et Hospitalisation, puis toutes les vues de la barre latérale.
- **`cycles-all.py <dist>` et `ordre.py <dist>`** : les cycles entre morceaux, et l'ordre d'import des vues.
- **Le magasin du navigateur** est celui du banc WhatsApp : la copie de la base du 17 novembre plus les cas `ZZ-TEST`.
