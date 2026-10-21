# Module Patients : liste et indicateurs

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs : chaque chiffre dit ce qu'il compte

- **Patients actifs.**
  - Avant : « 4 foyers » s'affichait deux fois.
  - Maintenant : une seule ligne, « 4 foyers · 3 chiens · 2 chats », avec « · N autres » s'il y a d'autres espèces.
  - Les foyers et les espèces ne comptent plus que les patients en vie, comme la valeur.
  - « +N nouveaux sur 30 jours » n'apparaît que s'il y en a.
- **Suivi clinique.** Les pluriels sont corrigés. Quand personne n'est suivi, l'indicateur affiche « Aucun sous surveillance » au lieu de « Tous stables », qui affirmait plus que les données.
- **Rendez-vous à venir.**
  - Avant : le même chiffre apparaissait trois fois (« 1 », « 1 planifiés », « 1 consultations prévues »), suivi de « Dossiers synchronisés », une affirmation que rien ne vérifiait.
  - Maintenant : le nombre de rendez-vous, « pour N patients », puis le prochain avec sa date, son heure et le nom du patient.
- **Relances à prévoir.**
  - Avant : « 0 dossiers à jour » et « 0 relances automatiques · Rappels vaccins & soins », des relances automatiques qui n'existent pas.
  - Maintenant : « Tous vus dans les 90 jours », ou « Sans visite depuis plus de 90 jours », avec la règle de calcul en dessous.

## Corrections de calcul

- **Rendez-vous confirmés.** Les rendez-vous « confirmés » à venir n'étaient comptés nulle part : ni dans l'indicateur, ni comme prochain rendez-vous d'un patient. Ils le sont maintenant, comme dans le tableau de bord.
- **Relances.** Trois corrections :
  - la dernière visite est celle de la liste (dernière visite terminée, sinon celle du dossier), plus seulement le champ du dossier ;
  - un patient décédé n'est plus compté ;
  - un dossier créé hier sans visite n'est plus compté comme « en retard » : le délai part de sa création.

## Liste

- **Problèmes en cours en pastilles sous le nom** (point 15 de l'étude) :
  - les allergies en rouge, préfixées « Allergie : » ;
  - les maladies chroniques en ambre ;
  - deux pastilles au plus, puis « +N » ;
  - les textes tels que « Aucune » ou « RAS » ne deviennent pas des pastilles.

  Rien n'est inventé : les pastilles reprennent ce qui est déjà saisi dans le dossier.
- **Tri** (première partie du point 21) : « Trier par » propose Activité récente (l'ordre d'avant, par défaut), Nom, Dernière visite et Prochain rendez-vous. Les dossiers sans la date triée vont en fin de liste.
- **« Réinitialiser les filtres »** reste à sa place, mais il est grisé quand il n'y a rien à réinitialiser.
- **Détails** :
  - « Chien · Labrador » au lieu de « Chien - Labrador » ;
  - « Aucune » au lieu d'un tiret quand il n'y a pas encore de visite.

## Écarts et choix

- **Pas de mention « Mis à jour à ».** La liste lit la base en direct et se recharge à chaque modification. Une heure donnerait l'impression d'un instantané figé.
- **L'aperçu (point 14) est inchangé.** Il s'ouvre déjà sur Espace ou A depuis le socle, avec espèce, race, âge, propriétaire et prochaine prise en charge. Lui faire suivre ↑ ↓ pendant qu'il est ouvert demande de le rendre non modal ; c'est un changement de comportement, à décider.
- **Pas de colonnes à masquer ni de regroupement** (reste du point 21) : avec cinq colonnes, le gain est faible.
- **Pas de « récemment consultés »** : la dernière ligne ouverte redevient déjà la ligne courante au retour (socle).

## Captures

Données de démonstration de l'instance de test, 1440 × 900.
- `avant/` : liste en clair et en sombre, et l'aperçu ouvert.
- `apres/` : liste en clair et en sombre, et le menu « Trier par ».

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 143 fichiers, 1 095 tests verts, dont 10 nouveaux (`tests/modules/patients/patient-list.test.ts`) :
  - pastilles ;
  - rendez-vous à venir ;
  - relances ;
  - tri.
