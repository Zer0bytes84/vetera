# Corrections : tableau de bord et barre latérale

Date : 22 octobre 2026. Commit local, aucun push. Point de départ : les captures de ce matin.

Premium reste le thème par défaut. Une seule chose y change, et c'est voulu : le taux de règlement, qui était faux pour tous les thèmes (point 1). Tout le reste de Premium est identique au dernier commit, empreintes à l'appui.

## 1. Taux de règlement : 0 % alors que presque tout est réglé

### La cause

La carte « Cette semaine » comptait les factures dont le statut de document valait `"paid"`. Ce statut n'existe pas : un document est brouillon, émis ou annulé (`draft`, `issued`, `void`). Le paiement se lit ailleurs, dans le statut de règlement et le solde de la facture. Aucune facture n'était jamais comptée comme payée, d'où 0 % dès qu'une facture était émise.

### La correction

Le taux est maintenant la part réglée du montant facturé, sur toutes les factures émises : `settlementRate` dans `src/modules/dashboard/v2/financial-model.ts`. Il réutilise le calcul de la vue d'ensemble financière (facturé net des avoirs, solde restant). La carte et l'analyse financière lisent donc les mêmes nombres.

- Pas de facture émise : pas de taux, la carte affiche un tiret comme avant.
- Jamais 100 % tant qu'un solde reste dû (plafond à 99,9 %).

**Pourquoi le montant et pas le nombre de factures.** La carte affiche à côté le « reste à recouvrer », qui est un montant. Un taux en montant se lit avec lui : 3 000 DA restent dus sur 496 000 DA facturés. En nombre, une facture de 700 DA pèserait autant qu'une facture de 70 000 DA.

### Le recalcul indépendant, sur les vraies données

La base réelle n'a pas été touchée. J'en ai fait une copie en lecture seule (`sqlite3 … ".backup"`, ouverte en `mode=ro`), puis j'ai recalculé le taux en SQL, sans passer par le code de l'app. La requête est jointe : `taux-recalcul.sql`.

| Mesure | Valeur |
| --- | --- |
| Factures émises | 41 |
| Facturé, net des avoirs | 496 000 DA |
| Réglé | 493 000 DA |
| Reste dû | 3 000 DA, une seule facture : INV-2026-000013 (4 000 réglés sur 7 000) |
| **Taux en montant** | **99,4 %** |
| Taux en nombre, pour comparaison | 40 factures soldées sur 41, soit 97,56 % |

Le code de l'app, lancé sur la même copie (`listInvoices` puis `settlementRate`, dans un test temporaire supprimé ensuite), lit 41 factures et donne 99,4 %. Les deux calculs concordent. Aucun chiffre n'a été ajusté à la main.

**Écart nommé.** La correction est partagée : Premium affiche lui aussi le bon taux. C'est la seule différence visible de Premium dans cette passe.

Tests : trois cas dans `tests/dashboard/financial-model.test.ts` (62,5 %, plafond à 99,9 %, aucun taux sans facture émise ou après annulation, et le cas réel reproduit : 99,4 %).

Capture : `avant-apres/taux.jpg`.

## 2. La courbe de la période précédente, plus calme

Le pointillé passe à 1 px, en tirets courts et espacés (2 / 5), à 35 % d'opacité. La pastille de la légende suit. Même réglage au tableau de bord et dans la vue d'ensemble des Finances : une seule grammaire.

**Le lissage ne gonfle pas les pics : vérifié.** La courbe du tableau de bord utilise l'interpolation monotone de Fritsch-Carlson (`monotonePath`). Elle ne dépasse jamais les valeurs réelles : entre deux points, la courbe reste entre leurs deux valeurs. Le test existant `tests/dashboard/chart-path.test.ts` le prouve sur un pic : les points de contrôle restent entre la ligne de base et le sommet. Une courbe de Bézier ne sort jamais de l'enveloppe de ses points de contrôle, donc le tracé ne dépasse pas non plus. La courbe des Finances utilise le mode `monotone` de Recharts, la même méthode.

Capture : `avant-apres/pointille.jpg`.

## 3. Cartes de veille vides : compactes et discrètes

