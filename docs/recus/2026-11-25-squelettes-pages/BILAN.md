# Le squelette sur les listes, tableaux et fiches, 25 novembre 2026

**Où :** branche `claude/squelettes-pages`, partie de `claude/quoi-de-neuf-squelettes` (`81fe669`), dont elle reprend
le reflet et sa règle de temps. Poussée sans PR.

## 1. Le recensement

Chaque écran de lecture a été ouvert en premier écran, avec des lectures lentes (1,5 s, comme le pont SQLite de l'app
de bureau). Le banc a relevé ce que montrait la zone de contenu pendant la lecture (captures `planches/`, colonne de
gauche) :

| Écran | Pendant la lecture, avant |
|---|---|
| Patients | une roue au milieu d'une page vide, puis le tableau |
| Fiche patient | une roue au milieu d'une page vide, puis la fiche, qui grandit encore en arrivant (décalage 0,018) |
| Agenda | une grille vide, « Aucun rendez-vous » dans la carte du jour et dans la charge de la journée, puis la grille grandit de 1 750 à 1 985 px |
| Flux | « Personne en attente », « Aucune consultation en cours »… et des compteurs à 0, puis « Prévus aujourd'hui » s'insère au-dessus et pousse les colonnes (décalage 0,098) |
| Soins | « Chargement des soins… » en une ligne de texte |
| Hospitalisation | « Chargement des séjours… », et « 0 séjour actif » dans l'en-tête |
| Produits | « Chargement du catalogue… » dans un cadre étroit, « 0 référence · 0 DA en stock » dans l'en-tête, puis les péremptions s'insèrent au-dessus du tableau |
| Finances | une roue, puis le registre |
| Analyse financière | « 0 DA » partout, des graphiques vides, « Aucun encaissement sur cette période », puis la page grandit (décalage 0,202) |
| Équipe | « 0 membre » et une roue |
| Documents | « Rien ici pour l'instant », puis la liste |
| Rappels | des compteurs « En cours 0 », « À venir 0 », un encart « Rien à traiter · Aucun rappel à venir » et des zéros |
| Paramètres | le rôle « Stagiaire » affiché un instant avant « Administrateur » |

**Lecture instantanée, sans squelette :** les champs de Paramètres (le formulaire vient de la session), les onglets
déjà lus (les tables restent en mémoire après la première lecture) et tout ce qui se relit après un enregistrement.
Aucune de ces lectures ne passe par le squelette. Seule la ligne du rôle, qui attend la liste de l'équipe, en a un.

## 2. Le principe

**Le même reflet que les bandes, la même règle de temps :**
- la place est réservée tout de suite ;
- le reflet n'apparaît qu'après 150 ms ;
- une fois apparu, il reste au moins 300 ms (`useDelayedSkeleton`, du chantier précédent).

On ne tient compte que de la première lecture. Une relecture garde ce qui est affiché.

**Des hauteurs identiques : chaque liste se souvient de sa place.** Une fois ses lignes affichées, chaque liste retient,
sur cet ordinateur, ce qu'elle a montré (`useRememberedRows`) :
- le nombre de lignes et leur hauteur ;
- vide, la hauteur de son état vide ;
- pour un tableau, la largeur de chaque colonne, pour que l'en-tête ne bouge pas non plus.

Au lancement suivant, le squelette prend exactement cette place. Si les données n'ont pas changé, rien ne bouge à leur
arrivée. Si elles ont changé, seul ce qui est sous la liste se déplace, et de la différence seulement.

**Trois formes :**
- **Tableau** (`DataTable` : Patients, Produits, Finances) : le cadre, l'en-tête, la recherche et les filtres restent ; les
  lignes sont des barres de reflet ; plus de compte (« 5 dossiers »), plus de « 1–5 sur 5 », plus d'état vide.
- **Liste ou grille** (Équipe, Documents, péremptions des Produits) : les cartes ou les rangées au reflet, à la taille
  retenue.
