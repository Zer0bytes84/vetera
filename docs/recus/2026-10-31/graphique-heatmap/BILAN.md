# « Recettes & activité » d'après la référence, heatmap de l'activité, doublons entre widgets

Le 31/10/2026, en Vue d'ensemble. Toutes les captures viennent d'une copie de la base réelle, en lecture seule.

- **Avant :** commit a9cb5c7, dans `../graphique-recettes/avant/`.
- **Après :** `apres/`, avec trois jeux :
  - `reel-large` : données réelles, grand format ;
  - `vide-large` : la même copie, vidée de ses rendez-vous et encaissements ;
  - `reel-petit` : petit format, outils de développement ouverts à côté de la page.

Chaque jeu existe en Clean clair, Clean sombre, Premium clair et Premium sombre. Le petit format n'a pas de Premium sombre.

**Les essais abandonnés en route** (barres, ligne fine, premier « focus ») sont gardés dans `../graphique-recettes/{barres,ligne,focus}/` pour mémoire. Aucun n'est livré.

## Disposition de la page

Cartes stats → **Recettes & activité** (toute la largeur) → **Activité de la clinique | Cette semaine** (50/50, à ta demande) → À surveiller → Gestion du cabinet.

Ces rangées ne bougent pas : cartes stats, À surveiller, Patients par espèce et Gestion du cabinet gardent leur place et leur comportement. Sous 1 100 px, la rangée 50/50 passe sur une colonne. Chaque carte de la rangée réagit à sa propre largeur : la heatmap met ses chiffres sous la grille, et « Cette semaine » ne met ses faits à côté des rendez-vous du jour qu'au-delà de 900 px.

## 1. « Recettes & activité » : l'anatomie de la référence, trait par trait

| Référence (Web Analytics) | Chez nous | Statut |
| --- | --- | --- |
| Grande valeur en tête | « 37 000 DA », recettes encaissées sur la période (24 px, plafond de la charte) | fait |
| Son écart | « −6,3 % contre 39 500 DA la période précédente », même règle que la carte Trésorerie | fait |
| Onglets de série | « Recettes / Consultations », en haut à droite comme demandé ; une seule série à la fois | fait |
| Filtre de période | « 7 jours / 30 jours / 90 jours / 12 mois » dans l'en-tête, pilote le graphique seul et suit le filtre de la page quand celui-ci change | fait (point 1) |
| Trait fin monochrome | 1,5 px, couleur d'encre du thème (blanc cassé en sombre, quasi noir en clair) | fait |
| Halo | le même tracé flouté (`feGaussianBlur`), plus marqué en sombre | fait |
| Aire en dégradé | de 22 % à 0 de l'encre, sous la partie allumée | fait |
| Avant le point survolé, trait éteint | la partie déjà passée en trait fin à 42 % | fait |
| Grille pointillée | six lignes 3/4 px | fait |
| Réticule pointillé dans les deux sens | vertical et horizontal, point plein cerclé | fait |
| Étiquette sans cadre | date, valeur, puis la période précédente et l'écart, dans la bande au-dessus du tracé | fait |
| Axe réduit à droite | « 0 … 10 k », sans ligne d'axe | fait |
| Pas d'axe des dates (référence) | trois dates seulement (début, milieu, fin), et celle du jour survolé | écart assumé : sans elles, on ne sait pas quel mois on lit |
| Courbe dense, ~180 points continus | un point par jour jusqu'à 90 jours (une semaine au-delà) ; **mais nos jours sont surtout vides** | **impossible à l'identique** |

### Pourquoi la courbe ne peut pas ressembler à celle de la référence

La référence trace des visiteurs, une mesure présente chaque jour. Chez nous, l'encaissement tombe certains jours, rien les autres. Sur les 30 derniers jours de la base réelle, il y a 10 encaissements, sur 6 jours seulement (3, 4, 5, 17, 25 et 27 octobre, en heure locale) ; les 24 autres jours sont à 0 DA. Requête : `SELECT date(date), SUM(amount) FROM transactions WHERE type='income' AND status='paid' … GROUP BY 1`.

La courbe vraie est donc une suite de pics séparés de longs plats à zéro, du 6 au 16 octobre par exemple. Je ne l'ai pas lissée, ni cumulée, ni moyennée. Le dessin autour (grille, halo, aire, réticule, étiquette) suit la référence. La forme reste celle des données.

## Le sort des trois retouches

1. **Filtre de période dans l'en-tête :** fait. C'est un état propre au graphique : changer « 12 mois » dans la carte ne change pas les cartes stats. Quand le filtre de la page change, le graphique s'aligne sur lui. « Aujourd'hui » n'est pas proposé dans la carte : un seul jour ne fait pas de courbe.
2. **Bloc prévision :** redessiné dans la même encre que le graphique, sans filet de séparation et avec les mêmes marges (24 px) :
   - encaissé en encre pleine ;
   - prévision hachurée fine ;
   - mois précédent en trait pointillé, celui du réticule.

   Le bleu a disparu de la carte. En pied, la phrase dit ce que compte le graphique, et la pilule « Finances » remplace le lien de l'ancien en-tête.
3. **Une seule série :** la période précédente n'est plus tracée. Elle se lit dans l'étiquette (« 10 000 DA la période précédente · −10 000 DA ») et dans l'écart de l'en-tête. La platitude à zéro du 6 au 16 octobre reste visible.

## Corrigé en chemin (preuves)

