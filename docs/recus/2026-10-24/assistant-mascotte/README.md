# Panneau de l'assistant : une seule mascotte

Date : 24 octobre 2026. Commit local, aucun push. Retour d'Aïssa : la mascotte se répétait dans le panneau.

## Inventaire de la mascotte dans le panneau

| Endroit | Avant | Après |
| --- | --- | --- |
| En-tête du panneau, à côté de « Assistant Baitari » | mascotte 48 px, gros plan, cadre rond, humeurs (réflexion, contente), interactive | **conservée telle quelle** |
| Bloc « Dictée de consultation » (onglet Dictée libre) | avatar mascotte 36 px, mêmes humeurs | **retiré**, le titre et le texte restent, alignés sur le reste du panneau |
| Messages de l'assistant (questions S, O, A, P), réflexion, génération, résultats, onglets Validation SOAP et Cas similaires | aucun avatar | inchangé, vérifié à l'écran pendant une dictée |
| Languette « Déplier l'assistant », quand le panneau est replié | portrait de la mascotte | inchangée : elle n'apparaît que panneau replié, donc jamais en même temps que l'en-tête |

Hors panneau, donc hors de ce lot : la marque de la barre latérale et le bouton « Assistant » de la note clinique.

## Ce qui change

- Dans `local-consultation-assistant.tsx`, l'avatar du bloc « Dictée de consultation » est retiré, sans rien mis à la place.
- Le texte du bloc démarre maintenant sur le bord du panneau, au même niveau que « Section 1/4 » et que le reste du panneau.
- La mascotte de l'en-tête et ses humeurs ne bougent pas.

## Ce qui ne change pas

- Dictée libre, validation SOAP, cas similaires, champ, boutons et navigation des rubriques : à leur place, avec le même fonctionnement.
- Aucune couleur ajoutée.

## Captures

Instance de test isolée, mascotte « chien » activée, en clair et en sombre :
- `panneau-*` : panneau ouvert au départ ;
- `dictee-*` : pendant une dictée, première rubrique remplie et passage à l'examen clinique.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte).
- Non vérifié dans la fenêtre Tauri (WebKit).
