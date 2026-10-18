# Tableau de bord : rangée « À surveiller »

Date : 18 octobre 2026. Rien n'a été commité.

## Choix

Le tableau de bord montrait déjà :
- le prochain rendez-vous (bandeau d'accueil) ;
- l'activité de la période (indicateurs) ;
- les recettes et la consultation ;
- les rendez-vous du jour (« Cette semaine »).

En revanche, trois informations qui servent chaque jour n'y figuraient pas en liste : les rappels qui arrivent, le stock qui manque ou se périme, et les animaux hospitalisés.

J'ai donc ajouté **une seule rangée de trois cartes courtes**, entre « Recettes & Activité » et « Gestion du cabinet ». Chaque carte affiche au plus 4 lignes, et la rangée garde la largeur et l'espacement du reste du tableau de bord pour rester aérée.

| Carte | Source réelle | Règle d'affichage | Clic |
| --- | --- | --- | --- |
| **Rappels à venir** | rappels médicaux (module Rappels, SQLite) | statut « en cours », en retard ou échéance sous 14 jours ; patients décédés exclus ; en retard d'abord | ligne : aperçu du patient ; « Rappels » : page Rappels, onglet médical |
| **Stock à surveiller** | produits | rupture, seuil minimum atteint, lot périmé, péremption sous 60 jours ; produits archivés et actes sans stock exclus ; utilise la quantité disponible et la péremption des lots quand elles existent | ligne et « Produits » : page Produits |
| **Hospitalisés** | hospitalisations | séjours admis, sous surveillance ou en état critique ; cage, jour de séjour (J1, J2…), diagnostic ; état critique d'abord | ligne : aperçu du patient ; « Soins » : page Soins |

Couleurs de pastille : rouge pour en retard, rupture, lot périmé ou état critique ; orange pour aujourd'hui, seuil, péremption proche ou surveillance ; gris pour le reste. Au-delà de 4 lignes, un lien « + N autres » mène à la page.

**États vides** : « Aucun rappel dans les 14 prochains jours. », « Stock à jour : aucun seuil atteint ni lot proche de péremption. », « Aucun animal hospitalisé en ce moment. ». Le chargement et l'erreur sont gérés, avec un bouton « Réessayer » pour les rappels.

**Pas de données factices** : tout vient des dépôts existants. Le calcul est fait par des fonctions pures, testées.

**Charte** : cadres gravés `.card.frame`, en-têtes `.cardHead`, `.cardTitle` et `.cardNote`, lien `.moreLink`. Les couleurs viennent des jetons existants (`--ink`, `--soft`, `--faint`, `--band`, `--lift`, `--bad` / `--premium-red`, `--premium-orange`, `--signal-*` en Classique). Les tailles de texte sont 12, 13, 14 et 16 px, et la typographie est celle de l'application. Thèmes clair et sombre vérifiés.

## Rien d'existant n'est déplacé

- Bandeau d'accueil, filtres de période, indicateurs, « Recettes & Activité », « Cette semaine » et « Gestion du cabinet » sont inchangés ; seul « Gestion du cabinet » descend d'une rangée.
- La vue « Clinique » du tableau de bord (bascule de version) n'est pas modifiée : la rangée ne s'affiche que dans la vue Analyse par défaut.

## Fichiers

Nouveaux :
- `src/modules/dashboard/model/dashboard-watch.ts` : `buildUpcomingReminders`, `buildStockWatch`, `buildHospitalizedWatch` ;
- `src/modules/dashboard/components/dashboard-watch.tsx` et `dashboard-watch.css` ;
- `tests/modules/dashboard/dashboard-watch.test.ts` : 6 tests.

Modifiés, par ajouts seulement :
- `src/modules/dashboard/components/premium-analytics.tsx` : prop optionnelle `watch`, affichée avant « Gestion du cabinet » ;
- `src/modules/dashboard/pages/dashboard-page.tsx` : lecture des rappels médicaux et construction des trois listes.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 122 fichiers, 949 tests, tous verts, dont `tests/type-scale.test.ts`.

Dans le navigateur, le clic sur un hospitalisé ouvre bien l'aperçu du patient.

Données de test : deux hospitalisations (Simba en état critique, Rex sous surveillance) ont été ajoutées pour la capture 03, puis **retirées**. Il reste 0 hospitalisation.

**Limite connue** : les rappels médicaux sont stockés en SQLite. Dans le navigateur, la carte affiche donc « Les rappels patients n'ont pas pu être chargés. », comme le widget « Rappels médicaux » existant de la page Clinique. La liste remplie ne se vérifie qu'avec `npm run tauri:dev`. Je ne l'ai pas encore fait ; les règles sont couvertes par les tests.

## Captures

Avant (`avant/`) : `01-haut.jpg`, `02-milieu.jpg`, `03-bas.jpg`. Le tableau de bord passait directement de « Recettes & Activité » à « Gestion du cabinet ».

Après (`apres/`) :
- `02-milieu-a-surveiller.jpg` : la nouvelle rangée avec les données de démonstration. Deux produits sont sous leur seuil, dont un vaccin qui périme le 30 novembre. La carte Hospitalisés montre son état vide, et la carte Rappels l'erreur propre au navigateur ;
- `03-hospitalises-donnees-de-test.jpg` : carte Hospitalisés remplie (état critique en rouge, surveillance en orange) ;
- `04-theme-sombre.jpg` : thème sombre, forcé par script.

Le haut de page n'a pas changé : voir `avant/01-haut.jpg`.
