# Première rangée du tableau de bord : un graphique par widget

Le 31/10/2026. Les captures viennent d'une copie de la base réelle (sauvegarde en lecture seule), en Vue d'ensemble, sur la période « 30 jours ». Elles couvrent Clean et Premium, en clair et en sombre.

- `avant/` : le commit 2f12d54 ;
- `apres/` : ce changement ;
- `cote-a-cote/` : la rangée seule, avant en haut et après en bas.

## Les doublons trouvés

| Thème | Widgets | Graphique | Pourquoi c'était le même |
| --- | --- | --- | --- |
| Clean | Trésorerie et Consultations | Mini aire du cumul sur la période | Même dessin, même couleur, même forme : chaque consultation payée fait un encaissement, donc les deux cumuls montent aux mêmes jours. Depuis le port du 27/10 (commit 69f989f), Consultations avait reçu l'aire de Trésorerie au lieu de ses barres. |
| Premium | Trésorerie, Consultations et Patients suivis | Mini histogramme par tranche | Trois fois les mêmes barres grises, aux mêmes jours, pour la même raison. |

Le graphique « Recettes & activité », juste en dessous, montre aussi les recettes et les consultations par tranche. Les mini graphiques de la rangée le répétaient en petit.

## Ce que chaque widget affiche désormais

C'est le même dans les deux thèmes.

| Widget | Visualisation | Information propre |
| --- | --- | --- |
| Trésorerie | Mini aire, cumul des encaissements | Comment la somme s'est constituée sur la période. Seul widget de la rangée à porter de l'argent. |
| Consultations | **Nouveau :** le motif dominant, en texte (« Consultation · 100 % »), puis une barre à segments, un par motif (Consultation, Vaccin, Chirurgie, Urgence, Contrôle). La liste complète des motifs s'affiche au survol et dans le libellé accessible. | La nature de l'activité, qu'aucun autre widget ne donne. Elle est calculée sur les mêmes visites que le chiffre (annulations et absences exclues), par la fonction pure `buildVisitKinds`, testée. |
| Patients suivis | Le chiffre seul | **Rien de distinct à dessiner.** Ses barres répétaient la forme des consultations, et des patients distincts ne s'additionnent pas d'un jour à l'autre. Son information propre reste en texte : le nombre de patients, sa comparaison et les nouveaux dossiers. |
| Actions à suivre | Le chiffre seul, comme avant | Ses sous-totaux se recoupent (prioritaires, vaccins, tâches) : une barre empilée mentirait. |

Les chiffres, comparaisons et lignes de détail ne changent pas.

**Corrigé en passant (Premium) :** sans graphique à côté, le chiffre de Patients suivis et celui d'Actions à suivre remontaient au-dessus de la ligne des autres. Clean fixait déjà cette ligne à 32 px ; la règle vaut maintenant pour tous les thèmes.

## Ce que montre la base réelle

Sur la période du 2 au 31 octobre, les 11 consultations sont toutes de motif « Consultation ». La barre est donc pleine, sur un seul segment : c'est la vraie répartition. L'Urgence et le Vaccin du 1er octobre sont hors période. Le recalcul en SQL sur la copie donne bien 11 « Consultation » à partir du 2 octobre.

## Portes et mesures

- `tsc` : 0. `eslint` : 0. `vitest` : 175 fichiers, 1 343 tests verts.
- Deux tests ajoutés : `buildVisitKinds`. Le test de charte vérifie désormais une seule aire, une seule répartition par motif et plus aucun mini histogramme.
- Mesures dans la page (`apres/mesures.json`), sur 4 apparences et 5 états, survols compris : aucun texte hors de sa carte, aucun chevauchement.

## Ce que les captures ne prouvent pas

- **Plusieurs motifs à la fois.** La période réelle n'en a qu'un. Le rendu multi-segments n'est vérifié que par le test et par le code, pas à l'œil.
- **Le petit format** n'a pas été capturé pour cette rangée.
- **Les autres périodes** (Aujourd'hui, 7 jours, 90 jours, 12 mois) n'ont pas été capturées. Le motif dominant y suit la période, comme le chiffre.
