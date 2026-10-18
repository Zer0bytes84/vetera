# Tableau de bord : graphique, panneau « Cette semaine » et espacement

Date : 18 octobre 2026. Rien n'a été commité. Polish visuel uniquement : mêmes données, même structure.

## Graphique « Recettes & Activité »

- **Courbes lissées** monotones (Fritsch-Carlson) : elles passent par chaque valeur sans jamais descendre sous zéro ni dépasser un pic, donc aucune donnée n'est déformée. Le tracé vient de `chart-path.ts`, une fonction pure testée.
- **Profondeur** :
  - un dégradé vertical sous chaque courbe (recettes, consultations plus discrètes) ;
  - un halo flou très léger sous chaque trait ;
  - un trait un peu plus épais.
- **Points de données** : un petit point sur chaque jour de recettes, quand la période reste lisible (45 points au plus). Le **pic de la période** a un point marqué, un halo qui pulse doucement et son montant (« 13 900 DA »).
- **Survol** :
  - la colonne du jour est surlignée ;
  - les points grossissent avec un halo et glissent d'un jour à l'autre ;
  - l'info-bulle suit en douceur, avec une ligne d'en-tête et des pastilles rondes.
- **Entrée** : les courbes se dessinent en 0,9 s et les aires apparaissent en fondu.
- Toutes les animations sont coupées si « réduire les animations » est activé dans le système.

## Panneau « Cette semaine »

- **Chiffres qui respirent** : le chiffre reste en 24 px, l'unité (« DA », « % ») passe en 13 px atténué, avec plus d'espace autour.
- **Libellés** : une petite pastille devant chaque libellé. Elle devient orange, avec un anneau, quand il reste un montant à recouvrer.
- **Taux de règlement** : une fine jauge verte, qui se remplit à l'affichage, illustre le pourcentage déjà affiché.
- **Rendez-vous** :
  - le premier rendez-vous du jour encore à venir reçoit un liseré bleu, un fond très léger et la mention « À suivre » ;
  - au survol d'une ligne, le bouton de démarrage passe en plein.

Dans les données de démonstration, tous les rendez-vous du jour sont passés : la mention « À suivre » n'apparaît donc pas sur les captures.

## Espacement entre les rangées (demande ajoutée en cours de travail)

Avant, les écarts étaient irréguliers : 40, 24, 44, 24 et 24 px. Il y a maintenant **48 px** entre chaque rangée : accueil, indicateurs, graphique, « À surveiller » et « Gestion du cabinet ».

Les filtres de période restent à 16 px des indicateurs qu'ils pilotent. Les cartes d'une même rangée sont séparées de 24 px.

Le réglage ne s'applique qu'à la vue Analyse : la vue Clinique du tableau de bord n'est pas touchée.

## Charte

- Couleurs : uniquement des jetons (`--series-1`/`--premium-blue`, `--series-2`/`--premium-orange`, `--ok`, `--line`, `--lift`, `--surface`…). Le garde-fou `tests/dashboard-charter.test.ts` passe.
- Tailles de texte : 12, 13 et 24 px. Le garde-fou `tests/type-scale.test.ts` passe.
- Thèmes clair et sombre vérifiés.

## Fichiers

- Nouveaux :
  - `src/modules/dashboard/components/chart-path.ts` : `monotonePath`, `splitUnit` ;
  - `tests/dashboard/chart-path.test.ts` : 4 tests.
- Modifiés :
  - `src/modules/dashboard/components/premium-analytics.tsx` : rendu du graphique, `FactValue`, repère « À suivre », prop optionnelle `now` ;
  - `src/modules/dashboard/components/premium-analytics.css` : nouveaux blocs en fin de fichier, les règles existantes ne sont pas réécrites ;
  - `src/modules/dashboard/pages/dashboard-page.tsx` : transmet l'horloge `now`, déjà présente.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 123 fichiers, 953 tests, tous verts ;
- navigateur : les valeurs affichées sont identiques à l'avant (13 900 DA, 4, 96,5 %, 0 DA), aucune erreur de rendu.

## Captures

- Avant (`avant/`) :
  - `00-capture-utilisateur-app-bureau.webp` : votre capture ;
  - `01-chart-et-panneau.jpg` ;
  - `02-survol.jpg` ;
  - `03-espacement-rangees.jpg`.
- Après (`apres/`) :
  - `01-chart-et-panneau.jpg` ;
  - `02-survol.jpg` ;
  - `03-theme-sombre.jpg` ;
  - `04-espacement-rangees.jpg`.

## Taux de règlement : correction (demandée ensuite)

Le « Taux de règlement » de « Cette semaine » affichait **96,5 % par défaut** quand aucune facture n'était émise ni réglée. C'était une valeur inventée.

- Sans facture, la carte affiche désormais **« Aucune facture »**, en texte atténué, sans pourcentage ni jauge.
- Dès qu'une facture existe, le calcul est inchangé : factures réglées / (émises + réglées).
- Le montant « Reste à recouvrer » avait aussi une valeur de repli inventée, 14 500 DA, utilisée si les données financières manquaient. Elle est remplacée par 0 DA. En pratique, la page fournit toujours ces données ; ce repli n'apparaissait donc pas.

Capture : `apres/05-taux-sans-facture.jpg`. Les données de démonstration n'ont aucune facture.
