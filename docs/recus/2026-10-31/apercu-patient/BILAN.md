# Aperçu patient depuis la liste : aligné sur le dossier

Le 31/10/2026. Il s'agit du panneau « Dossier médical » qui s'ouvre en cliquant sur un patient de la liste (`PatientPeekView`). Les captures ont été prises sur Kejounti (ID-0010), avec l'aperçu ouvert depuis la liste des patients, en clair et en sombre :

- `reel-*` : une copie de la base réelle ;
- `rempli-*` : une seconde copie avec contention et antécédent de démonstration. Ces données n'ont jamais été écrites dans la base réelle.

## Ce qui change

1. **La sécurité, visible dès l'aperçu.** La bande sécurité du dossier remplace les encadrés « Allergies et contre-indications » (rose, avec son icône dans un carré teinté) et « Antécédents & Affections chroniques » (jaune). Elle est placée juste sous l'identité, avant les onglets : l'allergie en pastille rouge (le seul rouge de l'aperçu), puis la contention en pastille neutre sur la même ligne. La contention n'apparaissait pas du tout dans l'aperçu avant.
2. **Les antécédents ne disparaissent pas.** Ils passent dans « Repères cliniques », en ligne neutre « Antécédents », comme une autre donnée clinique.
3. **Les en-têtes portent la signature du dossier** (icône à trait fin, libellé en gris lisible, mêmes espacements) :

| Bloc | Icône |
| --- | --- |
| Repères cliniques | Activity |
| Propriétaire | User (avant, l'icône tombait au-dessus du libellé) |
| Notes utiles à la prise en charge | Notebook |
| Visites et rendez-vous (onglet Visites) | CalendarBlank |
| Vaccinations et pesées (onglet Suivi préventif) | Syringe |

Le composant `ClinicalAlerts` n'avait plus d'utilisateur ; je l'ai supprimé. Les jetons de couleur du dossier, la bande sécurité et les en-têtes s'appliquent aussi au panneau d'aperçu (`.patient-peek-panel`). Les couleurs de statut existantes ne changent pas.

## Portes

- `npx tsc -p tsconfig.app.json --noEmit` : 0.
- `npx eslint .` : 0.
- `npx vitest run` : 175 fichiers, 1341 tests verts.
- Erreurs console : aucune. Défilement horizontal : aucun.

## Ce que les captures ne prouvent pas

- **Les onglets Visites et Suivi préventif.** Ils n'ont pas été capturés ; leurs en-têtes utilisent le même composant.
- **Un patient sans allergie.** Le cas n'a pas été vu dans l'aperçu ; la bande affiche alors « Aucune allergie connue » ou « Allergies non renseignées », en neutre.
- **Le mode « suivi au clavier »** (aperçu non modal, qui suit la sélection dans la liste) n'a pas été capturé ; c'est le même panneau.
- **Les aperçus ouverts depuis l'agenda, le tableau de bord ou Flux** utilisent le même composant, mais n'ont pas été capturés.

## Espacement de la bande sécurité (correctif)

La bande était collée au filet de l'identité (0 px au-dessus) et éloignée des onglets en dessous (environ 50 px). Elle a maintenant 16 px au-dessus comme en dessous, et son bord gauche est aligné sur l'avatar. Captures : `apres-espacement/`.
