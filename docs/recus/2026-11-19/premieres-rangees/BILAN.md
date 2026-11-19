# Premières rangées de widgets : la finition du Tableau de bord partout, 19 novembre 2026

**La branche :** `chantier/lot-hospitalisation-widgets-2026-11-19`, dans le worktree `~/work/lot-wt`, partie de master `0226fdc` (la 5.1.1).
- Commits locaux, rien n'est poussé, fusionné ni tagué.
- La partie Hospitalisation du lot fait l'objet de son propre bilan.

**Le standard demandé,** le Tableau de bord faisant foi :
- aucun trait de bordure, aucune ombre ;
- le contraste des fonds seuls ;
- un cadre uniforme ;
- des rayons concentriques 22/16.

## 1. La mesure

**Le banc :** l'application assemblée comme la release, avec la copie de la base, en Clean clair et sombre. L'outil `outils/rangees.mjs` mesure la première rangée de chaque page de la barre latérale. Les relevés sont dans `avant.json` et `apres.json`.
- **Ce qu'il relève :** pour la bande et chaque carte, la bordure, l'ombre, le rayon, le fond et le remplissage, plus les marges entre le bord de la bande et les cartes, et les écarts entre cartes.

**Avant correction (master, 5.1.1) :**
- **La géométrie était déjà la bonne partout** : bande de 22 px, cartes de 16 px, cadre de 6 px, écarts de 6 px, aucune bordure.
- **Seule différence avec le Tableau de bord :** sur Patients, Agenda, Soins, Hospitalisation, Produits, Finances et Équipe, les cartes portaient une ombre.
  - **En clair :** `0 0 0 0.5px rgb(0 0 0 / 6 %)`, soit un filet de 0,5 px, plus deux ombres portées. C'est le trait que montrent les flèches de la capture, aux coins et aux jonctions.
  - **En sombre :** un filet de lumière de 7 % sur l'arête haute.
- **Le Tableau de bord et Rappels n'en avaient pas.**
- **Deux premières rangées n'étaient pas construites avec les cartes du Tableau de bord :**
  - **la fiche patient :** une seule surface découpée par des filets verticaux, avec un anneau de 1 px autour ;
  - **Flux** (la rangée « Journée sans visite ») : trois cartes cerclées d'un filet, hors bande, écartées de 10 px.
- **Documents n'a pas de rangée de cartes.**

## 2. Ce qui a réintroduit le défaut

- **Le commit :** `2ff09f6` du 13 novembre, « feat(ombres): une ombre de contact pose les panneaux blancs sur leur bande ».
  - Son message le dit lui-même : « Proposition de banc contre la règle « ni trait ni ombre » ».
  - Il donne une ombre à **tous** les panneaux (`[data-slot="panel"]`) en Clean, à travers un jeton unique `--clean-panel-shadow`.
- **Le chemin jusqu'à master :** la fusion `b344310`, « la branche du banc fable-fraicheur dans master ».
- **Depuis quand :** le défaut est dans les versions publiées **depuis la 5.0.10**, pas seulement depuis la 5.1.1. La 5.0.10 est le premier tag qui contient ce commit.
- **Pourquoi deux pages y échappaient :** le Tableau de bord (`premium-analytics.css`) et Rappels (`patient-reminders.css`) annulaient chacun cette ombre localement. Toute autre page qui utilise les mêmes cartes la recevait.

## 3. La correction

Elle porte sur la présentation seulement. Aucun contenu, aucun lien ni aucun comportement de carte ne change.

**Les cartes `StatGrid`, sur toutes les pages qui les utilisent :**
- la grille de cartes reçoit un repère (`data-slot="stat-grid"`, dans `stat-grid.tsx`) ;
- une règle de `clean.css`, placée après l'ombre générale, retire l'ombre de ses cartes.
- L'ombre des autres panneaux de l'app ne change pas : retirer la règle générale du 13 novembre dépasserait les premières rangées, c'est à décider (section 5).

**La fiche patient** (`patient-record-blocks.css`) :
- quatre cartes séparées par le cadre de la bande (6 px), au fond `--card-inset`, au rayon `--radius-panel` (16 px), avec 16 px de marge intérieure, sans filet ni anneau ;
- les règles du thème, qui dessinaient une seule carte à filets avec des `!important`, sont surpassées en spécificité ;
- le retour au survol des cartes cliquables est gardé : changement de fond seul, comme sur le Tableau de bord.

**Flux** (`flow-board.css`) : la rangée devient une bande grise (`--card-band`, cadre de 6 px, rayon 22), et les cellules des cartes sans filet (`--card-inset`, rayon 16, marge de 16 px). La disposition en colonnes et sa version étroite sont inchangées.

## 4. Les preuves

**Après correction, mesure identique au Tableau de bord, propriété par propriété, en clair et en sombre :**
- **Patients, Agenda, Rappels, Produits, Finances, Équipe :** bande, cartes, cadre et écarts identiques au Tableau de bord.
- **Soins et Hospitalisation :** identiques eux aussi, à une nuance près sans effet visible : la couleur d'une bordure de 0 px, qui ne se dessine pas.
- **La fiche patient :** bande de 22 px et cadre de 6 px ; quatre cartes de 16 px, toutes à 136 px de haut, écarts de 6 px, marges gauche, droite et bas de 6 px ; ni ombre ni anneau.
- **Flux :** bande de 22 px, marges de 6 px sur les quatre côtés, écarts de 6 px, cartes de 16 px sans filet.

**Les images :**
- `captures-avant/` et `captures-apres/`, en clair et en sombre ;
- `comparaison-patients-clair.png` (avant et après) ;
- `jonction-patients-clair.png`, une jonction de cartes agrandie quatre fois : le filet d'avant a disparu.

**Les tests :**
- `tests/first-row-widgets.test.ts`, 3 cas : il garde les règles des trois corrections. Il échoue en entier sur master et passe avec la correction.
- Contrôles complets : typecheck 0, lint `--max-warnings=0` 0, **2 120 tests verts** (dont les 3 nouveaux).

## 5. Ce qui n'est pas prouvé ou reste à décider

- **L'ombre du 13 novembre reste sur les autres panneaux de l'app,** hors des premières rangées. Elle contredit la charte « ni trait ni ombre ». **La retirer partout** (supprimer la règle `[data-slot="panel"]` de `clean.css`) toucherait toutes les pages : c'est à décider, avec une mesure et des captures de chaque page.
- **L'intérieur des cartes de la fiche n'est pas uniformisé :** les deux premières et les deux dernières n'ont pas la même typographie de titre. Ce n'était pas demandé, et ce n'est pas la finition des bords.
- **La rangée de Flux n'a été vue qu'en jour sans visite,** le seul état où elle existe. Elle n'a pas de bandeau de titre, contrairement aux autres bandes.
- **Les thèmes autres que Clean** n'ont pas été mesurés.
- **L'app de bureau n'a pas été vue :** les mesures viennent de l'application assemblée, servie dans Chromium.
