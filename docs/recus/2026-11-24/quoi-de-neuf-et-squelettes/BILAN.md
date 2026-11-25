# « Quoi de neuf » et squelettes des bandes de chiffres, 24 novembre 2026

**Où :** branche `claude/quoi-de-neuf-squelettes`, partie de master (`d7e8ed4`, la 5.2.0). Poussée sans PR.

**Hors de ce chantier :** la rangée « Recettes & activité », déjà faite sur `claude/project-thread-e2kpqh`.

## 1. La fenêtre « Quoi de neuf »

**Le défaut :** avec la note de la 5.2.0, la fenêtre fait 874 px de haut. Sur tout écran de moins de 906 px, elle sort par le haut et par le bas : on ne voit ni le titre ni « Compris ».

**Le correctif :**
- la fenêtre ne dépasse jamais l'écran, avec 16 px de marge en haut et en bas ;
- l'en-tête et « Compris » restent fixes, et seule la liste des nouveautés défile ;
- cette liste est atteignable au clavier, et nommée pour un lecteur d'écran ;
- à l'ouverture, le focus reste sur « Compris », comme avant : Entrée ferme toujours la fenêtre.

Les fichiers modifiés sont `whats-new.css` et `whats-new-dialog.tsx`.

**La mesure** (`outils/mesure-quoi-de-neuf.mjs`) : l'application réelle, au premier lancement après une mise à jour depuis la 5.1.1, avec la note 5.2.0 entière. Six tailles d'écran, en clair et en sombre.

| Écran | Avant : fenêtre | Avant : en-tête / Compris | Après : fenêtre | Après : en-tête / Compris | Liste (visible / totale) |
|---|---|---|---|---|---|
| 1440 × 1200 | 163 → 1037 | vus | 163 → 1037 | vus | 728 / 728 |
| 1440 × 900 | 13 → 887 | vus | 16 → 884 | vus | 722 / 728 |
| 1366 × 768 | **−53 → 821** | **hors écran** | 16 → 752 | vus | 590 / 728 |
| 1280 × 720 | **−77 → 797** | **hors écran** | 16 → 704 | vus | 542 / 728 |
| 1280 × 600 | **−137 → 737** | **hors écran** | 16 → 584 | vus | 422 / 728 |
| 1024 × 500 | **−187 → 687** | **hors écran** | 16 → 484 | vus | 322 / 728 |

- **Clair et sombre donnent les mêmes chiffres.**
- **Après le correctif, à chaque taille :** la dernière nouveauté s'atteint au clavier (Fin), et le focus d'ouverture est sur « Compris ».
- **Les relevés** sont dans `releves/quoi-de-neuf-avant.json` et `releves/quoi-de-neuf-apres.json`.
- **Les captures** sont dans `captures/quoi-de-neuf/`.

## 2. Le squelette sur toutes les bandes StatGrid

**Le principe :** chaque bande reçoit l'état « en lecture » de **ses propres sources**, c'est-à-dire tout ce qui fait ses chiffres ou ses lignes. On ne tient compte que de la première lecture, jamais d'un rafraîchissement.

**La règle commune vit dans `SectionCards` :**
- la place est réservée tout de suite ;
- le reflet apparaît après 150 ms, ce qui évite tout clignotement sur une lecture rapide ;
- une fois apparu, le reflet reste au moins 300 ms.

| Bande | Sources attendues |
|---|---|
| Tableau de bord, « À traiter » | soins, rendez-vous, patients, rappels médicaux, factures, séjours |
| Tableau de bord, « Chiffres clés » | déjà branchée en 5.2.0 (seul le maintien de 300 ms est ajouté) |
| Patients | patients, rendez-vous |
| Agenda | rendez-vous, patients, équipe (les noms) |
| Rappels | tâches, rappels de rendez-vous, rappels médicaux, rendez-vous, patients |
| Soins | soins du jour, patients |
| Hospitalisation | séjours et emplacements, patients |
| Produits | produits |
| Finances | factures (première lecture seulement, voir plus bas) |
| Équipe | équipe |

**Les lignes d'état ne mentent plus pendant la lecture.** Rappels affichait « rien à traiter » et « À traiter » affichait « aucun retard » avant toute lecture. Elles disent maintenant « Lecture des rappels… » et « lecture en cours… », comme le faisait déjà Équipe.

**Finances :**
- **Avant :** les quatre cartes affichaient « Chargement… » à la place du chiffre. Après chaque enregistrement, elles repassaient à « Chargement… » le temps de relire les factures.
- **Maintenant :** le squelette n'apparaît qu'à la première lecture. Une relecture garde les chiffres déjà affichés. Une lecture en échec dit toujours « Indisponible ».

**`SectionGarden`** passe aussi par le squelette au lieu de « … ». Ce composant n'est affiché sur aucune vue aujourd'hui, car toutes les vues qu'il couvre sont exclues dans `app-shell.tsx`.

## 3. Les mesures, une par bande

