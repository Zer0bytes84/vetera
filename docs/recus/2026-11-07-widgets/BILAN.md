# Phase widgets du tableau de bord : le graphique, puis la rangée des chiffres clés

Date : 7 novembre 2026. **Rien de cette phase n'est commité** (le dernier commit, `59d573a`, contient la session précédente). Le thème TuffUI n'a jamais été importé : tous les composants sont adaptés à nos jetons et à nos quatre thèmes. Aucune donnée de démonstration dans le code : tout est calculé sur les enregistrements de l'app.

Contrôles finaux : **193 fichiers de tests, 1536 tests, tous verts** (187 fichiers et 1450 tests au début de la phase, après l'installation de `stat-grid`) ; `tsc -b` et `eslint src tests` sans message.

## Étape 1 : le graphique

**Composants installés** (un par un, dépendances d'abord, chacun validé avant le suivant) : `motion-tokens`, `surface`, `status-pill`, `progress-bar`, `rolling-number`, `chart-card`. Aucun nouveau paquet : `motion` était déjà là, les icônes Phosphor sont remplacées par celles de lucide.

**Adaptations de `chart-card`** (toutes en options, sans changer son comportement par défaut) : deux échelles, parce que les recettes en dinars et les consultations en unités ne se lisent pas sur une seule ; un second texte dans la bulle de survol (la période précédente) ; des titres de date longs ; un emplacement pour la barre d'outils et un pour le pied ; une clé par indice, pour que deux étiquettes identiques (« 12 oct. » à un an d'écart) ne se télescopent pas ; textes en français, jamais sous 12 px.

**Couleurs et gris de Yuri, comme jetons à nous** (`tokens.css`) : `--chart-blue` `#0071e3` (sombre `#0a84ff`) et `--chart-teal` `#1a9e8c` pour les courbes ; `--card-band`, `--card-inset`, `--card-raised` pour la bande d'en-tête, le panneau et la bulle. Contrastes mesurés : courbes entre 3,19 et 5,39 pour 1 (seuil de 3 pour 1 des objets graphiques ; le sarcelle en clair est le plus juste) ; les graduations d'axe, qui sont du texte, mélangent 60 % de la couleur de la série avec l'encre et tiennent au moins 5,97 pour 1.

**Le widget** : en-tête (icône, « Recettes & activité », la période en sous-titre, la grande valeur à droite : le total des recettes de la période), vue par défaut **Courbe** (le graphique fusionné, recettes en bleu à droite, consultations en sarcelle à gauche), puis **Barres** et **Aires** sur les mêmes données, et **Répartition** : les consultations de la période par type d'acte, avec les couleurs de l'agenda (c'est le seul sens propre que j'ai donné au Donut). La légende garde les chiffres de l'ancien en-tête (recettes et consultations avec leur écart). La phrase de prévision du mois, sa barre et le lien Finances sont conservés sous le graphique, dans la carte. Le sélecteur de dates de la page et l'icône calendrier du graphique continuent de tout piloter.

**Accident trouvé en Premium** : une règle de `premium.css` retire fond, bordure et rayon à tout `div` qui contient directement un `<table>`. Le tableau d'accessibilité du graphique aplatissait le panneau dans son cadre. Il est désormais dans un `<section>`.

**Vérifié chiffre par chiffre** (équipe rouge, calcul indépendant sur les tables brutes, jour par jour) : sur 7, 30, 90 jours et 12 mois, chaque point du graphique égale le calcul indépendant et la somme des points égale le total direct ; l'en-tête, les variations et les consultations sont **identiques mot pour mot** à l'ancien widget (référence enregistrée avant de toucher au code : `avant/chiffres-avant.json`) ; Barres et Aires portent exactement les mêmes données que la Courbe ; la Répartition donne 6 consultations, comme la courbe ; une plage choisie au calendrier tombe juste ; la lecture au clavier de cinq points égale leur ligne du tableau.

## Étape 2 : la rangée des chiffres clés

**En amont, à votre demande** : le haut de la page est réduit au message d'accueil, remonté tout en haut, boutons à droite inchangés, sans date ni titre « Tableau de bord » ; le prénom est écrit en bleu (la teinte d'accent, 5,9 pour 1 en clair, 8 pour 1 en sombre). Les chiffres clés sont visibles dès l'ouverture, sans défiler.

