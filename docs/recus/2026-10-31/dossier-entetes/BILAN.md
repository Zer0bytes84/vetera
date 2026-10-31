# Dossier patient : en-têtes de bloc

Le 31/10/2026, sur Kejounti (ID-0010). Seuls les en-têtes ont changé : aucun contenu n'a été déplacé, aucune fonction ni aucune couleur de statut n'a été modifiée. Les captures ont été prises sur une copie de la base réelle, en clair et en sombre. `avant/` correspond au commit 267f10f, `apres/` à ce changement. Vues : synthèse (Affections, Traitements, Rappels, Chronologie) et bas de page (Informations permanentes).

## La signature

Un composant unique, `components/record-block-heading.tsx`, se compose d'une icône de 14 px et d'un libellé :

- L'icône vient de la famille du produit (Hugeicons). Son trait est ramené à 1,25 px, et sa couleur est le gris calme à 80 %.
- Le libellé est en 13 px, graisse 500, dans le gris lisible du thème (`--medical-muted` ; `--clean-ink` en Clean) : #5d5d5d en clair, #cbcccd en sombre, valeurs mesurées dans la page. L'icône garde le gris calme, plus discret.
- L'icône est séparée du libellé par 8 px. La hauteur de ligne est de 20 px, et 12 px séparent l'en-tête du contenu, sur tous les blocs.
- Quand un bloc a un lien (« Ordonnances », « Vaccinations ») ou un compte (« 4/6 »), celui-ci reste à droite sur la même ligne, sans changer l'espacement.

| Bloc | Icône |
| --- | --- |
| Affections suivies | Heartbeat |
| Traitements en cours | Pill |
| Rappels et prévention | Bell |
| Chronologie | History |
| Identité | IdentificationBadge |
| Propriétaire | User |
| Notes générales | Notebook |
| Complétude du dossier | ListChecks |

**Nucleo n'est pas dans le projet.** Je n'ai pas ajouté de dépendance. Le trait fin de la famille d'icônes du produit donne le même rendu discret. Si tu veux les vrais glyphes Nucleo, il faut d'abord fournir le jeu d'icônes et sa licence.

Le rouge reste réservé à l'allergie. Aucun autre en-tête ne porte de couleur.

## Gris plus lisible (choix du 31/10)

Le premier passage utilisait le gris calme #7f7f7f, qui fait environ 4:1 sur blanc, sous le seuil de 4,5:1. À ta demande, les libellés passent au gris lisible : #5d5d5d sur blanc (environ 6,6:1) et #cbcccd sur le fond sombre de la carte (environ 11:1). Les captures sont dans `apres-gris-lisible/`.

## Fichiers

- Nouveau : `components/record-block-heading.tsx`.
- Modifiés : `components/patient-overview.tsx`, `components/patient-prevention.tsx`, `components/medical-record-summary.tsx` (en-tête « Propriétaire » d'`OwnerContact`), `components/patient-record-health.tsx`, `patient-detail-page.tsx`, `medical-record.css` et `design-system/clean.css`. Les règles Clean et Premium imposaient leurs propres titres ; une règle ciblée les remplace pour ces seuls en-têtes.

## Portes

- `npx tsc -p tsconfig.app.json --noEmit` : 0.
- `npx eslint .` : 0.
- `npx vitest run` : 175 fichiers, 1341 tests verts.
- Erreurs console : aucune. Défilement horizontal : aucun, dans les deux thèmes.

## Ce que les captures ne prouvent pas

- **L'aperçu patient** ouvert depuis la liste reprend l'en-tête « Propriétaire » d'`OwnerContact`. Je ne l'ai pas capturé.
- **Les largeurs étroites** n'ont pas été capturées.
- **Le toast de licence** couvre le bas de chaque vue.
