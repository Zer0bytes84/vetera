# Challenge Clean : les widgets

Date : 22 octobre 2026. Commit local, aucun push. Premium reste le thème par défaut et n'a pas bougé d'un pixel (empreintes plus bas).

Références : les trois tableaux de bord de Charles Postiaux, à savoir Disk usage, Performance dashboard et Portfolio overview. Je n'ai pas ouvert les liens X, qui demandent une connexion : je me suis fondé sur ta description de chaque référence.

## Comment Clean ajoute sans toucher Premium

Ces demandes ajoutent des éléments et des données à des composants partagés avec Premium, qui ne doit pas bouger, et aucun composant ne doit tester le thème. Je l'ai résolu par deux marques neutres, sans aucun test du thème dans le code :

- **`data-clean-only` :** un élément que seul Clean affiche. Une règle d'`index.css` le masque dans tout autre thème.
- **`data-clean-hidden` :** un élément de Premium que Clean remplace. Seul `clean.css` le masque.

**Écart assumé.** Ces éléments existent dans le DOM de Premium, masqués et sans aucune boîte à l'écran (vérifié : 0 rendu en Premium, tous rendus en Clean). L'empreinte de Premium les ignore donc, et ce qui se voit est identique au dernier commit.

## Ce qui change

### 1. Les indicateurs portent leur comparaison sous le chiffre

*Référence : Performance dashboard.* Sous chaque chiffre, la variation apparaît en pastille teintée (« +203,4 % »), puis la valeur de la période précédente en gris (« contre 8 800 DA la période précédente »). Le texte existant ne change pas : il est mis en forme. Une seule couleur porte le sens, et le signe dit la direction.

**« Cette semaine » ne répète plus les mêmes nombres.** Avec la période « 7 jours », ses « Recettes encaissées » et ses « Consultations » doublaient la Trésorerie et les Consultations de la première rangée. En Clean, la carte ne garde que ce que les indicateurs ne disent pas :
- le taux de règlement ;
- le reste à recouvrer ;
- les rendez-vous du jour.

Capture : `cote-a-cote/graphique.jpg`.

### 2. La courbe des consultations gagne la période précédente en pointillé

*Référence : Performance dashboard.* Sur « Recettes & activité », les consultations de la période précédente s'affichent en pointillé, sous la courbe en cours. Chaque point est calculé sur la même tranche, décalée d'une période.

Ajouts :
- dans la légende, une entrée « Consultations, période précédente » ;
- dans l'info-bulle, la valeur précédente.

**Écart assumé.** L'axe des consultations reste celui de la période en cours. L'intégrer à l'échelle aurait déplacé l'axe de Premium dès que la période précédente dépasse la période en cours. Dans ce cas, le pointillé s'arrête au haut du graphique, et l'info-bulle donne toujours la vraie valeur. Ce n'est pas le cas sur les données de démonstration.

### 3. La capacité d'hospitalisation en grille d'unités

*Référence : Disk usage.* Dans Soins & hospitalisation, onglet Hospitalisation, vue « Occupation », une carte ouvre la vue :
- le nombre (« 4 sur 6 places occupées ») ;
- une unité par emplacement actif : pleine si un séjour actif l'occupe, rayée si sa sortie est prévue dans les 24 h, vide si elle est libre ;
- une légende minimale.

La phrase de prévision ne s'affiche que si des sorties sont prévues : « 2 sorties prévues demain : 4 places libres sur 6 ensuite. » Elle vient des dates de sortie prévue des séjours. Les sorties déjà dépassées ne comptent pas, les emplacements désactivés non plus. Modèle pur et testé : `src/modules/hospitalizations/stays/occupancy.ts`.

**Pourquoi là et pas sur le tableau de bord.** Le widget « Hospitalisés » du tableau de bord lit encore l'ancien modèle d'hospitalisation, où la cage est un texte libre et où la notion d'emplacement actif n'existe pas. Une grille fondée dessus inventerait la capacité. La vue Occupation, elle, a les vraies données.

Capture : `cote-a-cote/occupation.jpg`.

### 4. Finances : vue d'ensemble, période dans la carte, lignes par nature

*Référence : Portfolio overview.* Sur l'analyse financière, en Clean, une carte remplace celle du graphique :
- **le sélecteur de période dans la carte :** 7 jours, 30 jours, 90 jours, 12 mois ;
- **le chiffre héros :** les encaissements de la période, avec leur variation ;
- **la courbe en aire,** la période précédente en pointillé : le même langage qu'au tableau de bord ;
- **une ligne par nature,** avec valeur et variation : Consultations, Chirurgie, Produits, Hospitalisation.

**D'où viennent les natures, sans rien inventer.** Le journal range toute la facturation sous une seule catégorie, « Billing ». Les catégories de démonstration (Consultation, Chirurgie, Vaccination) n'existent pas dans les vraies données. Les lignes sont donc lues dans les factures émises, sur des faits qu'elles portent :
- une facture de séjour (`stay-invoice:…`), c'est de l'hospitalisation ;
- une ligne liée à un produit du catalogue, c'est un produit ;
- un acte d'un rendez-vous de chirurgie, c'est de la chirurgie ;
- tout autre acte est une consultation (consultations, vaccinations, contrôles, urgences).

