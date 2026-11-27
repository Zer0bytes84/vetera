# Exploration Rust : quelles parties de Baitari méritent de passer sous Rust ?

Reçu du 26 novembre 2026, copie `rust-wt`, branche `exploration/rust-2026-11-26`, partie de `master` f4f000c5 (5.3.1).
Aucun code produit n'a été modifié. Ce dossier contient la proposition, les mesures brutes (`mesures/`) et les scripts qui les reproduisent (`outils/`).

## En bref

- **L'intuition d'un « gain énorme » est juste, mais à deux endroits seulement** : la recherche dans les dossiers et le moteur d'IA de la recherche (embeddings). Ailleurs, Rust n'apporte rien de mesurable, et sur les petits calculs il ralentirait.
- **Le vrai coupable n'est pas le langage, c'est la frontière.** Dans la vraie fenêtre Tauri, sur une clinique synthétique de 1 000 patients, une recherche « tous patients » prend **22,6 s**. Plus de la moitié de ce temps sert à faire passer 148 Mo de vecteurs, écrits en texte hexadécimal, de Rust vers la page. Garder les vecteurs côté Rust ramène le calcul à **14 ms**.
- **Un portage mal découpé ne gagne rien.** Rapatrier les mêmes vecteurs en une seule requête au lieu de 1 012 coûte encore **11,3 s**. Et une facture porte sur des calculs de 0,25 µs par ligne, quand un seul appel IPC coûte 1,1 ms : la porter en Rust la rendrait environ 4 000 fois plus lente.
- **Deux gains comparables ne demandent pas de Rust du tout** : ouvrir un gros dossier en ne lisant que ce patient (2,7 s ramenées à 59 ms), et la recherche par mots via FTS5, déjà présent dans le SQLite embarqué (7,1 s ramenées à environ 0,1 s).
- **Recommandation** : si on y va, le premier chantier Rust est **la recherche sémantique native**, avec un prototype d'environ 3 jours. Il est décrit à la fin, avec des critères de réussite et d'abandon. Le second, plus lourd, est **le moteur d'embeddings natif** : 4 à 5 fois plus rapide à fils égaux, et environ 2 Go de mémoire en moins sur un Mac de 8 Go.

## 1. Conditions de mesure, et ce qu'elles ne disent pas

