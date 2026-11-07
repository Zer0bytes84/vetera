# Phase widgets du tableau de bord : le graphique, puis la rangée des chiffres clés

Date : 7 novembre 2026. Étapes 1 et 2 commitées (`7c72611`), étape 3 (`124431d`), étape 4 et clôture de la phase 1 dans le commit suivant. Le thème TuffUI n'a jamais été importé : tous les composants sont adaptés à nos jetons et à nos quatre thèmes. Aucune donnée de démonstration dans le code : tout est calculé sur les enregistrements de l'app.

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

## Étape 3 : la rangée « Activité de la clinique » et « Cette semaine »

Deux widgets en demi-largeur, **même hauteur** (455 px mesurés, 475 px avec 70 rendez-vous de plus), alignés. Aucun thème TuffUI : `hex-density` et `radial-dots` sont adaptés à nos jetons. Corrections de votre part en cours de route : fidélité à Yuri (ses éléments, ses chiffres, ses teintes), un seul mois pour l'activité, « Par jour » par défaut pour la semaine.

**Activité de la clinique** (`src/components/ui/hex-density.tsx`) : un hexagone par jour du mois, cinq teintes du bleu d'accent (les cinq pas de Yuri, échelle en racine carrée du jour le plus chargé), contour sombre sur les jours les plus chargés, bandeau « Jour le plus chargé · 3 rendez-vous », pied « 3 jours · pic 3 » et légende Moins/Plus, infobulle au survol, flèches du clavier. Adaptations : les cellules sont données (une par jour) au lieu d'être regroupées depuis des points ; aujourd'hui a un contour plein, les jours à venir un contour pointillé ; le compteur d'en-tête est retiré à votre demande. Les vues Jour, Semaine et Trimestre sont abandonnées pour ce widget (le modèle `hex-activity.ts` les calcule toujours, testées, mais elles ne sont pas affichées).