Le montant est celui facturé, avant avoirs, et la carte le dit en pied. La lecture est nouvelle, en lecture seule : `billingService.listIssuedInvoiceLines`, testée sur la vraie base de test. Si les factures ne peuvent pas être lues, la carte le dit au lieu d'afficher des zéros.

La carte « Origine des encaissements » (catégories du journal) reste à côté, inchangée.

Capture : `cote-a-cote/finances.jpg`. Les lignes par nature y sont alimentées par des factures de démonstration injectées pour la capture seulement : le serveur de capture n'a pas de base de facturation.

## Première rangée : une micro visualisation par nature de donnée

*Amendement, qui remplace celui sur les mini charts.* Les quatre cartes gardent leur structure : hauteurs, espacements, typographie, libellés et positions. Seule la micro visualisation change.

| Widget | Traitement | Pourquoi |
| --- | --- | --- |
| Trésorerie | Mini aire, cumul des encaissements | Une somme d'argent s'accumule sur la période. L'aire monte jusqu'au chiffre affiché, et la tendance se lit d'un coup d'œil. |
| Consultations | Mini barres, une par jour (ou par semaine, par mois) | C'est un volume par jour. Seule carte à garder les barres : il n'y en a plus qu'une dans la rangée. |
| Patients suivis | Chiffre et comparaison seulement | Des patients distincts ne s'additionnent pas d'un jour à l'autre : les barres suggéraient une somme fausse. Une répartition par espèce aurait demandé un texte que la carte n'a pas. |
| Actions à suivre | Chiffre et comparaison seulement, comme avant | Ses sous-totaux (prioritaires, vaccins, tâches) se recoupent : une barre empilée mentirait. |

- **Deux langages visuels,** aucun répété, et la valeur reste en texte dans chaque carte.
- **Pas de heatmap.** À 84 px de large, elle n'apprendrait rien sur 7 jours et serait illisible sur 12 mois : je ne l'ai pas forcée.
- **Même ligne de base.** La rangée du chiffre mesurait 26 à 31 px selon son graphique, et la carte Actions n'en avait pas. En Clean, elle est fixée à 32 px dans les quatre cartes. Les quatre chiffres et leurs comparaisons partagent maintenant la même ligne (mesuré : écart nul).

Capture : `cote-a-cote/premiere-rangee.jpg`.

## Ce que j'ai fait au-delà des références

- **La période précédente parle le même langage partout.** Le même pointillé sert au tableau de bord et aux Finances, et la même pastille de variation sert aux indicateurs, aux Finances et aux lignes par nature. Une seule grammaire de comparaison dans toute l'app.
- **La prévision de la grille d'unités dit ce qui va se libérer, et quand.** La référence Disk usage annonçait une date de remplissage. En clinique, la vraie question est quand une place se libère : c'est la donnée que portent les sorties prévues.

## Preuves

**Premium au pixel près.** Les empreintes ont été relevées avec les fichiers du dernier commit, puis avec ceux-ci :

| Écran | Premium clair | Premium sombre |
| --- | --- | --- |
| Tableau de bord | `639:324faaca` = | `638:5cb576da` = |
| Soins | `338:17d5647c` = | `337:b04da947` = |
| Finances | `342:36424e20` = | `341:ebf285ad` = |
| Analyse financière | `481:f4ab1f22` = | `480:fdee9d5` = |
| Patients | `465:a473c05` = | `464:9485aef4` = |

**Aucun comportement ni libellé cassé.**
- Les textes existants sont inchangés.
- Les éléments ajoutés portent des libellés nouveaux : la légende du pointillé, la carte de capacité, la carte des Finances.
- Les seules lectures ajoutées sont en lecture seule : les lignes des factures émises.

## Captures

1 440 × 900, Clean clair, données de démonstration.
- `cote-a-cote/` :
  - `premiere-rangee` : la première rangée, avant et après ;
  - `kpi` : la comparaison sous le chiffre ;
  - `graphique` : la courbe et « Cette semaine » ;
  - `occupation` : la grille d'unités ;
  - `finances` : la vue d'ensemble des Finances.
- `avant/` et `apres/` : les écrans en pleine taille. « Avant » est le Clean du dernier commit.

## Vérifications

- **Vitest :** 152 fichiers, 1 163 tests verts. Ceux de cette passe vérifient :
  - le modèle d'occupation (unités, sorties sous 24 h, prévision, jours nommés) ;
  - la classification et l'agrégation par nature ;
  - la lecture des lignes émises sur la base de test ;
  - la charte des widgets : les deux marques, la pastille, le pointillé, les jetons, et la première rangée (une aire, une seule série de barres visible, ligne de base à 32 px).
- **Typage :** 0 erreur. **ESLint :** 0 problème. ESLint m'a rappelé qu'une vue ne lit pas les services : la lecture des factures passe par un hook, `use-issued-invoice-lines`.
