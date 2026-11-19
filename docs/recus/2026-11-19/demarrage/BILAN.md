# Démarrage : ce qui pèse dans le premier chargement du tableau de bord, 19 novembre 2026

**La demande :** le chargement traîne, et c'est le tableau de bord, le premier écran, qui rame. Mesurer d'abord ce qui pèse et proposer, avec les gains attendus ; **ne rien toucher avant la décision.**

**Ce qui a été touché :**
- **rien dans le produit ni dans master ;**
- la mesure porte sur master (`0226fdc`, la 5.1.1), dans un worktree jetable et détaché (`~/work/demarrage-wt`) ;
- le seul essai (proposition 1) a été construit dans ce worktree jetable, pour chiffrer le gain au lieu de l'estimer.

## 1. Comment c'est mesuré

**Deux constructions de production** (minifiées, React en mode production), avec la configuration de l'app :
- **le poids** se lit sur la construction réelle, telle quelle ;
- **le temps** se mesure sur une construction identique, où seul `import.meta.env.DEV` est forcé à vrai. C'est la seule façon d'ouvrir la porte de licence dans un navigateur : le banc n'a pas de clé privée pour signer une licence. Les fichiers chargés au départ font le même poids, à 1 Ko près (481 Ko compressés des deux côtés).

**Le parcours** (`outils/demarrage.mjs`) :
- Chromium, 1440 × 900, chargement à froid, données de banc masquées ;
- « prêt » = la première rangée du tableau de bord affichée (au moins trois panneaux dans leur bande, plus aucun « Chargement du module ») ;
- il relève les octets reçus avant ce moment, les tâches longues du fil principal et le temps de script ;
- **8 passes alternées par construction ;** les médianes sont données, la VM est bruyante.

## 2. Ce qui pèse

**Au démarrage, `index.html` charge 35 fichiers : 2 026 Ko bruts, 481 Ko compressés.** Avant que le tableau de bord soit prêt, le navigateur a reçu 85 fichiers et 2,4 Mo de JavaScript brut.

| Morceau | Brut | Compressé | Ce que c'est |
|---|---|---|---|
| `index` | 570 Ko | 175 Ko | le point d'entrée |
| `app-shell` | 559 Ko | n.d. | le cadre de l'app, **avec le tableau de bord** et ce qu'il entraîne (ci-dessous) |
| **`vendor-charts`** | **334 Ko** | **96 Ko** | **la bibliothèque de graphiques (recharts et sa pile)** |
| `index.css` | 683 Ko | 78 Ko | toute la feuille de styles, en un seul fichier qui bloque l'affichage |
| `database` | 140 Ko | 27 Ko | la couche SQLite |

**La trouvaille principale : `vendor-charts` est chargé avant le premier écran sans que le premier écran l'utilise.**
- Aucun graphique recharts n'est dessiné à l'ouverture du tableau de bord (mesuré : 0 surface recharts).
- Le morceau arrive par deux petits morceaux du démarrage :
  - `popupStateMapping`, les fenêtres de Base UI ;
  - `useTranslation`, l'i18n.
- Tous deux utilisent `use-sync-external-store`, qui est rangé **dans** le groupe `vendor-charts`.
- C'est moi qui l'y avais mis pour la 5.1.1, afin de casser le cycle entre morceaux qui faisait planter le dossier patient.

**Ce que contient `app-shell`** (1 292 Ko de sources avant minification, lus dans la carte des sources) :

| Source | Taille | Remarque |
|---|---|---|
| composants du tableau de bord | 139 Ko | normal sur le premier écran |
| **`@dnd-kit`** | **133 Ko** | le glisser-déposer, utilisé par `dashboard-layout-manager` (la disposition des widgets) et le tableau Flux |
| modèle du tableau de bord | 89 Ko | normal |
| **`consultations/local-ai`** | **80 Ko** | le code de l'assistant, chargé avant qu'on l'ouvre |
| `@radix-ui` | 62 Ko | |
| **`CommandPalette`** | **61 Ko** | la palette ⌘K, chargée avant qu'on l'ouvre |
| `date-fns` | 44 Ko | |
| `@heroicons` | 42 Ko | |
| `framer-motion` | 30 Ko | |
| `@hugeicons` | 30 Ko | |