- **Région** (`SkeletonRegion` : Soins, Hospitalisation, Flux, Rappels, Agenda, Analyse financière) : un panneau de
  rangées au reflet, de la hauteur exacte qu'avait la région ; vide la dernière fois, rien n'est réservé.
- **La fiche patient** attend toutes ses sources ensemble, dossier, rendez-vous, vaccins, poids, notes… (lues côte à côte),
  et montre en attendant son en-tête, sa bande de chiffres et son dossier au reflet. Elle arrive d'un bloc au lieu de
  grandir en trois temps.

**Les en-têtes ne disent plus « 0 » :**
- Hospitalisation dit « lecture des séjours… » ;
- Produits dit « lecture du catalogue… » ;
- Flux disait déjà « chargement des visites du jour » ;
- les compteurs des colonnes du Flux et des onglets de Rappels sont au reflet.

## 3. Les mesures, une par page

**Le banc** (`outils/pages.mjs`) : le même que pour les bandes (`outils/banc.mjs`, `outils/vite.banc.config.ts`), avec
ces réglages :
- chaque page est d'abord ouverte une fois, ce qui imite une séance précédente ;
- elle est ensuite rouverte comme premier écran, en lecture lente ;
- à chaque image, le banc relève la hauteur de chaque zone réservée (`data-skeleton-region`), les phrases d'état vide,
  le reflet visible et le décalage de mise en page.

### Lecture lente (1,5 s), après

| Page | Décalage avant | Zone : hauteur pendant / après (px) | Décalage après | Sombre : mêmes hauteurs (décalage) | Lecture rapide : reflet visible |
|---|---|---|---|---|---|
| Patients | 0 | tableau 554,1 / 554,1 | 0 | oui (0) | jamais |
| Fiche patient | 0,018 | fiche 1 596,5 / 1 596,6 | 0 | oui (0) | jamais |
| Agenda | 0 | calendrier 630 / 630 ; liste 459,4 / 459,4 ; charge du jour 664,9 / 664,9 | 0 | oui (0) | jamais |
| Flux | 0,098 | bandeau du jour 232,2 / 232,2 | 0 | oui (0) | jamais |
| Soins | 0 | liste 150,9 / 150,9 | 0 | oui (0) | 300 ms (voir plus bas) |
| Hospitalisation | 0 | séjours 159,8 / 159,8 | 0 | oui (0) | jamais |
| Produits | 0 | péremptions 97 / 97 ; catalogue 547,5 / 547,6 | 0 | oui (0) | jamais |
| Finances | 0 | registre 289,1 / 289,1 | 0 | oui (0) | jamais |
| Analyse financière | 0,202 | page 1 558,4 / 1 558,5 | 0 | oui (0) | jamais |
| Équipe | 0 | cartes 211 / 211 | 0 | oui (0) | jamais |
| Documents | 0 | liste 121,3 / 121,3 | 0 | oui (0) | jamais |
| Rappels | 0 | liste 198,1 / 198,1 | 0 | oui (0) | jamais |
| Paramètres | 0 | (ligne du rôle) | 0 | oui (0) | jamais |