- **Le graphique et la carte Trésorerie ne disaient pas la même somme.** L'onglet affichait 44 000 DA, la carte 37 000 DA. Le journal enregistre ses dates en UTC sans le dire (`2026-10-02 00:45:10`) :
  - la carte les lit en UTC, avec `parseDashboardDate` ;
  - le graphique les lisait en heure locale.

  Deux encaissements de 3 000 et 4 000 DA, faits le 1er octobre au soir, tombaient donc dans la période d'un côté et pas de l'autre. Le graphique lit maintenant comme la carte : 37 000 DA des deux côtés. Le SQL sur la copie, depuis le 2 octobre 04:00 UTC, donne aussi 37 000.
- **Infobulle d'une tranche de trois jours :** elle nommait seulement le premier jour. Elle donne maintenant la tranche (« Du 2 au 4 oct. 2026 ») ; cela ne sert plus que si une tranche dépasse un jour.

**Non corrigé (hors périmètre) :** la carte « Cette semaine » lit encore les dates du journal en heure locale, avec le même écart possible en début de semaine.

## 2. Heatmap « Activité de la clinique »

**Donnée :** les rendez-vous par jour local, annulations et absences exclues (la règle des unités du jour). L'agrégation est faite par des fonctions pures dans `model/dashboard-widgets.ts`, testées :
- `buildActivityHeatmap` ;
- `heatLevel` ;
- `heatLegend`.

**Paliers :** quatre, plus le jour vide. Jusqu'à 4 rendez-vous le jour le plus chargé, un palier par rendez-vous, pour qu'un jour à 1 ne ressemble jamais à un jour à 3. Au-delà, le jour le plus chargé est découpé en tranches égales. La légende « Moins → Plus » donne la plage de chaque palier au survol.

**Périodes :**

| Période | Rendu |
| --- | --- |
| Semaine | 7 cases du lundi au dimanche |
| Mois (à l'ouverture) | grille calendrier |
| Trimestre | trois mois calendrier côte à côte |
| Année | colonnes par semaine façon contribution, avec le nom du mois au-dessus de sa première semaine |

Aujourd'hui est cerclé. Les jours à venir sont en pointillé, la grammaire des unités « à venir » ; ils se remplissent s'ils ont déjà des rendez-vous.

**Infobulle :** la date longue et le nombre (« 3 rendez-vous », « Aucun rendez-vous », « Rien de prévu »).

**À côté de la grille :**
- le total ;
- les jours d'activité ;
- le jour le plus chargé ;
- le jour de semaine le plus actif.

En pied : les rendez-vous déjà prévus d'ici la fin de la période, ou la moyenne par jour d'activité, puis la pilule « Agenda ».

**Chiffres vérifiés en SQL (octobre, base réelle) :**
- 13 rendez-vous sur 7 jours d'activité ;
- le 4 octobre, avec 3 rendez-vous ;
- dimanche, avec 4 rendez-vous.

**Cas vide :** grille grise, « 0 rendez-vous », tirets à la place des repères, « Les rendez-vous apparaîtront ici dès leur prise ».

## 3. Doublons de graphisme entre widgets

| Dispositif | Où | Sort |
| --- | --- | --- |
| Barre horizontale de progression | Consultations (motifs) et Cette semaine (taux de règlement) | **Retiré de Cette semaine :** le taux est en chiffre seul. Pas d'anneau, parce que « Patients par espèce » en est déjà un. |
| Barre horizontale à segments | Consultations (motifs) et bloc prévision (encaissé / prévision) | **Signalé, laissé.** Les deux sont des barres segmentées. La prévision est maintenant monochrome et la barre des motifs garde l'accent, mais le dispositif est le même. |
| Courbe et aire des recettes | Trésorerie (mini aire du cumul) et Recettes & activité | **Signalé, laissé.** Le même argent, en cumul d'un côté et par jour de l'autre, avec une aire des deux côtés. C'est le doublon le plus net qui reste. Je propose que la mini aire de Trésorerie cède la place à autre chose (le solde net, par exemple). |
| Grille de cases | unités du jour (Cette semaine), heatmap, capacité d'hospitalisation (vue Occupation) | **Signalé.** Trois grilles de cases, mais trois sens différents : une case par rendez-vous, par jour, par place. La heatmap et les unités du jour sont maintenant côte à côte dans la même rangée. |
| Commutateur segmenté | filtre de page, filtre du graphique, filtre de la heatmap, onglets de série | **Signalé.** Ce sont des commandes, pas des graphiques. Deux filtres de période dans la même page, c'est ce que tu as demandé. |

## Portes et mesures

- `tsc` : 0. `eslint` : 0. `vitest` : 175 fichiers, 1 352 tests verts.
- Tests ajoutés :
  - la heatmap (comptage, calendrier, semaine et trimestre, année, paliers) ;
  - le test de charte, qui inclut les deux nouveaux fichiers, sans couleur en dur ;
  - le test « une seule série » sur le graphique.
- Mesures dans la page (`apres/*/mesures.json`) : 176 mesures sur 3 jeux (réel grand format, vide, petit format), états changés et survols compris, toutes vides : aucun texte hors de sa carte, aucun chevauchement.

## Ce que les captures ne prouvent pas

- **Le rendu à côté de la référence.** Je n'ai pas fait de montage côte à côte avec les images de la référence ; c'est à toi d'en juger à l'œil.
- **Une période dense.** La base n'en a pas. Le halo et l'aire n'y sont vus que sur des pics isolés.
- **Le clavier sur le graphique** (flèches gauche et droite) : codé, non capturé.
- **La heatmap avec plus de 4 rendez-vous par jour,** c'est-à-dire les tranches égales : prouvée par le test, pas à l'œil.
- **La heatmap « Année » en demi-largeur :** des cases d'environ 6 px. Elle est lisible, mais petite.
- **La console** du petit format montre des erreurs (vérification de licence en ligne, plugin SQL). Elles existaient avant ce chantier et ne viennent pas de ces widgets ; je ne les ai pas traitées.