Quand « Rappels à venir » ou « Hospitalisés » n'a rien à montrer, la carte ne s'étire plus à la hauteur de sa voisine. Elle garde son titre et une ligne de texte gris, alignée à gauche, sans fond. Avec du contenu, rien ne change.

Capture : `avant-apres/veille-vide.jpg`.

## 4. La grille des places dans la carte Hospitalisés

La carte « Hospitalisés » du tableau de bord ouvre maintenant sur la grille des places : le nombre (« 4 sur 6 places occupées »), une unité par emplacement actif, la légende, la prévision de sortie. Même composant et mêmes données que la vue Occupation (`OccupancyUnits`, lu par `useStays`), en version compacte, sans carte à elle.

**Écarts nommés.**
- **Deux modèles d'hospitalisation coexistent.** La liste des hospitalisés de la carte lit encore l'ancien modèle (`hospitalizations`), la grille lit le nouveau (séjours et emplacements). Les deux peuvent donc différer tant que l'ancien modèle n'est pas migré : c'est une suite à prévoir, que je n'ai pas faite ici.
- **La vraie base n'a aucun emplacement.** Sur tes données, la grille ne s'affiche donc pas (aucun emplacement actif, rien à dessiner). La capture utilise les emplacements et séjours de démonstration injectés pour la capture seulement.
- La grille, comme dans la vue Occupation, n'existe qu'en Clean (`data-clean-only`).

Capture : `avant-apres/hospitalises.jpg`.

## 5. Paramètres > Apparence : « Barre latérale »

Un contrôle segmenté, sous « Mode » : **Automatique**, **Claire**, **Sombre**.

- **Automatique** (valeur initiale) : chaque thème garde sa barre. Premium clair donne une barre claire, Clean clair une barre sombre, les thèmes sombres une barre sombre.
- **Claire** ou **Sombre** : ton choix gagne, et il tient quand tu changes de thème.

### Comment, sans nouvelle palette

