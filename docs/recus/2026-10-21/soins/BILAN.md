# Module Soins : indicateurs, doses du jour et frise

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs : chaque chiffre dit ce qu'il compte

- **Soins prévus.**
  - Les soins annulés ne comptent plus : 10 avant, 9 après, sur les mêmes données.
  - Le détail donne « 3 faits · 6 à terminer · 1 annulé ».
- **À terminer.** L'indicateur donne le prochain soin dû, « Prochain à 12:00 », avec le soin et le patient : « Collyre · Milo ». Quand tout est fait, il affiche « Tous terminés ».
- **En retard.** Il affiche le plus ancien retard : « Le plus ancien : 10:30 · Simba ». Sans retard, il rappelle la règle : heure prévue dépassée, soin non validé.

## Vue « Par patient » (point 17 de l'étude)

- **Doses du jour en n/m** dans l'en-tête de chaque animal : « 2/6 faits ». Les soins annulés n'entrent pas dans le compte.
- **Frise du jour** sous le nom :
  - un point par soin, placé à son heure, sur la plage des soins prévus ;
  - un trait marque l'heure actuelle ;
  - quatre états : vert « Fait », rouge « En retard », ambre « Dans les 2 h », gris « Plus tard » ;
  - une légende unique au-dessus des cartes.
- **Chaque point ouvre le soin**, comme un clic sur sa ligne (`apres/soins-frise-clic`). Il porte son libellé, son heure et son état pour les lecteurs d'écran.
- La vue « Par heure » ne change pas.
- Le validateur de soin, le détail et l'historique ne changent pas.

## Comment j'ai vérifié, et ce qui reste à vérifier

Les soins ne se lisent que dans SQLite, donc avec `npm run tauri:dev`. Je n'ai lancé l'app ni sur la base réelle (aucune écriture possible dessus), ni sur une copie, qui aurait affiché des patients réels sur les captures.

- **Captures :** pour elles seules, le navigateur de capture remplace la lecture des soins par dix soins de démonstration, sur Simba et Milo. Le code de l'application n'a pas été modifié pour ça, et aucune donnée n'a été écrite.
- **Calculs :** synthèse, doses, frise et seuil de 2 h sont couverts par des tests automatiques.
- **À vérifier dans `tauri:dev`, sur les vrais soins :** l'affichage de la frise et des doses avec la base de la clinique.

## Écarts

- **Point 24 non traité** : résultats d'analyse interprétés, et constantes min–max par jour. Ces données se trouvent dans l'onglet Hospitalisation (séjours), lui aussi lisible seulement avec SQLite. Il demande sa propre passe, à vérifier dans `tauri:dev`.
- **Le bandeau « Les rappels patients n'ont pas pu être chargés »** sur les captures vient du mode navigateur. Rappels aura son étape.

## Captures

1440 × 900.
- `avant/` : indicateurs et liste par patient.
- `apres/` :
  - les mêmes vues en clair ;
  - la liste en sombre ;
  - le détail ouvert depuis un point de la frise.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 145 fichiers, 1 103 tests verts, dont 4 nouveaux (`tests/modules/care-tasks/care-day.test.ts`).