**Quatre cartes, sur une seule rangée, à toutes les largeurs** : Trésorerie, **Rendez-vous**, **Créances**, Actions à suivre (vos changements : « Consultations » est remplacée par « Rendez-vous », et « Patients suivis » par « Créances »). Le chiffre des consultations reste dans la légende du graphique. Le doublon « Reste à recouvrer » est retiré de « Cette semaine ».

**Un seul gabarit, sur des rangées de hauteur fixe** : libellé, valeur (avec sa courbe en haut à droite), badge de pourcentage, une seule ligne courte qui ne passe jamais à la ligne, puis la barre d'objectif au pied. Aucun texte ne peut sauter de ligne ni décaler le reste.

**Badge sur chaque carte**, calculé sur les vraies données contre la période précédente : Trésorerie et Rendez-vous comme avant ; Actions à suivre contre les actions de la période précédente ; **Créances contre ce qui était dû à la fin de la période précédente**, reconstruit sur les factures et les paiements. Quand il n'y avait rien avant, un pourcentage n'existe pas : le badge dit la hausse elle-même (« +2 », « +200 DA »), jamais un pourcentage infini.

**Deux vues, dans l'en-tête du widget** : « Indicateurs » (la barre d'objectif rayée de Yuri sur chaque carte) et « Mini-graphiques » (une courbe par carte), jamais les deux à la fois ; ouverture sur les mini-graphiques, comme la rangée l'a toujours montrée.

| Carte | Objectif (vue Indicateurs) | Courbe (vue Mini-graphiques) |
| --- | --- | --- |
| Trésorerie | égaler la période précédente, plafonné à 100 %, absent sans période précédente | cumul des recettes |
| Rendez-vous | part des rendez-vous honorés, absent sans rendez-vous | rendez-vous par jour |
| Créances | part des factures réglées, absent sans facture | niveau du reste à recouvrer à chaque date, relu à rebours depuis le chiffre d'aujourd'hui (le dernier point est exactement le chiffre de la carte) |
| Actions à suivre | taux d'actions terminées (terminées sur terminées plus à suivre), **100 % quand il n'y a rien à terminer** | actions à échéance par jour |

**Mesuré** (vraies données, trois largeurs, deux vues) : libellé, valeur, badge, ligne de texte, barre et courbe tombent sur la même ordonnée d'une carte à l'autre, cartes de même hauteur, aucun libellé coupé. Dans le pire cas à 1440 px (48 honorés, 43 annulés, 43 absences, douze écritures en attente), aucune ligne n'est coupée ni ne passe à la ligne.

**Vérifié chiffre par chiffre, avant et après** (référence : `etape2-avant/chiffres-cles-avant.json`, cinq périodes) : valeurs, badges, lignes et objectifs de chaque carte, zéro écart. Trésorerie et Actions identiques à l'ancienne rangée ; Rendez-vous, objectifs et créances recalculés indépendamment sur les tables brutes. Avec deux écritures en attente de test (120 et 80 DA) : Créances = 200 DA et badge « +200 DA » sur les cinq périodes.

## Ce que l'équipe rouge a trouvé

| Attaque | Issue |
| --- | --- |
| Valeurs avant et après, une par une, cinq périodes | Zéro écart après correction de mes propres scripts (espaces insécables, unité des barres, boutons du sélecteur comptés comme cartes). |
| Gabarit à 1440, 1100 et 900 px, deux vues | Rangées alignées partout. **Sous environ 1100 px, les lignes les plus longues sont coupées par une ellipse** (jamais sur plusieurs lignes, jamais de décalage). |
| Texte long (130 rendez-vous de tous statuts, 12 écritures) | Rien de coupé à 1440 px. |
| Créances sans facture dans le navigateur | **Limite réelle** : l'app lit les factures dans la base native, pas dans le navigateur. Vérifiée par les écritures en attente (navigateur), 8 + 8 tests unitaires contre le calcul historique et contre une reconstruction à rebours, et un rendu de test avec des factures (quatre barres alignées, quatre courbes). Le vrai test des factures reste à faire dans `npm run tauri:dev`. |
| Variation minuscule (+0,03 %) | La règle de l'ancienne rangée est gardée : seule une variation exactement nulle est « stable ». |
| Un badge sans période précédente | Voir plus haut : la hausse en valeur, pas de pourcentage infini ni de `NaN` (testé sur des bases de 0 à un milliard). |
| Période « Aujourd'hui » | **Constat à trancher** : le graphique suit alors 7 jours (un jour ne dessine pas de courbe), donc la légende affiche 4 consultations, alors que l'ancienne carte affichait 3 pour la seule journée. Le chiffre « consultations du jour » n'est plus affiché nulle part ; la carte Rendez-vous donne les rendez-vous du jour. |