- Le choix n'agit que s'il diffère de la barre du thème. Alors seulement la racine porte `data-sidebar-tone`. En Automatique, ou si le choix rejoint le thème, rien n'est posé et la page est exactement celle d'avant.
- La barre forcée reçoit les jetons de l'autre mode du même thème. Ils sont lus sur la racine elle-même, qui prend un instant l'autre mode, dans la même tâche (rien n'est peint), puis retrouve tous ses attributs. Aucune valeur n'est recopiée à la main.
- Une barre sombre dans un thème clair prend la classe `dark`, pour que ses variantes Tailwind `dark:` et ses règles `.dark` s'appliquent comme dans le thème sombre.
- Une barre claire dans un thème sombre : les règles `.dark` de la barre et la variante `dark:` portent une garde `:where(:not([data-sidebar-tone="light"]))`. `:where` ne pèse rien en spécificité, donc la cascade des thèmes existants ne bouge pas.
- En Clean, le chrome (les bandes au-dessus et à droite de la feuille) continue la barre, comme tu l'avais demandé : avec une barre claire, il prend le cadre clair `#ededee`, dans les deux déclinaisons.

### Preuve : chaque barre forcée est la barre native de sa teinte

Empreinte de la barre latérale, pseudo-éléments compris, pour chaque thème et chaque réglage (`data-sidebar-tone` entre crochets, « – » quand rien n'est posé) :

| Thème | Automatique | Claire | Sombre |
| --- | --- | --- | --- |
| Premium clair | `642:924d392c` [–] | `642:924d392c` [–] | `642:85c4ee09` [dark] |
| Premium sombre | `642:85c4ee09` [–] | `642:924d392c` [light] | `642:85c4ee09` [–] |
| Clean clair | `642:eb60350d` [–] | `642:b34f5a7c` [light] | `642:eb60350d` [–] |
| Clean sombre | `642:749032db` [–] | `642:b34f5a7c` [light] | `642:749032db` [–] |

- Premium clair + Sombre donne exactement la barre de Premium sombre, et Premium sombre + Claire celle de Premium clair.
- En Clean, la barre Claire est identique en clair et en sombre.
- Les réglages qui rejoignent le thème ne posent rien et ne changent rien.
- Clean clair et Clean sombre en Automatique n'ont pas la même empreinte, et c'était déjà le cas avant cette passe : dans Clean sombre, la racine `.dark` change encore quelques détails non visibles de la barre (couleur des barres de défilement, entre autres). Je n'y ai pas touché.

**Écart nommé : par utilisateur, sur cet appareil.** Le réglage est rangé par identifiant d'utilisateur. Deux comptes sur le même poste ont donc chacun le leur. Mais l'app n'a pas de préférences côté serveur : le choix ne suit pas un utilisateur d'un poste à l'autre, comme le thème lui-même.

Captures : `avant-apres/parametres.jpg` et `avant-apres/barre.jpg`.

## Premium au pixel près

Empreintes de Premium, relevées avec les fichiers du dernier commit, puis avec ceux de cette passe sans le correctif du taux, puis avec tout :

| Écran | Premium clair | Premium sombre |
| --- | --- | --- |
| Tableau de bord | `639:324faaca` = = | `638:5cb576da` = = |
| Soins | `338:17d5647c` = = | `337:b04da947` = = |
| Finances | `342:36424e20` = = | `341:ebf285ad` = = |
| Analyse financière | `481:f4ab1f22` = = | `480:fdee9d5` = = |
| Patients | `465:a473c05` = = | `464:9485aef4` = = |
| Paramètres | `457:a8555978` = = | `456:8bd9ce2d` = = |

« = = » : même empreinte dans les trois relevés. L'empreinte couvre les styles calculés et les dimensions de chaque élément, pas le texte : le taux corrigé (« 99,4 % » au lieu de « 0 % ») ne la change donc pas, et c'est la planche `avant-apres/taux.jpg` qui le montre. Un relevé de l'analyse financière en sombre a raté avec les fichiers du commit (page pas encore chargée) ; il valait `480:fdee9d5` à la passe précédente, comme ici. Paramètres s'ouvre sur Profil : le nouveau contrôle, dans Apparence, est la seule addition.

## Vérifications

- **Vitest :** 153 fichiers, 1 175 tests verts. Nouveaux :
  - `tests/sidebar-tone.test.ts` : réglage par utilisateur, Automatique par défaut, teinte native de chaque thème, aucune marque en Automatique ; charte : variante `dark:` gardée, chaque règle `.dark` de la barre gardée, chaque règle Premium sombre de la barre avec sa variante forcée, blocs Clean gardés, chrome clair à `#ededee` ;
  - le taux de règlement (trois cas, dont le cas réel).
- **Deux tests existants ajustés, et pourquoi.**
  - La charte Clean cite le sélecteur de la barre : il porte maintenant la garde.
  - Le test de pureté (« aucun code ne teste le thème Clean ») signalait `src/lib/sidebar-tone.ts`, qui doit savoir quel thème donne quelle barre. C'est de l'infrastructure d'apparence, au même titre que `theme-skin.ts` et `theme-store.ts` déjà exemptés, pas une copie de composant : je l'ai ajouté à leur liste.
- **Typage :** 0 erreur. **ESLint :** 0 problème.

## Captures

1 440 × 900. Dans `avant-apres/` :
- `taux.jpg` : Premium clair, avant (0 %) et après (99,4 %), avec les montants des 41 factures réelles injectés dans le serveur de capture (montants et numéros seulement, lus sur la copie en lecture seule). Le serveur de capture n'a pas de base de facturation : sans cette injection, la carte dit « Aucune facture » avant comme après ;
- `pointille.jpg` : le pointillé, au tableau de bord et dans les Finances ;
- `veille-vide.jpg` : les cartes de veille vides ;
- `hospitalises.jpg` : la carte Hospitalisés, avant et après ;
- `parametres.jpg` : le nouveau contrôle ;
- `barre.jpg` : les quatre cas forcés, chacun à côté de son état Automatique.

**À savoir en lisant les captures.** Sur le serveur de capture, les rappels patients et les lignes de factures ne se chargent pas (pas de base SQLite) : la carte Rappels montre son message d'erreur, et « Facturé par nature » dit que les factures n'ont pas pu être lues. Sur `hospitalises.jpg`, la grille dit « 4 sur 6 places occupées » et la liste « Aucun animal hospitalisé » : seuls les séjours du nouveau modèle sont injectés. C'est exactement l'écart des deux modèles nommé au point 4.