- Machine : la VM Linux arm64 (6 cœurs, 3,3 Go, hôte Apple M1 8 Go). Les chiffres absolus seront meilleurs sur le Mac ; ce sont les **rapports** (avant/après, web/natif) qui portent la décision.
- Données : la base de test n'a que 11 patients. J'ai donc généré une **clinique synthétique** (`outils/gen-clinique.py`, à partir d'une copie de la base de test) : 1 000 patients, 5 195 consultations avec leur SOAP, 20 780 extraits indexés par génération de recherche, et un patient « gros dossier » de 200 consultations. La base de test elle-même n'a pas été modifiée (lecture seule, `VACUUM INTO`).
- Vraie app : les mesures IPC ont été prises **dans la vraie fenêtre Tauri** (WebKitGTK, tauri-plugin-sql), avec le pilote de test. J'ai utilisé le binaire **debug** déjà compilé dans `erreurs2-wt`, lancé tel quel ; son `main.rs` et sa version de tauri-plugin-sql sont identiques à ceux de master. Il était isolé : HOME et dossiers XDG à part, base synthétique, cache Vite hors du `node_modules` partagé, limite mémoire. Un binaire debug sérialise plus lentement qu'un binaire release : **les coûts IPC mesurés sont des bornes hautes**.
- Moteurs d'IA : mêmes fichiers ONNX que ceux installés sur le Mac, lus sans y écrire. Le moteur web est onnxruntime-web (WASM), celui de la webview ; le natif est onnxruntime-node, le moteur qu'un portage Rust appellerait via le crate `ort`.
- **Non mesuré ici** : WKWebView sur Mac et WebView2 sous Windows, le build release, WebGPU (la VM n'a pas de GPU, donc ni EmbeddingGemma 2 ni Gemma en génération), la taille réelle de vos plus grosses cliniques. Pour Gemma, je reprends les mesures M1 du 22 octobre (`docs/recus/2026-10-22/plan-assistant-gemma4/mesures/`).
- Builds : un seul `vite build` (9,6 s, 1,5 Go de pic, sortie dans `~/work`). Aucun `cargo build`. Un `rustc -O` d'un fichier de 40 lignes, sans dépendance (0,7 s, 127 Mo), pour la borne native de la recherche.

## 2. Cartographie de l'existant

### Déjà en Rust (`src-tauri`, 3 834 lignes)

| Module | Rôle | Lignes |
|---|---|---|
| `clinic_database.rs` | Ouvre la base `baitari.db` (sqlx, WAL, une connexion) pour tauri-plugin-sql | 126 |
| `clinic_network/` | Mode réseau de la clinique : hôte axum, découverte mDNS, exécution SQL à distance | 1 640 |
| `dictation.rs` | Dictée native : PCM vers WAV, puis compagnon `whisper-cli` (whisper.cpp large-v3-turbo q8). **Mac seulement** | 462 |
| `local_ai_download.rs`, `local_ai_models.rs` | Téléchargement, validation et import des modèles d'IA locaux | 1 396 |
| `license_installation.rs` | Identifiant d'installation pour la licence | 36 |
| `main.rs` | Greffons (sql, dialog, fs, process, shell, updater), 25 commandes | 171 |

Rust ne fait aujourd'hui **aucun calcul métier**. Il ouvre la base, transporte le SQL, gère les fichiers des modèles et lance whisper.cpp.

### En TypeScript (163 600 lignes, 543 fichiers source)

- **Données** : chaque écran lit des **tables entières** (`useSQLite("appointments")` fait `SELECT * FROM appointments`), puis filtre en JavaScript. La fiche patient en monte une douzaine (patients, propriétaires, rendez-vous, SOAP, notes, poids, ordonnances…).
- **IA locale** (`modules/consultations/local-ai`, 6 000 lignes, et ses workers) : embeddings par transformers.js et onnxruntime-web. EmbeddingGemma v1 tourne en **fp32 WASM sur 1 seul fil** (`embedding.worker.ts:98`), et c'est la génération de recherche par défaut. Génération SOAP par MediaPipe (Gemma 3/4, WebGPU). Whisper WASM en secours de la dictée native.
- **Recherche** : la recherche sémantique « tous patients » fait **une requête par patient** et lit chaque vecteur en hexadécimal (`embedding-store.ts:416`, `:852`). La recherche par mots passe tous les textes indexés dans `matchesSearchTerms` (le lexique vétérinaire).
- **PDF** : jsPDF et pdf-lib (dossier patient, factures, bons de commande, carnet de santé), pdf.js pour la lecture, Tesseract WASM pour l'OCR.
- **Facturation et stock** : arithmétique entière en centimes (`domain/billing`), orchestration SQL dans `billingService.ts` et `lot-store.ts`.

### Ce qu'en dit rust-anything (`analyze`)

151 unités : 68 « à garder » (interface, React), 67 prêtes, 14 « avec précaution », 2 bloquées. Les « par où commencer » qu'il propose (`consultations/lib`, `finances/lib`, `agenda/model`, `domain/billing`…) sont des petites bibliothèques pures, faciles à porter, mais **sans aucun gain de vitesse** (voir le point 3.6). L'unité qui compte, `local-ai`, est classée « avec précaution » : 55 décalages de chaînes, 12 syntaxes d'expressions régulières et 7 expressions régulières dynamiques, qu'il faudrait reproduire à l'identique. Une limite structurelle aussi : ses ponts sont napi (Node) ou wasm-bindgen. Dans une app Tauri, un portage en WASM tournerait **dans la webview, à vitesse WASM**. Le seul pont qui apporte la vitesse native est une commande Tauri, que l'outil ne génère pas. J'ai donc gardé de rust-anything l'analyse, le profil et, pour la suite, sa méthode de preuve (enregistrer le comportement de la fonction TS, puis comparer le portage) ; pas ses ponts. Résumé dans `mesures/analyze-rust-anything-src.json`.

## 3. Mesures

### 3.1 La frontière IPC Tauri (vraie fenêtre, binaire debug)

| Opération | Temps |
|---|---|
| Appel vide d'une commande Rust (`greet`) | **1,1 ms** par appel |
| `SELECT 1` par tauri-plugin-sql | 1,2 ms par appel |
| 20 780 vecteurs (125 Mo en hexadécimal) en **une** requête | **11,3 s** |
| Les mêmes données sérialisées puis relues en JSON dans Node (sans IPC) | ≈ 0,5 s |

Trois règles en découlent, et elles décident de tout le classement :
1. **Ne jamais faire traverser de gros volumes.** Un débit d'environ 11 Mo/s (borne debug) fait de toute donnée volumineuse un coût en secondes.
2. **Un appel par geste de l'utilisateur, pas un par élément.** 1 ms par appel, c'est négligeable une fois, mais ça devient une seconde sur mille patients.
3. **Ne porter que ce qui fait beaucoup de travail par appel.** En dessous d'environ 1 ms de calcul, l'aller-retour coûte plus que ce qu'on gagne.

### 3.2 Recherche dans les dossiers (clinique de 1 000 patients)

| Recherche | Chemin | Temps |
|---|---|---|
| Sémantique, tous patients | **App actuelle dans Tauri** | **22,6 s** (dont SQL + IPC 12,3 s, décodage hex 4,1 s, classement 6,2 s) |
| | Même code dans Node (sans IPC réel) | 10,1 s à chaud, 15,7 s à froid |
| | Une requête, vecteurs binaires, calcul typé, en JS | 0,27 à 0,55 s |
| | **Rust natif, vecteurs gardés en mémoire** | **14 ms** par requête (+ 0,36 s une fois pour les lire depuis SQLite) |
| Par mots, tous patients | App actuelle dans Tauri | **7,1 s** (IPC 1,3 s, lexique 5,8 s) |
| | **FTS5 dans le SQLite embarqué** (table temporaire) | **76 à 126 ms** par requête, index construit en 1,3 s |

Pour le vétérinaire : aujourd'hui, une recherche dans toute la clinique se compte en dizaines de secondes dès quelques centaines de patients, et elle grandit avec chaque consultation indexée. Native, elle devient instantanée.

### 3.3 Ouverture d'un gros dossier

| Lecture | Temps dans Tauri |
|---|---|
| Les 7 tables entières que montent les écrans (17 700 lignes, 24,7 Mo) | **2,7 s** (dont `consultation_soaps` seule : 1,6 s pour 16,8 Mo) |
| Le même patient lu avec `WHERE patient_id = ?` (400 lignes) | **59 ms** |

Le cache des tables amortit la deuxième ouverture, mais la première ouverture et chaque écriture dans la table (qui invalide le cache) repaient ce coût, qui croît avec la clinique entière, pas avec le dossier. **Ce n'est pas un problème de langage** : une commande Rust qui renverrait les tables entières serait aussi lente. Le remède est de lire par patient, et il se fait en TypeScript.

### 3.4 IA locale : moteur web contre moteur natif

Même fichier ONNX, même machine. Médianes ; détail dans `mesures/embeddings-et-encodeurs.json`.

| Modèle | Fils | Web (WASM) | Natif | Rapport |
|---|---|---|---|---|
| Encodeur Whisper base (30 s d'audio) | 1 | 2 509 ms | 664 ms | ×3,8 |
| | 4 | 726 ms | 211 ms | ×3,4 |
| Encodeur Whisper medium q8 (celui de l'app) | 1 | 32,1 s | 6,7 s | ×4,8 |
| | 4 | 9,1 s | 2,2 s | ×4,2 |
| EmbeddingGemma fp32 (recherche par défaut), extrait de 176 jetons | 1 | ne tient pas en mémoire ici | 546 ms | |
| | 4 | (l'app n'utilise qu'1 fil) | **160 ms** | |
| arctic-embed-l-v2 q8 | 4 | dépasse 2 Go au chargement, arrêté | 173 ms | |

- Le natif est **4 à 5 fois plus rapide à nombre de fils égal**, et il peut en utiliser plusieurs. La recherche par défaut tourne sur un fil en WASM : on peut en attendre environ **×13 à ×16** sur l'embedding (estimation à partir des rapports ci-dessus). Sur le M1, le 22 octobre : 904 ms par extrait en WASM ; on peut viser de l'ordre de 60 à 70 ms en natif.
- **Mémoire** : le 22 octobre, l'embedding WASM fp32 montait à **3 Go de surcoût** sur le Mac de 8 Go ; le même modèle en natif occupe ici 0,8 Go en tout. Le moteur web copie les poids dans le tas WASM, d'où les arrêts observés ici. C'est un **gain de fiabilité** autant que de vitesse.
- EmbeddingGemma 2 q8 ne se charge pas en WASM (opérateur absent, d'où le WebGPU dans l'app), ni dans onnxruntime 1.21 natif. Il faut onnxruntime ≥ 1.22 : à vérifier lors du choix de la version du crate `ort`.
- **Dictée** : elle est déjà native sur Mac (whisper.cpp). Le WASM ne sert qu'en secours, notamment sous Windows. Le gain là-bas (×4 à ×5 mesuré) viendrait d'empaqueter whisper.cpp pour Windows. C'est un travail d'empaquetage, le Rust existe déjà.
- **Génération SOAP** (Gemma 4 E2B, mesures M1 du 22 octobre) : déjà sur GPU (WebGPU), 30 jetons/s, environ 12 s par SOAP à chaud, mais 21 s de rechargement à froid et 3 Go de surcoût mémoire. Un moteur natif Metal (llama.cpp ou équivalent) gagnerait peut-être ×1,5 à ×2, et surtout de la mémoire, au prix d'un autre format de modèle et d'une requalification complète des SOAP. Non mesuré ici, faute de GPU.

### 3.5 PDF

| Document | Temps |
|---|---|
| Dossier patient, 10 consultations | 150 à 165 ms |
| Dossier patient, 200 consultations (326 ko) | **1,4 à 1,9 s** |
| Dossier + pièce jointe de 40 pages | 0,9 à 1,1 s |
| Facture, 1 ligne / 60 lignes | 2 à 4 ms / 9 à 10 ms |

Un export de gros dossier prend moins de 2 s, et c'est un geste rare, accompagné d'une barre de progression. Un moteur PDF en Rust irait sans doute bien plus vite, mais le vétérinaire le sentirait à peine, et il faudrait refaire toute la mise en page au pixel près.

### 3.6 Factures et stock

- `calculateLineAmounts` + `sumBillingLines` : **0,25 µs par ligne** (200 000 lignes en 51 ms).
- rust-anything `profile` désigne mécaniquement `calculateLineAmounts` comme « à porter ». Mais son banc compte un pont napi, pas l'IPC Tauri : à 1,1 ms par appel, un calcul de 0,25 µs **coûterait environ 4 400 fois plus cher** une fois passé en Rust. Le stock relève du même constat : de l'orchestration SQL, pas du calcul.

### 3.7 Démarrage et poids

| Mesure | Valeur |
|---|---|
| JavaScript chargé au démarrage | 925 ko (283 ko gzip, budget 300 ko), 33 morceaux |
| CSS au démarrage | 678 ko (80 ko gzip) |
| Chromium, build de production : premier affichage (FCP) | 604 ms médian ; scripts 77 ms |
| `dist` complet | 251 Mo, dont 192 Mo de moteurs d'IA (`local-ai-runtime`) |

Le démarrage ne se joue pas dans le JavaScript (77 ms de scripts), et Rust ne peut pas accélérer l'analyse du code par la webview : rien à porter ici. Une trouvaille en passant, hors sujet Rust : `assets/` contient deux moteurs ONNX WASM (21,6 Mo et 26,9 Mo) **en double** de ceux de `local-ai-runtime/`, soit environ 48 Mo à vérifier dans l'installateur.

## 4. Classement des candidats

| # | Candidat | Gain pour le vétérinaire | Effort | Risque | Frontière IPC | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Recherche sémantique native** (index vectoriel en Rust) | La recherche « tous patients » passe de 20 s ou plus à une réponse instantanée, et reste rapide quand la clinique grossit | Prototype 3 jours ; production 1 à 2 semaines | Faible à moyen : ordre des résultats à garantir, invalidation de l'index, mode réseau | **Favorable** : la question entre, quelques identifiants sortent | **Oui, en premier** |
| 2 | **Embeddings natifs** (`ort` + `tokenizers`) | Indexation et recherche environ 10 fois plus rapides ; environ 2 Go de RAM en moins sur un Mac de 8 Go, donc moins de ralentissements et de plantages | 3 à 4 semaines | Moyen : vecteurs identiques ou réindexation complète, bibliothèque onnxruntime à empaqueter et signer par plateforme | Favorable : le texte entre, le vecteur va droit dans SQLite | **Oui, en second** |
| 3 | Gros dossiers : lecture par patient | Ouverture de fiche 2,7 s ramenée à 0,06 s sur 1 000 patients | 1 à 2 semaines | Faible | Sans objet | **À faire, mais pas en Rust** |
| 4 | Recherche par mots : FTS5 | 7 s ramenées à environ 0,1 s | 1 semaine | Moyen : le lexique vétérinaire (racines, DCI et marques) doit devenir une expansion de la requête | Favorable | **À faire, pas en Rust** ; porter le lexique serait risqué (expressions régulières Unicode) |
| 5 | Dictée native sous Windows | ×4 à ×5 sur la transcription | 1 à 2 semaines d'empaquetage | Moyen | Déjà résolu (PCM en base64, une fois) | Plus tard, si Windows compte |
| 6 | Génération SOAP native (Metal) | ×1,5 à ×2 estimé, moins de mémoire | 1 à 2 mois | **Élevé** : autre format, qualité à requalifier | Favorable | Plus tard, après le 2 |
| 7 | PDF en Rust | 1,9 s ramenées à environ 0,2 s, sur un geste rare | 3 à 6 semaines | Élevé (rendu) | Neutre | **Non** pour l'instant |
| 8 | Factures, stock, petites bibliothèques | Aucun | Faible | Faible | **Défavorable** (×4 400 plus cher) | **Non : ce serait plus lent** |
| 9 | Démarrage | Aucun | | | | **Non** |
| 10 | Réécriture complète en Rust | Rien de plus que 1 et 2 sur ce qui se sent | Des mois | Très élevé | | **Non** |

## 5. Recommandation

### Si on y va : le premier chantier

**La recherche sémantique native.** C'est là que l'écart est le plus grand (22,6 s contre une réponse en dizaines de millisecondes), que le découpage respecte la frontière (une question entre, une poignée d'identifiants sort), et que le risque se contrôle : le classement final peut rester celui du TypeScript actuel, à l'identique.

Le second chantier, une fois le premier prouvé, est **le moteur d'embeddings natif**. Il réutilise la même commande et les mêmes vecteurs, et règle le problème de mémoire.

En parallèle, sans Rust et pour un gain du même ordre : la lecture par patient pour les gros dossiers, et FTS5 pour la recherche par mots. Je le dis franchement : si une seule chose devait être faite cette semaine, la lecture par patient est celle qui se sent le plus souvent.

### Le prototype minimal qui prouverait le gain

**Une seule commande Tauri**, `recherche_vecteurs`, ajoutée à `src-tauri` derrière un interrupteur :

1. **Entrée** : la clé du modèle, le vecteur de la question (calculé comme aujourd'hui), les filtres (types de source, sections) et le seuil le plus bas du calibrage (`lexicalFloor`).
2. **Côté Rust** : lecture des vecteurs par le pool sqlx déjà ouvert (`DbInstances`), une seule fois, gardés en mémoire en `f32` (64 Mo pour 20 780 extraits). L'index est invalidé quand `count(*)` ou `max(updated_at)` de `embeddings` change. Produit scalaire, puis toutes les lignes au-dessus du seuil bas.
3. **Sortie** : identifiants et scores seulement (quelques ko).
4. **Côté TypeScript** : une requête pour les textes de ces seules lignes, puis `rankPassages` **inchangé**. Les bonus lexicaux, les contraintes numériques et le meilleur extrait par source restent exactement ceux d'aujourd'hui. Seul le cosinus change de côté.

**Preuve d'égalité** : enregistrer, sur la clinique synthétique, les cinq premiers résultats du chemin actuel pour 200 questions (la méthode `record`/`diff` de rust-anything, avec ses propres cas), et exiger les mêmes cinq, dans le même ordre, avec un écart de score au plus de 1e-6.

**Mesure** : les scripts de ce dossier (`gen-clinique.py` à 1 000 et 3 000 patients, `ipc-dans-tauri.js` adapté), dans l'app **release sur le Mac**.

**Critères** :
- Réussite : la recherche à chaud reste sous 100 ms et le premier appel sous 1 s à 1 000 patients ; au plus 100 Mo de mémoire en plus ; mêmes résultats sur les 200 questions.
- Abandon : la recherche à chaud dépasse 300 ms, ou les résultats diffèrent sans explication.

**Points à trancher avant** :
- Le mode réseau de la clinique : un poste client passe aujourd'hui par `clinic_network_select`. La commande doit s'exécuter sur l'hôte, ou le client retombe sur le chemin actuel.
- La mémoire au-delà de 100 000 extraits (300 Mo en `f32`) : passer en `f16`, ou relire sans garder en mémoire (0,36 s par recherche).

**Build** : le prototype demande un `cargo build` de `src-tauri`, lourd pour cette VM. Je propose de le faire sur le Mac, ou ici sur ton accord explicite, toute autre app fermée.

### Ce qu'il me faut de toi pour affiner

1. La taille de ta plus grosse clinique réelle : patients, consultations, SOAP indexés. Mes chiffres sont pris à 1 000 patients ; tout ce qui est « tous patients » grandit en proportion.
2. La génération de recherche réellement active sur les postes (par défaut `passages`, EmbeddingGemma v1 fp32 WASM).
3. La place de Windows dans tes priorités (dictée native, WebView2).

## Annexes

- `mesures/` : sorties brutes (`tauri-ipc.json`, `tauri-fts5.json`, `donnees-node.json`, `embeddings-et-encodeurs.json`, `pdf.json`, `vecteurs-natifs.txt`, `factures.txt`, `profil-rust-anything-factures.json`, `analyze-rust-anything-src.json`, `vite-build.txt`).
- `outils/` :
  - `gen-clinique.py` : clinique synthétique.
  - `bench-donnees.mjs` : chemins de données avec les vraies fonctions TS, via `alias-loader.mjs`.
  - `ipc-dans-tauri.js` et `fts5-dans-tauri.js` : scripts pour le pilote de test, à lancer avec `serveur-dev-mesure.mjs`.
  - `bench-embeddings.mjs` et `bench-onnx-encoder.mjs` : moteur web contre moteur natif.
  - `bench-pdf.banc.ts` : à lancer avec `vitest.banc.config.ts` ; il reste hors de `npm test`.
  - `demarrage-chromium.mjs` : démarrage du build de production.
  - `charge-factures.mjs` : charge de calcul des factures.
  - `vecteurs-natifs.rs` : borne native de la recherche.
- Les gros fichiers (bases synthétiques de 270 Mo, `dist`, vecteurs) sont restés dans `~/work/mesures-rust-2026-11-26/`, hors du dépôt.
- Le `node_modules` de cette copie est un lien vers celui de `publish-wt` (même `package-lock.json`). Ni build ni serveur n'y a écrit : le cache Vite était redirigé, et `--configLoader runner` évite le dossier temporaire. Le dossier `graphify-out` que tu as ajouté n'est pas commité.
