# Fusion de la branche du banc dans master

Clone `~/work/baitari-release-507`, 13 novembre 2026. L'original n'a pas été touché : il a seulement été lu, par `git fetch`. Rien n'a été poussé.

## 1. Mise à niveau de master

- Le master du clone était à `89fb7dd`. Il a été avancé (fast-forward) jusqu'à `58cd372`, le master de l'original, récupéré par `git fetch` en lecture seule. Vérifié avant la fusion : `git rev-parse HEAD` est égal au `58cd372` de l'original.
- Le clone portait une modification non commitée de `src/components/app-sidebar.tsx`. Elle était **identique, octet pour octet, au fichier de `58cd372`** (diff vide). Rien n'a donc été perdu en l'abandonnant ; une copie du diff a été gardée hors du dépôt.
- Le fichier non suivi `src-tauri/gen/schemas/linux-schema.json`, généré localement, n'a pas été touché et n'est pas commité.

## 2. Fusion

`banc/fable-fraicheur-2026-11-12` (`3f8a4b5`) est fusionnée dans master par `b344310`. La fusion n'est pas une avance rapide : le banc est parti de `8174718`, et master avait un commit de plus, `58cd372`. Elle couvre 333 fichiers, avec 5 569 lignes ajoutées et 387 retirées.

## 3. Conflits et arbitrages

**Un seul conflit, dans `src/components/app-sidebar.tsx`.**

- Côté master (`58cd372`) : « Clinique » devient un titre de section, avec Soins et Hospitalisation en entrées directes.
- Côté banc (`b9f521b`) : les sous-pages de l'entrée « Clinique » passent par `isClinicTabVisible`, ce qui fait disparaître Hospitalisation quand le cabinet ne la propose pas.

**Arbitrage.** La structure de master reste, et ses deux entrées directes passent par le même filtre que le banc. C'est une seule liste filtrée, et la seule règle reste `isClinicTabVisible` (`src/modules/clinique/clinic-services.ts`). Le dépliant « clinique » du banc et le renommage de cette entrée en « Soins » sont retirés : master ne liste plus d'entrée « clinique » dans la navigation. Le type `ClinicTab` vient de `clinic-services`, comme sur le banc.

Aucun autre fichier n'était en conflit. La fusion n'a cassé ni le typecheck, ni les tests, ni le lint : il n'a donc fallu **aucun commit de correction**.

## 4. Vérifications, chiffres exacts

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` (`tsrs -b`) | Vert, code de sortie 0 |
| `npm test` | **1 846 réussis sur 1 846**, dans 222 fichiers sur 222 |
| `npm run test:licenses` (étape de la CI) | 13 réussis sur 13 |
| `eslint . --max-warnings=0` | **Échec : 11 erreurs, 181 avertissements**, identiques à ceux de `58cd372` seul (lint relancé dans un worktree temporaire de master, aucun problème ajouté ni retiré par la fusion) |
| `vite build` | Vert |

**Détail du lint**, dans `preuves/lint.txt` :

- Les **11 erreurs** sont toutes des « Parsing error: 'return' outside of function » dans les onze scripts `docs/recus/2026-11-12-tour-guide/outils/application-reelle/*.js`. Ces scripts, entrés dans master avec le tour guidé (`8174718`), sont des corps de fonction passés au pilote de test, pas des modules.
- Les **181 avertissements** sont tous `react-hooks/todo`, et déjà présents dans master.

La CI ne lance pas le lint : il ne bloque pas un build. Je ne les ai pas corrigés, parce que la fusion ne les a pas causés. Si tu veux que le lint passe à `--max-warnings=0` :

- **pour les 11 erreurs**, un commit à part qui exclut ce dossier d'outils dans `eslint.config.js` ;
- **pour les 181 avertissements**, un chantier de réécriture, fichier par fichier, des motifs que le compilateur React ne prend pas encore en charge, comme `try/finally`.

## 5. Invariants, vérifiés au clic sur master fusionné

Les vérifications ont été faites dans Chromium sur le banc, en clair et en sombre (`outils/invariants.mjs`, `outils/tour-relance.mjs`).

- **Barre latérale** :
  - « Espace de travail » contient Tableau de bord, Patients, Agenda, Flux et Rappels ;
  - « Clinique » est un titre non cliquable, suivi de Soins et Hospitalisation ;
  - « Gestion du cabinet » contient Documents, Produits, Finances et Équipe.
- **Hospitalisation décochée** (Paramètres › Mon cabinet) : il ne reste que Soins sous « Clinique », la page Soins n'a plus d'onglets, et la palette ne propose plus « Nouvelle hospitalisation » (0 résultat au lieu de 1). L'état tient après rechargement. Une fois recochée, Soins et Hospitalisation, les onglets et la palette reviennent.
- **Thème** : `data-skin="clean"`, sans `data-visual-style`, aucune règle Premium chargée, aucune mention de Premium dans Apparence. La police est Inter (« Inter Clean », le fichier Inter embarqué).
- **Tour guidé** : « Revoir le tour » dans les Paramètres le relance (« Étape 1 sur 4 »).
- **Mascottes** : le chien est coché par défaut. Les 15 compagnons proposés finissent par Chouette, Âne, Furet, puis Logo classique.
- **Données** : la fusion ne touche aucun fichier de migration, de schéma ou de `src-tauri`, et l'identifiant reste `com.baitari.vetera`. Le réglage d'hospitalisation écrit une clé (`clinic.hospitalization_enabled`) dans la table `app_settings`, qui existe déjà dans master, et seulement quand on le change. Sans cette clé, l'hospitalisation est proposée, comme avant.

## 6. Ce qui n'est pas prouvé

- **La vraie app** : il n'y a pas eu de `tauri:dev` dans la VM, comme demandé. Tout a été vu dans Chromium sur le banc, avec la base de test, et rien n'a été vu dans la fenêtre Tauri ni sur le Mac.
- **Soins, rappels médicaux et séjours** sont lus par SQLite natif. Sur le banc, ils sont vides ou non lus : leur affichage sur les vraies données reste à voir dans l'app.
- **L'enregistrement du réglage d'hospitalisation** a été vérifié dans le magasin du navigateur, pas dans la base SQLite de l'app.
- **Le lint** échoue à `--max-warnings=0`, comme sur master avant la fusion (section 4).