**Cette semaine** (`src/components/ui/radial-dots.tsx`) : anneau de points, vue « Par jour » (7 secteurs) par défaut, « Par heure » (24 secteurs), le chiffre de la semaine (consultations de lundi à ce soir) au centre, légende Terminés / En cours / À venir avec leurs totaux, et ceux du secteur survolé. Adaptation de fidélité : les points sont **exacts** (un point = un rendez-vous tant que le plus chargé n'en a pas plus de 24, sinon « 1 point = N rendez-vous » est écrit sous la légende). Teintes de Yuri : bleu d'accent, encre, encre atténuée.

**Retirés de « Cette semaine » pour coller à Yuri** : recettes de la semaine et leur comparaison, taux de règlement, liste des prochains rendez-vous du jour avec son bouton Agenda. Ces chiffres restent ailleurs (Trésorerie, Créances, Agenda).

**Tableau de bord arrêté après cette rangée** (votre décision) : « Hospitalisés », « Patients par espèce », « Stock à surveiller », « Rappels à venir » et « Gestion du cabinet » ne sont plus affichés ; mesuré, plus aucun de ces textes dans la page, aucune hauteur sous la rangée. Les modules ne bougent pas, le code de ces widgets reste (`dashboard-watch.tsx`, le prop `watch` n'est plus utilisé).

**Vérifié** (équipe rouge, calcul indépendant sur les tables brutes, `rt-etape3.json`) : **221 vérifications, 0 écart**, sur les vraies données puis sur un cas dense (+70 rendez-vous) : chaque jour du mois (compte, jour courant, jours à venir), pied, teintes croissantes avec le compte, infobulle du jour le plus chargé ; chaque secteur des deux vues (centre et légende au survol), centre = total de la semaine, nombre de points, mention « 1 point = N » exactement quand le pic dépasse 24 ; mêmes hauteurs ; aucun texte sous 12 px. Référence d'avant : `etape3-avant/` (captures et textes de l'ancien widget : 5 rendez-vous sur le mois, 3 jours d'activité, 4 consultations).

**Tests** : 197 fichiers, 1575 tests verts ; `tsc -b` et `eslint src tests` sans message.

**Captures** : `etape3-apres/` (rangée, survol, vue « Par heure », quatre thèmes).

## Étape 4 : la dernière rangée, « Agenda rapide » et « Alertes »

Deux widgets en demi-largeur, **même hauteur** (447 px mesurés), alignés. Aucun thème TuffUI : `slot-picker` et `diverging-bars` sont adaptés à nos jetons.

**Agenda rapide** (`src/components/ui/slot-picker.tsx`, variante semaine de Yuri) : une colonne par jour (jour abrégé en gras, quantième dessous), une pastille par créneau, les flèches du clavier qui passent d'une case à l'autre, et, une fois un créneau choisi, une ligne qui glisse sous le panneau avec le jour, l'heure et un bouton **en pastille** « Créer le rendez-vous ». Le créneau est choisi puis confirmé : **la création du rendez-vous s'ouvre sur ce jour, cette heure et le vétérinaire libre à ce moment** (le marqueur `vetera:pending-appointment` de l'agenda porte maintenant `time` et `vetId`). Écarts avec Yuri : pas de fuseau horaire ni d'état « invitation envoyée » (la clinique n'a qu'une horloge) ; pas d'étoile « suggéré » (rien ne recommande un créneau ici) ; un jour complet garde sa colonne et dit « Complet ».
*Les créneaux sont réellement libres* : demi-heures de l'agenda (`freeSlotStarts`, la règle même de l'agenda), libres si **au moins un vétérinaire actif** n'a aucune réservation active dessus et si elles ne sont pas terminées ; un rendez-vous annulé ou manqué libère sa place ; cinq jours à partir d'aujourd'hui, six premiers créneaux par jour, total libre au pied. **Heures de la clinique** : déduites des réservations des 90 derniers jours (de l'heure où 95 % commencent à celle où 95 % finissent, dans la grille 7 h - 24 h de l'agenda) ; avec moins de dix réservations, 8 h - 18 h par défaut, et le pied l'écrit. **À confirmer** : cette règle d'heures, faute de réglage « horaires de la clinique » dans l'app.

**Alertes** (`src/components/ui/diverging-bars.tsx`) : colonnes par jour, catégories empilées au-dessus, retards **en rose sous la ligne** (un sous-ensemble de la pile, comme chez Yuri), pastilles pour masquer une catégorie, infobulle à côté de la colonne, chiffre en tête (« N alertes à traiter ») et total des retards à droite. Fenêtre : 6 jours avant, 7 jours après, plus **une colonne « Avant »** qui rassemble tout ce qui est daté plus tôt, pour que rien d'ouvert ne manque au graphique. Cinq catégories, chacune avec sa couleur (teintes de Yuri : bleu d'accent, sarcelle, violet, ocre, plus un indigo ajouté aux jetons) :
| Catégorie | Compte | En retard quand |
| --- | --- | --- |
| Rappels | rappels médicaux `en_cours`, à leur échéance (hors patients décédés) | l'échéance est passée |
| Soins | soins à faire ou en cours, à leur jour prévu | l'heure prévue est passée (règle de la vue Soins) |
| Stock | lots qui périment ce jour-là ; rupture ou sous le seuil, comptés aujourd'hui (un état, pas une date) | le lot est déjà périmé |
| Créances | factures émises avec un reste à encaisser (la règle du chiffre « Créances »), à leur échéance, **ou aujourd'hui sans échéance** | l'app les dit « en retard » |
| Rendez-vous non traités | rendez-vous terminés restés « planifié » ou « confirmé », à leur jour | tous : un rendez-vous passé sans issue est un trou (pas de consultation, pas de facture, rien dans la chronologie) |
Une source qui ne charge pas (rappels, soins) est nommée sous le graphique au lieu de compter zéro en silence.

**Vérifié** : 20 contrôles sur les vraies données du navigateur (`rt-etape4.json` : créneaux de chaque jour contre un calcul indépendant des heures, des vétérinaires et des réservations ; pied ; stock et rendez-vous non traités par jour ; ouverture du formulaire sur le bon jour, la bonne heure et le bon vétérinaire) et 16 contrôles par thème avec rappels, soins, factures et rendez-vous injectés (`rt-etape4-alertes-*.json` : chaque catégorie par jour, retards, colonne « Avant », chiffre en tête, infobulle, masquage d'une catégorie), **zéro écart**. **Limite** : rappels, soins et factures viennent de la base native ; dans le navigateur, ils ont été injectés dans mon script (jamais dans l'app) pour la vérification ; le vrai test reste `npm run tauri:dev`.

## Clôture de la phase 1

- **Bouton « + »** : le bouton flottant est supprimé, remplacé par un « + » dans l'entête, à la même place sur toutes les pages (même position sur le tableau de bord et l'agenda, aux 8 px de barre de défilement près), avec le même menu et les quatre mêmes actions. Menu de 320 px, une ligne par libellé (32 px), raccourcis dans une même colonne à droite. L'option « Masquer pendant le défilement », propre au bouton flottant, disparaît avec lui.
- **Chiffres clés** : la vue par défaut repasse sur « Indicateurs ».
- **Chiffre de l'entête d'« Alertes »** : repris au même gabarit que les grandes valeurs des autres widgets (24 px, interligne serré), masque de la roue de chiffres adouci.
- **Bordure du bas de « Recettes & activité »** : mesurée et regardée dans les quatre thèmes (`bordure/`) : rayon de 22 px, bande de contour régulière, nette.
- **Équipe rouge sur l'ensemble du tableau de bord** : chiffres clés (deux jeux de données), graphique, activité, semaine, créneaux, alertes : zéro écart.
- **Tests** : 199 fichiers, 1610 tests verts ; `tsc -b` et `eslint src tests` sans message.
- **Captures** : `tableau-de-bord-final/` (page entière, quatre thèmes), `etape4-apres/`, `menu-plus/`, `bordure/`.

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
