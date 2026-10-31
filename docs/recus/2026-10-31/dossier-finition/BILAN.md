# Dossier patient : bilan de la finition visuelle

Le 31/10/2026, sur Kejounti (ID-0010, `mqh9hyyisrbmj76o52q`). Les captures ont été prises sur une copie de la base réelle (`sqlite3 .backup` en lecture seule), avec une instance debug sur le port 5181, en thème Clean, en clair puis en sombre. Le diagnostic point par point est dans `DIAGNOSTIC.md`. Les captures sont dans `avant/` et `apres/`, quatre vues par thème : haut, synthèse, chronologie et bas.

La règle suivie est : la couleur va seulement sur ce qui demande un regard, et chaque bloc tient dans une carte.

## Ce qui a changé

| Zone | Avant | Après |
| --- | --- | --- |
| Étiquettes de l'entête | Statut vert, espèce orange, sexe bleu, et un point qui palpite sans fin | Seul le statut garde sa teinte, avec un point fixe. Espèce, sexe et stérilisation sont des étiquettes grises. |
| Identité | La race tombait seule sous le propriétaire | La race et l'âge suivent le nom, puis vient le propriétaire. |
| Actions | Sept boutons collés à l'identité | Une barre à part, sous un filet. Ordre, nombre et bouton primaire inchangés. |
| Zone sécurité | Bandeau à barre gauche et « ALLERGIE » en capitales, puis traitement et contention posés hors carte | Une carte alignée sur les autres. L'allergie est une bande rouge en tête (« Allergie » en casse normale, la valeur en rouge), puis les faits en colonnes ; une absence est plus pâle qu'une valeur. |
| Repères | Deux « 0 » à l'encre pleine, courbe de poids en dégradé indigo | Les zéros en gris calme ; la courbe en trait d'encre, sans remplissage. |
| Synthèse | « ÉVALUATION » et « PLAN » en capitales, le type de visite en pastille verte, le motif en gris, la colonne Prévention vide sur 300 px | Libellés en casse normale, le type écrit en gris, le motif à l'encre en 18 px. La Prévention est un pavé teinté à la hauteur de son contenu. |
| Chronologie | Ronds bleu ciel cerclés sur chaque ligne, « ● Terminé » vert neuf fois sur dix, « Consultation » en gras sur chaque ligne, fil presque invisible | Repères neutres de 24 px dont le glyphe dit le type, et un fil visible. L'état normal (« Terminé », « Validée », « Administré », « Enregistrée ») est écrit en gris ; seules les exceptions (« Planifié »…) gardent leur pastille. Le motif ou le vaccin mène la ligne, et le type suit en gris. |
| Informations permanentes | « 4/6 » en pastille verte, bouton décalé de 16 px, écart de 8 px entre libellé et valeur | Compte en gris, bouton aligné sur sa colonne, valeur collée à son libellé. |

## Fichiers modifiés

- `src/modules/patients/medical-record.css` : les règles ci-dessus.
- `src/design-system/clean.css` : la zone sécurité entre dans la règle des cartes Clean. S'y ajoutent le filet de la barre d'actions, le zéro calme et le jeton `--medical-panel` aligné sur la carte Clean, pour que les repères de la chronologie aient le ton exact de la carte en sombre.
- `components/medical-record-summary.tsx` : étiquettes neutres, point fixe, ordre race puis propriétaire.
- `components/patient-safety-zone.tsx` : classe `is-empty` sur une absence.
- `components/patient-timeline.tsx` : drapeau `quiet` sur l'état normal, repère neutre, motif en tête.
- `components/patient-context-widgets.tsx` : classe `is-zero`.
- `scripts/eval-local-ai/capture-scenario.ts` et `capture-dossier.ts` : le scénario règle le thème demandé et restaure ensuite les réglages locaux. Il prend deux vues de plus (synthèse et bas) et relève l'encre calculée du motif, du zéro, du titre d'événement et des pièces.

Aucune fonction n'a été ajoutée, retirée ni déplacée. Les données et le schéma ne changent pas.

## Mesures

- Erreurs console : aucune, sur les quatre vues et les deux thèmes (`apres/mesures-*.json`).
- Encre calculée du motif : #292929 en clair et #ededed en sombre, contre #5d5d5d avant. La cause était la règle Clean `p:not([class*="text-"])` (`clean.css:528`), qui grise tout paragraphe sans classe `text-`. Le sélecteur du motif est désormais plus spécifique qu'elle.
- Zéro des repères : #7f7f7f, en graisse 500.
- Police mesurée : Inter Clean, celle du thème. Toutes les tailles restent dans l'échelle 12 / 13 / 14 / 16 / 18 / 24.
- Portes : `npx tsc -p tsconfig.app.json --noEmit` 0 ; `npx eslint .` 0 ; `npx vitest run` 174 fichiers, 1335 tests verts.

## Ce que les captures ne prouvent pas

- **Le cas avec traitement en cours, contention, antécédents ou rappels.** Kejounti n'en a pas. Les colonnes de la zone sécurité et la liste de Prévention remplie, en retard compris, n'ont pas été vues.
- **Le cas sans allergie.** Le texte « Aucune allergie connue » a été stylé, mais pas vu.
- **Les autres événements de la chronologie.** Notes hors visite, vaccinations, pesées et pièces sans visite n'apparaissent pas chez ce patient. Seules les consultations, dont une « Planifié », et des factures ont été vues.
- **L'aperçu patient** (panneau ouvert depuis la liste). Il réutilise `PatientIdentity`, et les étiquettes neutres y passent donc aussi, sans y avoir été capturées.
- **Les largeurs étroites** (tablette, < 1040 px, mobile). Toutes les captures sont faites à 1400 × 774 points.
- **Les états de survol et de focus.** Les captures sont au repos.
- **Le bas de chaque vue** est en partie masqué par le toast « Licence hors connexion », propre à cette copie. Le troisième repère et la fin de la colonne Prévention passent sous lui.
- **La hiérarchie Stitch v5 / Gemini v2.** Les captures sont introuvables sur ce Mac (dépôt, Téléchargements, Bureau, Documents). J'ai posé la question ; la finition suit le diagnostic et la grille Taste « écrans d'application », sans ces références.
- **Le haut de page.** Le titre « Dossier patient » (24 px) reste aussi grand que le nom du patient, car c'est l'en-tête commun à toutes les pages. Je ne l'ai pas modifié.
- **Le bouton primaire indigo en sombre.** C'est l'accent du Clean sombre, voulu par le système ; il est gardé.
- **L'instance de l'utilisateur (5180).** Elle reçoit ces styles par rechargement à chaud. Elle n'a été ni relancée ni regardée.