- Les écarts de 0,1 px viennent de l'arrondi des sous-pixels.
- **Aucune phrase d'état vide, aucun zéro, aucune roue** n'apparaît pendant la lecture sur les 13 écrans. Seuls restent
  les libellés de lecture (« Chargement des dossiers », lus par les lecteurs d'écran).
- La bande « Rappels médicaux » de Soins faisait 234 px pendant la lecture et 232 px après. Elle garde maintenant sa
  hauteur : 232 / 232.
- Le décalage « avant » de 0 sur Patients, Finances, Équipe… ne veut pas dire qu'il n'y avait pas de saut. La roue y
  était **remplacée** par le contenu, ce qui ne compte pas comme un décalage, mais la page changeait entièrement de
  forme. Les planches le montrent.

### Lecture rapide (30 ms) : pas de reflet qui clignote

- Sur 12 écrans sur 13, le reflet ne se montre jamais.
- **Soins** enchaîne cinq lectures, soit plus de 150 ms au total. Son reflet s'y montre et reste ses 300 ms, exactement
  comme sa bande au chantier précédent.

### Premier lancement (aucune place retenue)

`releves/apres-premier-lancement.json`. La première fois, rien n'est encore retenu, et le squelette prend une place par
défaut :
- Patients 546 au lieu de 554 ;
- Finances 445 au lieu de 289 ;
- Flux 120 au lieu de 232…

Le décalage reste faible (0,01 à 0,06, contre 0,098 et 0,202 avant sur Flux et Analyse), et toujours sans valeur ni état
vide affichés. Dès la deuxième ouverture, les hauteurs sont exactes.

**Les relevés** sont dans `releves/` : avant, après en clair et en sombre, lecture rapide et premier lancement.

**Les planches** sont dans `planches/`, une par écran et par thème : avant et après, pendant la lecture et une fois les
données arrivées. Les deux images « données arrivées » sont identiques : une fois lu, rien ne change.

## 4. Ce qui change dans le code

- **`src/hooks/useRememberedRows.ts` (nouveau) :** la place retenue de chaque liste.
- **`src/components/ui/loading-skeleton.tsx` :**
  - `SkeletonShape` et `SkeletonRegion` (nouveaux) ;
  - `CardsSkeleton` importe la grille des cartes, qui n'était pas chargée sur la fiche.
- **`src/components/ui/data-table.tsx` :**
  - `loading`, `loadingRevealed`, `skeletonKey`, `skeletonFallback` ;
  - le tableau retient ses lignes et ses colonnes.
- **Les pages :** `patients-view`/`patients-table`, `patient-detail-page`, `agenda-view`/`agenda-calendar`,
  `flow-board-page`, `care-page`, `stays-page`, `stock-workspace`/`stock-view`, `finances-view`/`invoices-table`,
  `financial-analytics-page`/`premium-financial-analysis`, `Team`, `documents-library`/`NotesPro`, `Tasks`,
  `Parametres`, `medical-reminders-widget`.
- **`widget-shell.tsx` :** `skeletonClassName`, pour un squelette à hauteur exacte. Par défaut, rien ne change.

**Les comportements qui changent :**
- **Finances :** le registre ne repasse plus à la roue à chaque relecture après un enregistrement. Il garde ses lignes,
  comme la bande au chantier précédent.
- Le reste ne change ni de données ni de comportement : les filtres, la recherche et les boutons restent utilisables
  pendant la lecture.

**Les tests :** `tests/components/skeleton-pages.test.tsx`, 10 tests :
- la mémoire de la place, une liste vide, une entrée abîmée ;
- un tableau en lecture : sans compte ni état vide, autant de lignes que la dernière fois, les largeurs de colonnes,
  invisible avant 150 ms ;
- une région en lecture, vide ou lue.

## 5. Ce qui n'est pas prouvé

- **L'app de bureau n'a pas été lancée.** Le banc imite les lectures par un délai. WebKit et les vraies durées SQLite
  sont à voir en tauri dev.
- **Le pont natif est vide sur le banc.** Soins, Hospitalisation, les rappels médicaux et les factures finissent donc à
  zéro. Les hauteurs sont mesurées sur ces listes vides ou courtes, pas sur une vraie base.
- **Une place retenue ne vaut que si les données sont les mêmes.** Un autre jour, avec plus de rendez-vous, l'Agenda
  aura une autre hauteur : le squelette prend celle de la dernière fois, et la différence se voit à l'arrivée, sous la
  zone seulement.

**Pour relancer le banc :** copier `outils/` dans `banc/` à la racine du dépôt, puis lancer :
- `npx vite --config banc/vite.banc.config.ts --port 5199` ;
- `node banc/pages.mjs http://localhost:5199/ <dossier> 1500 all both 1`, où le dernier `1` ouvre chaque page une fois
  avant la mesure ;
- `python3 banc/planche-pages.py <avant> <après> <sortie>` pour les planches.
