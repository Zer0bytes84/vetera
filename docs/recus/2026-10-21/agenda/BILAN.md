# Module Agenda : indicateurs et vue par vétérinaire

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs : chaque chiffre dit ce qu'il compte

- **Créneaux.**
  - Les rendez-vous annulés ou manqués ne comptent plus.
  - L'écart nomme sa base, « +2 contre 1 la veille », au lieu de « vs hier ». Le libellé reste juste quand le jour affiché n'est pas aujourd'hui.
  - Le détail dit « 1 terminé · 2 en cours · 0 à venir », et « · N annulés » s'il y en a. Avant, « restants » mêlait les visites en cours, à venir et annulées.
- **Urgences ouvertes.**
  - **Correction de calcul :** l'indicateur comptait toutes les urgences non terminées de tout l'historique, y compris les absences (« manqué »), quel que soit le jour affiché. Il compte maintenant les urgences non terminées du jour affiché.
  - Le texte répétait le chiffre trois fois (« 1 », « 1 cas prioritaires », « 1 patient prioritaire · Surveillance requise »). Il nomme maintenant les patients : « Simba à 10:15 ».
  - Sans urgence : « Aucune urgence ouverte aujourd'hui », au lieu de « Planning régulier · Aucun cas critique », qui affirmait plus que les données.
- **Temps planifié.**
  - L'« occupation » (11 %) et la « Capacité max 16h » reposaient sur une journée de 8 heures par vétérinaire. Ces horaires ne sont saisis nulle part : les deux mentions sont retirées.
  - Il reste la durée réelle, sans les annulés, et « 2 praticiens mobilisés sur 2 ».
- **Prochain rendez-vous.**
  - L'heure seule pouvait désigner demain : le jour est maintenant affiché (« Aujourd'hui · Contrôle »).
  - Le détail donnait « Milo · Milo - Controle ». Il donne maintenant le patient et le vétérinaire : « Milo · Dr Karim Messaoud ».
  - Sans rendez-vous : « Aucun rendez-vous à venir », au lieu de « Aucun créneau imminent dans la demi-heure », une règle que le calcul n'appliquait pas.
- **Charge de la journée** (panneau de droite) : il lit les mêmes chiffres que les indicateurs, sans les annulés : temps, types, vétérinaires, urgences et barres de la semaine.

## Vue « Par vétérinaire » (point 16 de l'étude)

- **En-tête de colonne.**
  - Initiales justes : « LA » et « KM », au lieu de « DR » pour tout le monde.
  - Nombre de rendez-vous et de patients : « 2 rendez-vous · 2 patients ».
- **L'heure actuelle n'est écrite qu'une fois, dans la marge.**
  - Avant, chaque colonne répétait sa propre étiquette.
  - La ligne traverse toujours toutes les colonnes.
  - L'heure pleine trop proche de l'heure actuelle s'efface pour ne pas la chevaucher.
- **« + 12:30 » au survol d'une demi-heure libre.**
  - Au clic, le formulaire « Nouveau rendez-vous » s'ouvre avec le vétérinaire de la colonne et l'heure déjà remplis. Le jour était déjà prérempli.
  - Le survol est immédiat et s'efface en 150 ms, réservé à la souris ; au clavier, Tab parcourt les créneaux.
  - Pas de « + » sur une demi-heure occupée ou déjà passée. Un rendez-vous annulé libère son créneau.

## Écarts

- **Pas de créneaux bloqués hachurés.** L'application ne connaît ni horaires d'ouverture, ni absences, ni pauses. Il n'y a donc rien de vrai à hachurer : il faudrait d'abord pouvoir saisir ces plages.
- **La vue Semaine et le calendrier du mois** ne changent pas, au-delà des chiffres corrigés.
- **Le bandeau « Les séjours n'ont pas pu être chargés »** sur les captures vient du mode navigateur : les séjours ne se chargent qu'avec SQLite.

## Captures

Données de démonstration de l'instance de test, 1440 × 900.
- `avant/` : les indicateurs (`agenda-clair`) et la vue par vétérinaire (`agenda-par-veto`).
- `apres/` :
  - les mêmes vues en clair et en sombre ;
  - `agenda-par-veto-survol` : survol de 12:30 chez le Dr Lina Ait Salem ;
  - `agenda-creation` : le formulaire ouvert par ce clic, avec le vétérinaire et 12:30 préremplis.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 144 fichiers, 1 099 tests verts, dont 4 nouveaux (`tests/modules/agenda/agenda-slots.test.ts`) :
  - initiales ;
  - créneaux libres ;
  - chiffres du jour.