**Le banc** (`outils/banc.mjs`, `outils/lecture.mjs`, `outils/vite.banc.config.ts`) :
- l'application dans Chromium, connectée, avec ses données de démonstration ;
- un greffon de construction qui imite l'app de bureau : chaque table du store arrive après un délai fixe au lieu d'être servie d'office, et le pont SQLite natif répond après le même délai ;
- comme le pont natif est vide sur le banc, Soins, Hospitalisation, les rappels médicaux et les factures finissent à zéro ;
- chaque page est ouverte comme premier écran ;
- à chaque image (requestAnimationFrame), le banc relève ce que montre la bande : squelette ou cartes, valeurs, hauteur, décalage de mise en page.

### Lecture lente (1,5 s par lecture), après

**Sur les 10 bandes, en clair comme en sombre :**
- le squelette est visible du début à l'arrivée des chiffres ;
- **aucune valeur n'est affichée avant d'être connue** ;
- **la hauteur pendant la lecture est égale à la hauteur après** ;
- aucun décalage de mise en page ne vient des bandes.

| Bande | Hauteur pendant / après (clair) | Décalage cumulé |
|---|---|---|
| À traiter | 196 / 196 | 0,009 * |
| Chiffres clés | 264 / 264 | 0,009 * |
| Patients | 222 / 222 | 0 |
| Agenda | 222 / 222 | 0 |
| Rappels | 194 / 194 | 0 |
| Soins | 222 / 222 | 0 |
| Hospitalisation | 222 / 222 | 0 |
| Produits | 222 / 222 | 0 |
| Finances | 222 / 222 | 0 |
| Équipe | 194 / 194 | 0 |

\* 0,009 est la valeur du tableau de bord sur master aussi, sans ce chantier : ce décalage vient d'ailleurs sur la page. En sombre, on relève 194 / 194 et 262 / 262 pour ces deux bandes.

### Lecture lente, avant (master)

Le banc relève, pendant la lecture, des valeurs qui ne sont pas les vraies :

| Bande | Ce qu'elle affichait pendant la lecture | Pendant |
|---|---|---|
| Patients | 0, 0, 0, 0 (puis 5, 2, 2, 0) | 1,4 s |
| Agenda | 0, 0, « 0 min », « Aucun » (puis 3, 1, « 1 h 45 », « 10:15 ») | 1,3 s |
| Produits | « 0 DA », 0, 0, 0 (puis « 38 130 DA », 2, 2, 5) | 1,4 s |
| Équipe | 0, 0, 0, 0 (puis 3, 2, 0, 0) | 1,3 s |
| Finances | « Chargement… » × 4 | 2,9 s |
| Rappels, À traiter | des zéros et « rien à traiter » / « aucun retard » | toute la lecture |

**À savoir :** pour Rappels, Soins, Hospitalisation et « À traiter », le banc ne compte pas de « valeur fausse ». Le pont natif y est vide, donc la vraie valeur finale est elle aussi zéro. Sur une vraie base, ces zéros étaient faux, de la même façon que sur Patients.

### Lecture rapide (30 ms par lecture) : pas de reflet qui clignote

- **Sur 9 bandes sur 10, le reflet ne se montre jamais.** Les chiffres arrivent avant les 150 ms.
- **Soins** enchaîne cinq lectures, soit plus de 150 ms au total. Son reflet s'y montre donc, et reste ses 300 ms (17 images).
- **C'est la mesure qui a trouvé ce cas.** Avant le maintien de 300 ms, ce même reflet clignotait pendant 2 images : la lecture finissait juste après son apparition. Le maintien est désormais commun à toutes les bandes, Chiffres clés compris.

**Les relevés :** `releves/bandes-apres.json`, `releves/bandes-avant.json` et `releves/bandes-rapide.json`.

**Les captures** sont dans `captures/bandes/`, par page et par thème, « pendant » et « après » :
- dans `avant/`, le « pendant » montre les zéros ;
- dans `apres/`, il montre le squelette.

## 4. Les contrôles

- typecheck 0 ;
- lint `--max-warnings=0` 0 ;
- `npm test` : **2 229 / 2 229**, dont 4 nouveaux tests dans `tests/components/section-cards-loading.test.tsx` (région status nommée, aucune valeur, une forme par carte, rangée des badges identique).

## 5. Ce qui n'est pas prouvé

- **L'app de bureau n'a pas été lancée.** Le banc imite ses lectures par un délai, mais WebKit et les vraies durées SQLite sont à voir en tauri dev.
- **Le pont natif est vide sur le banc.** Les chiffres finaux de Soins, d'Hospitalisation, des rappels médicaux et des factures valent donc zéro. Le squelette et les hauteurs sont mesurés, mais pas les valeurs réelles de ces sources.

**Pour relancer le banc :** copier `outils/` dans `banc/`, à la racine du dépôt, puis lancer :
- `npx vite --config banc/vite.banc.config.ts --port 5199` ;
- `node banc/lecture.mjs http://localhost:5199/ <dossier> 1500`.
