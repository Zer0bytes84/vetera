# Refonte UX de l'Agenda

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 118 fichiers et 921 tests réussis. Captures : `avant/` (état de départ) et `apres/`, thème clair Premium, 1440 px, plus une capture en thème sombre et une en mobile (375 px).

## Nouveau flux, de haut en bas

1. **En-tête** : titre, sous-titre, « Nouveau rendez-vous » (seul bouton plein).
2. **Indicateurs** : Créneaux, Urgences ouvertes, Temps planifié, Prochain rendez-vous.
3. **Calendrier du mois**, pleine largeur : c'est la seule navigation dans le temps.
4. **Journée choisie** : la liste des rendez-vous à gauche ; à droite, le rendez-vous sélectionné et la charge de la journée.

## Ce qui change

1. **Navigation temporelle unique.** Le calendrier mensuel (nouveau composant `agenda-month-calendar.tsx`) remplace les quatre accès d'avant.
   - Un clic sur un jour le sélectionne : plus de cases encadrées, plus de multi-sélection apparente.
   - Chaque jour affiche le nombre de rendez-vous et une pastille par type d'acte.
   - « Aujourd'hui » se trouve dans l'en-tête du calendrier ; il est grisé quand on est déjà sur le jour courant.
   - Les flèches changent de mois.
   - Retirés : le bouton « Aujourd'hui » de l'en-tête de page, le sélecteur de date en surimpression, les flèches jour/semaine et l'onglet « Mois ». Le calendrier fait leur travail.
2. **Une seule liste.** « Agenda des consultations », la liste du jour et le tableau « Planning des rendez-vous » sont fusionnés en une seule liste.
   - Elle suit le jour choisi dans le calendrier et a une seule barre d'outils.
   - **Portée**, avec un compteur par onglet :
     - **Journée** (par défaut) : tous les rendez-vous du jour, terminés et à surveiller compris ;
     - **À surveiller**, **Terminés**, **Autres jours** : mêmes contenus qu'avant. Ces listes affichent la date de chaque rendez-vous.
   - **Affichage** de la journée : **Liste**, **Par vétérinaire** (l'ancienne vue Jour), **Semaine**.
   - **Filtres** du tableau, appliqués à la liste : recherche, vétérinaire, statut. « Réinitialiser les filtres » apparaît dès qu'un filtre est actif.
   - **Chaque ligne** réunit ce qu'affichaient la liste et le tableau :
     - informations : heure, durée, type, statut, motif, propriétaire, téléphone, espèce et race, vétérinaire, salle ;
     - actions : l'action suivante (Confirmer, Patient arrivé, Mettre en attente, Démarrer, Reprendre), le menu « … » (Ouvrir, Modifier, Supprimer) et l'aperçu du patient au clic sur son nom.
   - Pagination par 8.
3. **Planning des soins retiré de l'Agenda.** Les soins se gèrent dans Clinique > Soins, qui reste accessible. Les admissions et sorties d'hospitalisation du jour restent affichées au-dessus de la liste.
4. **Indicateurs silencieux.** Sans données, il n'y a plus de flèche ni de pourcentage :
   - « Créneaux » : la comparaison « vs hier » ne s'affiche que si les deux jours ont des rendez-vous. Sinon : « Aucun rendez-vous ce jour ».
   - « Temps planifié » : le taux d'occupation est masqué tant que rien n'est planifié. « 0 praticien mobilisé » devient « Rien de planifié · Capacité max 16h ».
   - « Urgences ouvertes » : à zéro, on lit seulement « Planning régulier · Aucun cas critique », sans « 0 aucun cas critique ».
   - La carte « Charge de la journée » affiche « Aucun rendez-vous ce jour-là. » au lieu de trois zéros.
5. **Hiérarchie.** Un seul flux vertical, titres de section à 18 px, graisse 500.

## Détails

- **Sélection depuis « Autres jours », « Terminés » ou « À surveiller ».** Le jour choisi ne change plus, donc la ligne ne disparaît plus sous le curseur. Le détail propose « Voir la journée » pour aller au jour du rendez-vous. Avant, le tableau sautait directement à ce jour.
- **Statut affiché.** Les lignes utilisent le badge de statut du tableau et du détail, qui tient compte du dossier. Exemple : Simba apparaît « Hospitalisé » là où l'ancienne liste disait « En cours ».
- **Barre d'outils Premium.** Elle garde 24 px de marge latérale dans les trois affichages. Une règle Premium générique la ramenait à 16 px quand elle contenait la recherche.

## Limites

- Les données SQLite (séjours, soins) ne se chargent pas dans le navigateur, d'où le message « Les séjours n'ont pas pu être chargés » sur les captures. À revoir avec `npm run tauri:dev`.
- Code laissé en place mais plus utilisé par l'Agenda : `src/modules/care-tasks/agenda-care-schedule.tsx` et `AgendaMonthView` dans `agenda-shared.tsx`. Je ne les ai pas supprimés ; je peux le faire si tu le valides.
- Toute l'application a un débordement horizontal de 6 px dans la zone de contenu, déjà présent avant (même mesure sur Patients). Il n'est pas traité ici.
