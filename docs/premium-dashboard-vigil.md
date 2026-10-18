# Dashboard Premium : niveau de détail Vigil

Les quatre références ont été ouvertes dans un navigateur et examinées avant toute modification. Le premier lien comportait `name=large2` ; la même image a été ouverte avec `name=large`. L’inspiration porte sur la hiérarchie, les séparateurs, la typographie numérique et les interactions, sans reprendre les widgets ni la palette Vigil.

## Périmètre

Uniquement le dashboard en style visuel Premium. Aucun changement du header, de la sidebar, des mascottes, des services de données, de la facturation ou de l’assistant. Les filtres et choix existants gardent leur comportement. Le graphique et la jauge existants sont conservés.

La couche CSS est conditionnée par `[data-visual-style="premium"]`. Les nouveaux éléments de présentation sont masqués en Classique. Les ajouts de métriques utilisent des valeurs déjà disponibles : aucun chiffre fictif, aucune nouvelle donnée sauvegardée.

## Widgets et détails appliqués

| Widget | Détails |
| --- | --- |
| Consultations | Chiffre tabulaire, hiérarchie du hero, cadence et variation monospace, filtres discrets, hairlines. |
| Encaissements | Montant tabulaire, tendance et variation monospace, hiérarchie, hairlines. |
| Patients suivis | Chiffre tabulaire, tendance et métadonnées monospace, bordures et espacements cohérents. |
| À encaisser | Montant tabulaire, pastille utile et sémantique, métadonnées monospace, bordures fines. |
| Recettes | Hero avec label dessous, filtres Période/Source séparés, bandeau de trois métriques, axes monospace, tooltip existant détaillé et anneau au survol. La légende de sous-totaux est remplacée par le bandeau en Premium. Le taux n’est plus répété près du hero. |
| Créances | Hero et jauge tabulaires, bandeau de trois catégories, hairlines verticales, compteurs monospace, catégories vides atténuées, anneau sur le groupe survolé ou focalisé au clavier. |
| Points d’attention | Nombre de points à vérifier issu des rappels vaccinaux, soldes à recouvrer et urgences déjà calculés. Lignes cliquables et contours de survol, séparateurs fins. Le total reste indisponible si les soldes le sont. |
| Patients du jour | Hero central, bandeau de trois compteurs chiens/chats/autres, hairlines verticales, donut vide atténué. |
| Agenda du jour | Heures monospace, statuts sémantiques, contour au survol, bandeau prévues/terminées/en conflit avec les données du jour. |
| Encaissements et dépenses | Montants tabulaires, axes et légende monospace, surfaces et diviseurs harmonisés. |
| Affluence des rendez-vous | Hero tabulaire, heures monospace, anneau sur la case survolée/focalisée/sélectionnée, détail du créneau existant conservé. |
| Répartition des actes | Chiffre principal, pourcentages et compteurs tabulaires, métadonnées et séparateurs cohérents. |
| Activité du cabinet | Hero tabulaire, toggles période et mesure avec pill coulissante, axes monospace, bandeau moyenne/jours actifs/jours observés. Animation désactivée avec la préférence de mouvement réduit. |

Tous les chiffres du dashboard héritent de `tabular-nums`. Le texte courant conserve la police du design system. Les indicateurs de chargement existants restent accessibles ; le traitement pointillé reflète un chargement réel. Aucun pourcentage de progression artificiel ni faux état « connecté » n’a été ajouté.

## Vérifications

- `npm run typecheck` : 0 erreur.
- `npm run lint -- --max-warnings=0` : 0 erreur, 0 avertissement.
- `npm run test` : **565 tests réussis, 72 fichiers**. Le script exclut le test du serveur d’activation comme auparavant.
- `npm run build:strict` : typecheck et build frontend réussis. Vite signale les avertissements de découpage de bundles/imports déjà présents ; aucun échec du build.
- Navigateur : 13 widgets capturés en clair et sombre, aucune erreur de rendu.
- Vérification des styles calculés : chiffres `tabular-nums`, axes monospace, hairline clair `rgb(238, 238, 236)`.
- Interactions : changement période/mesure, tooltip recettes, créances souris/clavier, sélection de la carte thermique.
- Classique vérifié : les nouveaux éléments restent masqués et les filtres conservent leur rendu. La comparaison du widget Recettes avec la capture Classique originale, alignée sur sa position, donne **0 pixel différent**. Les captures globales peuvent présenter un décalage de défilement entre les prises ; elles ne sont pas une comparaison pixel à pixel de toute la page.

Les captures utilisent les données réelles de la base locale en lecture seule (10 patients, 49 rendez-vous, 57 transactions, 43 factures émises). Les services du navigateur de vérification sont alimentés par cet instantané ; aucune écriture dans la base de l’application.

## Captures

Galerie avant/après, par widget, avec comparaisons clair/sombre :

[Ouvrir la galerie](/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/vigil-premium/index.html)

Les captures 1 à 9 ont été prises avant les modifications. Les vues analytiques 10 à 13 ont été capturées avec leur style antérieur dans le navigateur de référence. Les images après et les interactions proviennent du code final.
