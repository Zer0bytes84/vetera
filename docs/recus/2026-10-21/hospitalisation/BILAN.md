# Hospitalisation : constantes interprétées et min–max par jour (point 24)

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change dans le détail d'un séjour, section « Constantes »

- **Dernières valeurs, en mots.**
  - Pour chaque mesure : la dernière valeur, sa position par rapport au repère de l'espèce, l'écart avec le relevé précédent et l'heure du relevé.
  - Exemple : « Température 39,4 °C : au-dessus du repère du chat (38,1 à 39,2 °C) · −0,2 depuis 07:30 · relevé à 10:00 ».
  - Une valeur hors repère passe en rouge.
  - Sans repère connu, la ligne le dit : « pas de repère enregistré pour cette mesure ». C'est le cas de la fréquence respiratoire et du poids, et de toute espèce autre que chien, chat et lapin.
- **Par jour, du plus bas au plus haut.**
  - Une ligne par jour, la plus récente en haut, avec le nombre de relevés.
  - Pour chaque mesure : le minimum et le maximum du jour, ou « Non relevé ».
- **Repère sur les courbes.** Température et fréquence cardiaque montrent le repère de l'espèce en bande verte derrière la courbe, avec une légende.
- **Liste des relevés** : « 21 oct., 10:00 » au lieu de « 21/10/2026 10:00:00 ».

Les repères sont ceux déjà présents dans l'application (`vital-alerts.ts`, sources MSD et Merck citées dans le code). Aucun seuil n'a été ajouté. L'alerte existante reste affichée sous les courbes.

## Liste des séjours

- « Admis le 20 oct., 16:10 · 2 journées occupées » au lieu de « Admis le 20/10/2026 16:10:00 ».
- Le nombre de journées n'est affiché que pour un séjour actif. C'est le même calcul que dans le détail.

## Écarts

- **Pas de résultats d'analyse** : l'application n'enregistre aucun résultat de laboratoire. Il n'y a donc rien à interpréter de ce côté. Seules les constantes le sont.
- **Occupation, Tournée et Emplacements** ne changent pas.

## Comment j'ai vérifié, et ce qui reste à vérifier

Comme pour les Soins, les séjours ne se lisent que dans SQLite.
- **Captures :** pour elles seules, le navigateur de capture remplace la lecture par un séjour de démonstration (Simba, quatre relevés sur deux jours). Le code de l'application n'est pas modifié pour ça, et rien n'est écrit.
- **Calculs :** min–max par jour, lecture par rapport au repère et écart avec le relevé précédent sont couverts par des tests automatiques.
- **À vérifier dans `npm run tauri:dev`, sur un vrai séjour :** l'affichage de ces nouveautés.

## Captures

1440 × 900.
- `avant/` : liste des séjours et constantes.
- `apres/` :
  - les mêmes vues ;
  - les courbes avec leur bande de repère ;
  - les constantes en sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 146 fichiers, 1 106 tests verts, dont 3 nouveaux (`tests/modules/hospitalizations/vitals-summary.test.ts`).
