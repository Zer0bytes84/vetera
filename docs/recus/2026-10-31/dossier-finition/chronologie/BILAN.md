# Chronologie du dossier : correctifs

Le 31/10/2026, sur Kejounti (ID-0010). Les captures ont été prises sur une copie de la base réelle, en clair et en sombre. Les captures « avant » viennent de la passe précédente (commit 117ed1d). Les captures « après » montrent la chronologie à l'ouverture, après un « Afficher plus », puis entièrement dépliée (`chronologie-fin`). Le reste de la passe design n'a pas bougé.

## Les six points

1. **Largeur.** Chaque événement est une rangée de quatre colonnes : le repère ; puis le type et la date (168 px) ; puis le contenu (motif, conclusion, plan) ; enfin, contre le bord droit, les pièces, le statut et l'action. L'action « Note clinique » est alignée au même bord sur toutes les lignes. Sous 760 px de large, les trois blocs s'empilent sous le type.
2. **Doublon.** La visite que la synthèse montre déjà en entier (la première de `recentVisits`, la même que « Dernière consultation ») passe en format compact dans la chronologie : une ligne avec le type, la date, le motif, les pièces, le statut et l'action. Évaluation et Plan n'y sont pas répétés.
3. **Titre.** Le titre est toujours le type d'événement : Consultation, Vaccin, Pesée, Note hors visite. Au 18 octobre, « Ordonnance » était le motif saisi sur le rendez-vous. Il passe dans la colonne de contenu, sous la forme « Motif · Ordonnance ». Les ordonnances réelles restent des pièces attachées.
4. **Anciennes factures.** Une facture dont le numéro commence par « LEGACY- » s'affiche « Facture » suivie de la date de son événement. Relevé en sombre comme en clair : « Facture 1 août 2026 », « Facture 30 juil. 2026 », « Facture 25 juil. 2026 », « Facture 16 juin 2026 ». Aucune référence brute ne reste affichée. Les factures émises gardent leur numéro (INV-2026-…).
5. **Statuts.** Une consultation « Planifié » ou « Confirmé » dont la date est passée **reste dans la chronologie, mais à part**. Elle porte une pastille ambre « Planifié · date passée », et son repère est cerclé en pointillé. Elle n'affiche pas de « Compte rendu non renseigné », puisqu'elle n'a pas eu lieu. Je l'ai gardée plutôt que de la sortir de la chronologie : la sortir cacherait un rendez-vous resté sans suite, alors que c'est justement ce qu'il faut voir pour le clore ou le replanifier. Pour une visite tenue, « Compte rendu non renseigné » devient une mention de 12 px en gris calme dans la colonne de contenu, et non plus une ligne de texte courant.
6. **Pagination.** La chronologie montre 3 événements à l'ouverture, et « Afficher plus » en ajoute 3 à chaque clic. À côté du bouton, « 3 sur 13 événements » donne la position. Le regroupement par mois s'applique aux événements affichés. Le compteur repart à 3 quand on ouvre le dossier d'un autre patient. Mesures : 3 événements à l'ouverture, 6 après un clic, 13 une fois tout déplié.

## Fichiers

- `src/modules/patients/components/patient-timeline.tsx` : rangée en colonnes, `pieceDetail` (factures LEGACY), `isOverdueVisit`, `summarizedVisitId` (format compact), `TIMELINE_PAGE` et « Afficher plus ».
- `src/modules/patients/patient-detail-page.tsx` : passe `summarizedVisitId={recentVisits[0]?.id}` à la chronologie.
- `src/modules/patients/medical-record.css` : grille des événements, mention discrète, repère en pointillé, ligne « Afficher plus ».
- `tests/modules/patients/timeline-display.test.ts` : 6 tests (LEGACY, LEGACY annulée, numéros conservés, visites planifiées passées ou non, page de 3).
- `scripts/eval-local-ai/capture-dossier.ts` : prises après un « Afficher plus » puis chronologie entièrement dépliée, avec le texte de chaque pièce.

## Portes

- `npx tsc -p tsconfig.app.json --noEmit` : 0.
- `npx eslint .` : 0.
- `npx vitest run` : 175 fichiers, 1341 tests verts.
- Erreurs console pendant les captures : aucune.

## Ce que les captures ne prouvent pas

- **Le rendu étroit (< 760 px)**, où les colonnes s'empilent : il n'a pas été capturé.
- **Une note hors visite et une pièce sans visite** : il n'y en a pas chez Kejounti. Leur rangée suit la même grille, mais n'a pas été vue.
- **Le format compact quand la dernière visite a une note complète.** Ici, le 18 octobre n'a qu'un motif ; la ligne compacte montre le motif, sans conclusion.
- **Une visite « Confirmé » passée** : seul le cas « Planifié » (14 sept.) est présent. Il est couvert par les tests.
- **Ordre pesée / consultation (écart déjà présent, non corrigé).** La pesée « 02 août » (enregistrée `2026-08-02T00:00Z`) s'affiche sous la consultation du « 01 août · 21:56 » (`2026-08-02T01:56Z`). Le tri se fait sur l'instant UTC, alors que la pesée affiche sa date civile : une pesée datée à minuit UTC se classe donc au soir de la veille, à l'heure locale. C'est hors du périmètre de ces correctifs, et à traiter à part si on le veut.
- **Le toast de licence** couvre le bas de chaque vue, et la ligne « Afficher plus » sur la vue `chronologie-plus`.
