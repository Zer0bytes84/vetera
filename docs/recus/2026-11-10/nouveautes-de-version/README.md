# Nouveautés de version : l'écran « Quoi de neuf »

Date : 10 novembre 2026.

## Comportement

- **Après une mise à jour**, au tout premier lancement de la nouvelle version, une fenêtre s'ouvre une seule fois avec les nouveautés de la version (3 ou 4), en langage vétérinaire, et un seul bouton, « Compris ».
- **Jamais bloquante** : pas de voile, pas de piège de focus. L'application reste utilisable derrière ; « Compris », Échap ou un clic ailleurs la ferment (vérifié : un clic sur « Patients » derrière la fenêtre ouvre bien Patients et la ferme).
- **Jamais réaffichée** : la version est retenue dès l'ouverture, pas à la fermeture. Fermer l'application sans cliquer ne la fait pas revenir.
- **Installation neuve : rien.** L'assistant de configuration pose le marqueur à sa fin (`App.tsx`, `handleSetupComplete`). Si le stockage local refuse d'écrire, la fenêtre ne s'ouvre pas (on ne saurait pas s'en souvenir).
- **Installations d'avant cette fonction** : pas de marqueur, donc traitées comme des mises à jour : elles voient les notes de la 5.0.5 une fois.
- **Version sans note publiée** : rien n'est montré, le marqueur est simplement mis à jour.
- **Archive** : Paramètres > Données & système > **Nouveautés** liste les notes des versions publiées, la plus récente en premier, avec la date et « Version installée ». Les brouillons n'y apparaissent jamais.

## Où écrire les notes (à chaque publication)

`src/modules/release-notes/release-notes.ts`, tableau `RELEASE_NOTES`, une entrée par version :

```ts
{ version: "5.0.6", status: "draft", highlights: [ { icon, title, text }, … ] }
```

À la publication : passer `status` à `"published"`, ajouter `date: "AAAA-MM-JJ"`, vérifier que `version` est celle du `package.json` (un test échoue si la version du package n'a pas de note publiée). Règles d'écriture en tête du fichier : 3 ou 4 nouveautés, ce que la personne fait au cabinet, jamais de vocabulaire technique (un test le surveille).

## Contenu déjà rempli

- **5.0.5 (publiée, 8 novembre 2026)** : Un assistant plus large et plus clair ; Paramètres et « Mon cabinet » ; Une analyse financière plus riche.
- **5.0.6 (brouillon, pas encore publiée)** : Actions rapides au bout du + ; Des blocs plus doux. Le numéro 5.0.6 est mon hypothèse pour la prochaine version : à corriger si elle s'appelle autrement.

## Finitions

Surface vitrée (fond translucide 74 %, flou 24 px, comme l'en-tête et la barre d'actions rapides), aucune bordure, R20, cadre de 6 px autour du panneau intérieur (`--card-inset`, R16), espacement 12 / 24, textes dans l'échelle 12 / 13 / 16. L'ombre de la fenêtre est une ombre portée diffuse, propre aux éléments flottants ; les blocs, eux, n'en ont pas. Une règle globale (`premium-workspace.css`) rend tous les dialogues opaques : la fenêtre la surpasse avec un sélecteur limité à sa classe.

## Fichiers

- `src/modules/release-notes/` : `release-notes.ts` (les notes), `release-seen.ts` (marqueur et décision d'affichage), `whats-new-dialog.tsx` (+ `whats-new.css`), `release-highlights.tsx`, `release-notes-archive.tsx`.
- `src/components/Parametres.tsx`, `src/lib/settings-navigation.ts` : la rubrique « Nouveautés » ; `src/modules/shell/app-shell.tsx` : la fenêtre ; `src/App.tsx` : le marqueur d'une installation neuve.
- `tests/modules/release-notes/release-notes.test.tsx` : 12 tests (contenu, brouillons, décision d'affichage, marqueur, refus du stockage, archive).

## Captures (`captures/`)

`fenetre-clean-clair.jpg`, `fenetre-premium-sombre.jpg`, `archive-parametres.jpg`. L'archive reprend le gabarit existant des sections de Paramètres (dont le trait du panneau), pour rester identique aux autres rubriques.

## Contrôles

`npm run typecheck` vert ; `npm test` : 209 fichiers, 1664 tests verts.
