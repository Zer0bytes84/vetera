# Module Rappels : indicateurs, groupes comptés et sélection multiple

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs : chaque chiffre dit ce qu'il compte

Avant, les deux premiers indicateurs ne comptaient que les rappels médicaux, alors que leurs titres étaient génériques. Les deux suivants comptaient toutes les sources. Maintenant, les quatre lisent les mêmes rappels que la liste, toutes sources confondues : manuels, médicaux et rappels automatiques des rendez-vous (« du planning »).

- **En retard.**
  - Toutes les sources, au lieu des seules échéances médicales.
  - Le détail dit de quoi le chiffre est fait : « 2 médicaux · 1 manuel ».
- **Dus aujourd'hui.**
  - Toutes les sources, avec le même détail par source.
  - Le badge « Prévention », qui ne disait rien du chiffre, est retiré.
- **À traiter** : « 0 en retard · 2 aujourd'hui ».
- **À venir** : le prochain rappel, « Prochain : Demain · 09:00 », au lieu de la formule « Prochaines échéances ».

Un clic sur un indicateur ouvre maintenant la liste de toutes les sources, comme son chiffre le compte.

## Liste (point 18 de l'étude)

- **Groupes comptés** par échéance : En retard (en rouge), Aujourd'hui, Demain, Plus tard, Sans date.
  - L'ordre reste celui d'avant, par date.
  - Les rappels médicaux, affichés par leur propre composant, gardent leur bloc, sous un en-tête « Rappels médicaux » avec leur nombre.
  - La vue « Terminés » n'a pas de groupes.
- **Le socle s'applique aux rappels manuels et du planning** : survol en pastille et curseur commun à la souris et aux flèches ↑ ↓. Rappels était la liste restée hors du socle.
- **Sélection multiple des rappels manuels.**
  - Une case apparaît au survol, au curseur ou au focus. Elle reste visible tant qu'une sélection existe, et toujours sur un écran tactile.
  - **X** sélectionne la ligne courante.
  - Une **barre flottante** affiche le nombre sélectionné, « Marquer terminés », « Reporter à demain » et « Annuler (Échap) ».
  - « Marquer terminés » affiche un seul message, avec **Annuler**, qui remet chaque rappel dans son état d'avant.
- **Testé dans l'instance de test** : deux rappels manuels sélectionnés puis marqués terminés font passer « En cours » de 2 à 0 et « Terminés » de 0 à 2. Je les ai rouverts ensuite.

## Écarts

- **La sélection multiple ne porte que sur les rappels manuels.**
  - Les rappels médicaux ont leur propre composant et leurs propres actions : envoi, suivi.
  - Les rappels du planning se reportent ou s'ignorent, ils ne se « terminent » pas.
  - Les étendre demanderait de définir ce que veut dire « terminer » pour chacun.
- **Rappels médicaux non vérifiés à l'écran** : ils ne se lisent que dans SQLite, d'où le bandeau d'erreur des captures en navigateur. Ils entrent dans les indicateurs et ont leur en-tête compté, mais c'est à vérifier dans `npm run tauri:dev`.
- **J/K** : comme ailleurs, la navigation passe par ↑ ↓, car J ouvre l'assistant.

## Captures

Données de démonstration, périmètre « Toute l'équipe » : les rappels de démonstration sont attribués à d'autres vétérinaires.
- `avant/` :
  - les indicateurs (périmètre « Mes rappels ») ;
  - la liste en cours ;
  - la liste à venir.
- `apres/` :
  - les indicateurs ;
  - la sélection et sa barre ;
  - la liste à venir groupée ;
  - la sélection en sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 147 fichiers, 1 109 tests verts, dont 3 nouveaux (`tests/utils/reminder-buckets.test.ts`).
