# Version corrective 5.1.1, 18 novembre 2026 au soir

C'est la décision de l'utilisateur, avec un accord explicite pour fusionner, pousser et taguer **cette version seulement**.

**Le diagnostic** est dans `../fix-dossier-patient-510/BILAN.md` (la panne) et `../maj-510-mac/BILAN.md` (la mise à jour).

## 1. Contenu

| Commit | Contenu |
|---|---|
| `7b3cfc2` | **Dossier patient, Soins, Hospitalisation.** Le groupe `vendor-charts` (`vite.config.ts`) emporte toute la pile de recharts : il n'y a plus d'import circulaire entre morceaux, ce qui supprime « require_get is not a function ». Test : `tests/build/chunk-cycles.test.ts`. |
| `9e8bc63` | **Le circuit de mise à jour** (`src/services/updateService.ts`) : un échec d'installation ne pose plus `updates.dismissed_version`, et seul « Plus tard » le pose. **« Rechercher une mise à jour »** apparaît dans Paramètres > À propos (`src/components/update-check-row.tsx`), qui propose la dernière version même reportée. |
| `9bc23ea` | `chore(release): 5.1.1` : la version aux quatre endroits, et la note « Quoi de neuf » en trois points. |

## 2. Preuves avant le tag

**Tests de mise à jour** (`tests/services/update-service.test.ts`) :
- **Le cadre :** 5 cas nouveaux, et les réglages sont gardés d'un lancement à l'autre.
- **Ce qu'ils vérifient :**
  - un échec ne marque pas la version et le message dit vrai ;
  - le lancement suivant repropose la version ;
  - « Plus tard » marque la version, et le lancement suivant se tait ;
  - la vérification manuelle propose une version reportée ;
  - une installation réussie efface le refus et relance.
- **Sur le code de la 5.1.0,** les deux premiers cas échouent.

**La ligne des Paramètres** (`tests/components/update-check-row.test.tsx`) : elle est rendue, elle est placée dans « À propos », et sa vérification part avec `userInitiated: true`.

**Les contrôles de la CI,** sur l'arbre exact du tag, dans le worktree de publication :
- typecheck 0, lint `--max-warnings=0` 0 ;
- **2 117 tests verts** dans 232 fichiers ;
- licences : 0 échec.

**Le banc sur l'arbre du tag,** assemblé comme l'app installée :
- aucun cycle, et le point d'entrée n'importe pas les graphiques ;
- **0 fiche sur 16 plante** ;
- les **11 vues** chargent sans garde-fou ni erreur ;
- WhatsApp, la relance, le dialogue des coordonnées, le crayon et la ligne de mise à jour sont présents.

**Un test instable :** `dashboard-widgets`, déjà connu sous charge, a dépassé 5 s une fois sur trois exécutions de la suite dans la VM. Seul, il passe en 1 s, et les deux exécutions complètes suivantes sont vertes.

## 3. Publication

- **Le point de départ :** master avancé en avance rapide de `0028a74` à `9bc23ea` dans `~/work/publish-wt`.
- **Le tag :** `v5.1.1` sur `9bc23ea`. Master et le tag sont poussés.
- **Le run « Versioned Release » `44443055928` : succès,** du 19/11 02:16:08 au 02:29:21 UTC.

| Job | Résultat |
|---|---|
| build macOS | succès, 02:16 → 02:26. Avertissement : « Apple signing secrets missing; continuing with unsigned macOS release build », comme pour les versions précédentes |
| build Windows | succès, 02:16 → 02:28 |
| build Linux | succès, 02:16 → 02:26 |
| release | succès, 02:28 → 02:29 |

Le run « Desktop Builds » de master, lancé par le push, était encore en cours à l'écriture de ce bilan.

**La release vérifiée après publication :**
- **`bAItari 5.1.1`** est publiée et marquée « Latest », avec 14 fichiers ;
- **`latest.json`** donne la version 5.1.1 pour `darwin-aarch64`, `linux-x86_64` et `windows-x86_64` ;
- **le paquet Mac** `Baitari.app.tar.gz` a une signature valide avec la clé de l'app (`outils/verifier-signature.py` du bilan `maj-510-mac`), identique à celle du flux, et son `Info.plist` est en 5.1.1 ;
- **le binaire Linux publié** ne contient plus de morceau `isPlainObject`. Son morceau `vendor-charts-DFpHE4wl.js` porte **la même empreinte** que celui du build de production corrigé mesuré sans cycle sur le banc.

## 4. Ce qui reste à prouver

**Le critère final :** l'utilisateur met à jour chez lui, puis montre au clic que le dossier patient, Soins et Hospitalisation s'ouvrent, avec WhatsApp et le crayon présents.
- Sa 5.0.11 a la 5.1.0 marquée comme refusée, pas la 5.1.1 : la notification « Baitari 5.1.1 est disponible » doit apparaître au prochain lancement.
- Si l'installation échoue sur ce poste, l'ancien code de la 5.0.11 notera encore la 5.1.1 comme refusée, puisque la correction n'arrive qu'avec la 5.1.1. Il faudra alors installer le `.dmg` de la release.

**Non prouvé :**
- **l'app installée elle-même :** binaire amd64 et macOS, non exécutable dans cette VM ;
- **Windows et le Mac :** non vus ;
- **la mise à jour automatique** depuis la 5.0.10, la 5.0.11 et la 5.1.0.