**Le temps (8 passes, médianes) :**
- tableau de bord prêt à **835 ms**, premier affichage à 826 ms ;
- tâches longues avant ce moment : **252 ms** ;
- temps de script : 335 ms.

**Le plus grand affichage (LCP) vers 1,9 s n'est pas le tableau de bord :** c'est le texte des nouveautés de version qui s'ouvre par-dessus. Il n'apparaît qu'après une mise à jour.

## 3. Ce que je propose, avec les gains

**1. Sortir `use-sync-external-store` du groupe `vendor-charts`,** dans un tout petit morceau à lui (`vendor-uses`). **Mesuré sur l'essai :**

| | Avant | Après | Écart |
|---|---|---|---|
| Chargé au démarrage, compressé | 481 Ko | 386 Ko | **−95 Ko (−20 %)** |
| Chargé au démarrage, brut | 2 027 Ko | 1 695 Ko | −332 Ko |
| Tableau de bord prêt (médiane) | 835 ms | 746 ms | **−89 ms (−11 %)** |
| Tâches longues avant ce moment | 252 ms | 149 ms | **−103 ms (−40 %)** |
| Temps de script | 335 ms | 312 ms | −23 ms |

- `vendor-charts` n'importe plus aucun morceau qui l'importe en retour : **pas de cycle**.
- Les vues qui avaient planté en 5.1.0 s'ouvrent sans erreur sur l'essai : dossier patient, Soins, Hospitalisation, et Finances qui a des graphiques.
- **Coût :** une règle de construction, 6 lignes (`outils/essai-vendor-uses.diff`).
- **Risque :** c'est précisément la zone du plantage de la 5.1.0, qui ne se voyait qu'à la construction groupée. Il faut la même preuve qu'alors, sur l'app de bureau.

**2. Charger à la demande ce qu'on n'ouvre pas au démarrage :**
- la palette ⌘K (61 Ko de sources) et le code de l'assistant (80 Ko), à leur première ouverture ;
- **gain estimé, non mesuré :** 30 à 45 Ko compressés de moins au démarrage. La première ouverture de la palette ou de l'assistant prendrait alors un court chargement.

**3. Charger `@dnd-kit` seulement quand on réorganise le tableau de bord :**
- **gain estimé :** environ 25 à 30 Ko compressés ;
- à vérifier : que le tableau de bord ne l'utilise pas pour son simple affichage.

**4. La feuille de styles unique (683 Ko bruts) bloque le premier affichage.**
- La découper par page est un chantier plus lourd. Le gain sur le premier affichage n'est pas mesuré.

**5. Le ressenti : le squelette « Cards » du Loading Skeleton de Yuri** à la place des cartes du tableau de bord pendant le chargement, comme tu l'as demandé.
- Il ne réduit pas le temps ; il évite l'écran qui saute.
- Il est prévu au banc UI SDK, à essayer en plusieurs effets.

**Ordre conseillé :**
1. la proposition 1, mesurée et peu coûteuse, mais à prouver sur l'app de bureau ;
2. puis la 2 et la 3, à mesurer comme la 1 avant d'y toucher ;
3. le squelette, avec le banc UI SDK.

## 4. Ce qui n'est pas mesuré, et qui est probablement le plus lourd sur ton Mac

- **L'app de bureau n'a pas été lancée :** la VM ne peut pas construire Tauri, faute de mémoire.
- **Dans le navigateur, les données viennent d'une copie locale.** Sur le Mac, au démarrage, le tableau de bord lit SQLite par le pont natif. Plusieurs tables sont lues en entier (`SELECT *`, comme le fait chaque magasin), après les migrations et la vérification de licence.
- **Je pense, sans l'avoir mesuré, que c'est là que « ça rame » chez toi,** plus que dans le JavaScript.
- **Pour le savoir,** il faudrait des repères de temps posés dans l'app réelle (ouverture de la base, migrations, licence, chaque lecture de table, premier affichage), relevés sur ton Mac. C'est un petit ajout d'instrumentation, à faire sur ton mot, en dehors de toute optimisation.
- **Les gains ci-dessus sont ceux de Chromium sur cette VM.** Sur WebKit et sur ton Mac, les nombres seront différents, et le sens du gain devrait être le même.