## Écarts avec ce qui existait, à connaître

- **Textes retirés des cartes** (votre consigne minimaliste) : « contre X la période précédente », les messages « Rien à comparer » et « Pas de période précédente comparable », la part « Dépenses » de la ligne de Trésorerie, la barre des consultations par motif (la Répartition du graphique la remplace).
- **Créances** reprend exactement le chiffre de l'ancien « Reste à recouvrer » (factures impayées plus écritures manuelles en attente) ; les nombres de factures impayées et en retard comptent les factures seules.
- La courbe de Trésorerie est mise à l'échelle entre son minimum et son maximum (celle de l'ancienne carte partait de zéro).
- Rien n'a été supprimé : les anciens composants de la rangée (`DeltaBadge`, `MiniKinds`, `MiniArea`), l'ancien graphique `FocusTrendChart` et le CSS `.kpis` restent dans le code, inutilisés.
- **Tests existants adaptés** (leur objet a changé, pas leur esprit) : un test de charte Clean (une courbe par carte, jamais la même forme deux fois) réécrit pour le Stat Grid, et deux attentes de `custom-range`.
- Un seul sélecteur de dates pilote le tableau de bord ; « Cette semaine » et la rangée « À surveiller » ne suivent pas la période (leur titre le dit).

## À faire / à décider

1. **« Aujourd'hui »** : faut-il afficher les consultations du jour quelque part (par exemple un graphique sur la journée, ou la ligne de la carte Rendez-vous) ?
2. Vérifier dans `npm run tauri:dev` les factures réelles : la carte Créances, son badge, sa barre et sa courbe.
3. Sous 1100 px de large, les lignes longues sont coupées : acceptable, ou préférez-vous un défilement horizontal de la rangée ?
4. Commiter cette phase.

## Fichiers

Nouveaux : `src/components/ui/{chart-card,progress-bar,rolling-number,stat-grid,status-pill,surface}.tsx`, `src/lib/motion-tokens.ts`, `src/modules/dashboard/components/revenue-chart-widget.tsx`, `src/modules/dashboard/model/{key-figures,revenue-chart}.ts`, `tests/components/tuffui/*` (6 fichiers), `tests/dashboard/{key-figures,key-figures-views,receivables-summary,revenue-chart,revenue-chart-widget}.test.ts(x)`.

Modifiés : `src/design-system/tokens.css`, `src/modules/dashboard/components/premium-analytics.{tsx,css}`, `src/modules/dashboard/model/premium-analytics.ts`, `src/modules/dashboard/v2/financial-model.ts`, `src/modules/dashboard/pages/dashboard-page.tsx`, `tests/dashboard/custom-range.test.ts`, `tests/theme-clean-charter.test.ts`.

## Captures

- `avant/` et `apres/` : le graphique, quatre thèmes, vues Courbe (repos et survol), Barres, Aires, Répartition.
- `etape2-avant/` : l'ancienne rangée, quatre thèmes, et ses chiffres sur cinq périodes (`chiffres-cles-avant.json`).
- `etape2-apres/` : `reel-*` (la rangée sur les vraies données, deux vues, quatre thèmes) et `test-*` (la rangée avec des factures de test : quatre barres, quatre courbes ; données de test, uniquement pour la capture).
- `rt-*.json` : les rapports bruts de l'équipe rouge. `iter/` et `etape2-iter/` : captures de travail.
