# Agenda : cartes de rendez-vous et panneau de droite

Date : 19 octobre 2026. Rien n'a été commité ni poussé.

## Cartes de rendez-vous (liste de l'Agenda)

Mêmes données, mêmes actions : sélection au clic ou au clavier (Entrée, Espace), fiche patient au clic sur le nom, bouton d'étape (Confirmer, Patient arrivé, Mettre en attente, Démarrer, Reprendre), menu Ouvrir, Modifier, Supprimer, pagination par 8.

- **Hiérarchie** : l'heure de début en grand (24 px, Space Grotesk, chiffres alignés), avec en dessous la fin et la durée en petit. Le patient vient ensuite (16 px, gras), puis le motif (13 px), puis les détails en discret (12 px) : propriétaire, téléphone, espèce et race, vétérinaire, salle.
- **Cartes mieux définies** : une vraie surface, avec une bordure fine et des coins de 14 px. Au survol, une ombre légère. La carte sélectionnée a un liseré de la couleur principale. Un filet coloré à gauche reprend le type d'acte (vaccin, urgence, contrôle…).
- **Plus d'air** : 10 px entre les cartes, 18 px de marge intérieure, et des colonnes fixes (heure, avatar d'espèce, contenu, actions) pour que tout s'aligne d'une carte à l'autre.
- **Badges** : en pastilles arrondies de 22 px, avec un point de la couleur du statut, regroupés à droite du nom.
- **Mobile** : sur un écran de 375 px, l'heure et le contenu tiennent sur deux colonnes, sans défilement horizontal.

## Panneau de droite

- **Cadre** : en thème Premium, les cartes n'ont pas de fond. La colonne de droite reçoit maintenant le même cadre gravé que le panneau de gauche (`board-frame`), et ses marges sont alignées. La gouttière entre les colonnes passe de 16 à 24 px, pour que les repères d'angle ne se touchent pas. Le bloc « Aucun rendez-vous sélectionné » a désormais un cadre, lui aussi.
- **Charge de la journée, avec des rendez-vous** : mêmes données qu'avant, mieux hiérarchisées. La durée planifiée en grand (« 1 h 45, planifiées · 3 rendez-vous »), la répartition par type en barre segmentée avec sa légende, une petite jauge par vétérinaire, puis les urgences et les vétérinaires mobilisés.
- **Charge de la journée, à vide** : elle n'affichait qu'une ligne grise. Elle montre maintenant, uniquement à partir de données réelles :
  - « Journée libre », avec un bouton « Planifier un rendez-vous » (même action que le bouton de la liste vide) ;
  - le **prochain rendez-vous** maintenu après ce jour (patient, date, heure, type), avec « Voir la journée ». Les rendez-vous annulés ou non honorés ne comptent pas. S'il n'y en a aucun, le panneau l'indique ;
  - la **semaine** : le nombre de rendez-vous de chaque jour, en mini-barres sur une échelle commune. Le jour affiché est mis en avant, et un clic sur une barre ouvre ce jour.
- La section « Semaine » s'affiche aussi quand la journée a des rendez-vous.

## Charte

Geist et Space Grotesk, jetons existants uniquement (`--surface`, `--card`, `--border`, `--foreground`, `--muted-foreground`, `--primary`, `--ring`, couleurs des types et statuts de `status-meta`). Tailles de texte de la charte : 12, 13, 14, 16, 18 et 24 px. Le test `type-scale` est vert. Thèmes clair et sombre vérifiés, mouvements réduits respectés.

## Fichiers

- `src/components/AgendaListView.tsx` : balisage de la carte (mêmes données et actions) ;
- `src/modules/agenda/components/agenda-cards.css` (nouveau) : styles des cartes et du panneau ;
- `src/modules/agenda/components/agenda-day-load.tsx` (nouveau) : panneau « Charge de la journée », extrait de `agenda-view.tsx` puis refait ;
- `src/modules/agenda/components/agenda-day-load-model.ts` (nouveau) : prochain rendez-vous, charge de la semaine (fonctions pures) ;
- `src/modules/agenda/components/agenda-view.tsx` : utilise le panneau extrait, cadre de la colonne de droite, gouttières ;
- `tests/modules/agenda/agenda-day-load-model.test.ts` (nouveau) : 3 tests.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 130 fichiers, 1 003 tests, tous verts.

**Captures** : le navigateur intégré avait perdu son espace activé, et l'application `tauri:dev` ne peut pas être pilotée ni photographiée depuis cette session (pas d'autorisation d'enregistrement d'écran). Les captures viennent donc d'une **page de prévisualisation temporaire**, servie par Vite en local. Elle affichait les vrais composants de l'Agenda (liste et panneau), les vrais styles (thème Premium) et les données de démo de l'application. Je l'ai supprimée ensuite. Le reste de l'écran Agenda (en-tête, calendrier, onglets, filtres) n'y figure pas et n'a pas été modifié.

Non vérifié dans `tauri:dev` après les derniers réglages : le cadre de la colonne de droite et l'alignement de ses marges. Votre application en `tauri:dev` les reçoit en direct (rechargement à chaud).

## Captures

Avant (`avant/`) :

- `01-liste-journee-chargee.png` ;
- `02-journee-vide-panneau-charge.jpg` : panneau réduit à « Aucun rendez-vous ce jour-là. » ;
- `03-liste-theme-sombre.png`.

Après (`apres/`) :

- `01-liste-journee-chargee-carte-selectionnee.jpg` ;
- `02-journee-vide-sans-rdv-a-venir.jpg` ;
- `03-journee-vide-prochain-rdv.jpg` : prochain rendez-vous (Bella, dimanche 18 octobre) avec « Voir la journée » ;
- `04-theme-sombre.jpg` ;
- `05-mobile-375px.jpg`.

## Remarqué en passant, non modifié

- Le chiffre « Urgences » du panneau compte toutes les urgences ouvertes de l'agenda, pas seulement celles de la journée affichée. Comportement existant, conservé tel quel.
