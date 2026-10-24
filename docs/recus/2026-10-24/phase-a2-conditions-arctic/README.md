# Phase A2 : les trois conditions avant la bascule sur arctic (24 octobre 2026)

Point de départ :
- verdict du comparatif validé : arctic-embed-l-v2 q8, tronqué à 768, est le modèle cible ;
- recherche active sur la v1 ;
- seuil arctic à 0,13 (fenêtre de 0,120 à 0,135) ;
- 1 209 tests verts.

Toutes les mesures sont faites dans le vrai moteur : WKWebView de l'app, M1 8 Go, à filtres égaux (extraits de 800 caractères, bonus lexical de 0,05, garde-fou numérique inchangé). **Rien n'est basculé** : la recherche reste sur la v1, les calibrations arctic ne sont pas appliquées, et aucun index n'est supprimé (v1, ancien index, index parallèle).

## Verdict

| Condition | État | En une ligne |
|---|---|---|
| 1. Latence et mémoire en WASM multi-thread | **en partie remplie** | Isolation active et prouvée en dev comme en production. Indexation ramenée à **0,9 fois la v1** (contre 2,9). Requêtes courtes et médiane des longues sous 200 ms sur PublicHealthQA et Syntec. Mais le pire cas des questions longues dépasse 200 ms (329 à 1 633 ms), comme pour la v1 ; la médiane Alloprof est à 220 ms ; le pic mémoire ne baisse pas (5,4 Go) ; le gel n'est pas élucidé. |
| 2. Robustesse du seuil | **non remplie** | Avec 10 négatives et 6 positives indirectes en plus, aucun seuil ne donne à la fois zéro régression et zéro faux positif. Au seuil de 0,13, 7 négatives sur 10 renvoient un résultat. Le chevauchement est structurel, pas une question de réglage. |
| 3. PC Windows 8 Go | **en attente de poste** | Aucun PC Windows accessible depuis ma session : rien n'est simulé. Le kit de mesure est prêt ([kit-windows.md](kit-windows.md)). |

**Recommandation : ne pas basculer.** Le choix du modèle n'est pas remis en cause : les nouvelles mesures ne contredisent pas le verdict (détail en fin de condition 2). En revanche, la condition 2 montre qu'un seuil sur le cosinus ne suffit pas à rendre arctic sûr sur des questions sans réponse. Il faut un autre mécanisme de filtrage avant la bascule (options chiffrées plus bas). La condition 1 est remplie pour l'essentiel, et la condition 3 attend le poste.

## Avant et après les conditions

Arctic tronqué à 768. Jeux publics : vecteurs du vrai moteur à 4 threads, rejoués au seuil indiqué avec le classement de l'app, contrôle d'identité 39/39.

| | v1 actuelle (seuil 0,30) | arctic avant (1 thread, seuil 0,13) | arctic après (4 threads, seuil 0,13) | arctic après, seuil 0,30 |
|---|---|---|---|---|
| PublicHealthQA (Rappel@5 / MRR) | 91,8 % / 81,1 | 91,8 % / 84,5 | 91,8 % / 84,5 | 91,8 % / 84,5 |
| Syntec | 94,0 % / 79,9 | 99,0 % / 86,1 | 99,0 % / 86,1 | 98,0 % / 85,8 |
| Alloprof | 56,5 % / 46,4 | 55,5 % / 49,3 | 55,5 % / 49,3 | 55,0 % / 48,6 |
| 19 questions d'origine | 17/19 | 19/19 | 19/19 | 15/19 (q5, q7) |
| 10 nouvelles négatives sans réponse | 9/10 | — | **3/10** | 9/10 |
| 6 nouvelles positives indirectes | 3/6 | — | 4/6 | 3/6 |
| Requête courte à chaud, médiane / pire cas | 77 / 143 ms | 177 / 247 ms | **105 / 214 ms** | idem |
| Requête longue (PHQA, 159 à 255 caractères), médiane / pire cas | 305 / 419 ms | 851 / 1 452 ms | **319 / 544 ms** | idem |
| Requêtes du jeu PublicHealthQA, médiane / pire cas | 189 / 373 ms | 502 ms (médiane) | **163 / 591 ms** | idem |
| Requêtes du jeu Syntec, médiane / pire cas | 139 / 284 ms | 398 ms (médiane) | **132 / 329 ms** | idem |
| Requêtes Alloprof, médiane / pire cas | non remesurée | 676 ms (médiane) | **220 / 1 633 ms** | idem |
| Tes questions (B), médiane | 70 ms | 179 à 186 ms | **60 à 67 ms** (pire cas 83 ms) | idem |
| Indexation, par extrait (PHQA, Syntec, Alloprof) | 0,92 / 0,86 / 1,07 s | 2,49 / 2,38 / 3,11 s | **0,88 / 0,77 / 0,96 s** | idem |
| Indexation d'Alloprof (4 156 extraits) | 74 min | 3 h 36 | **66 min** | idem |
| Chargement du modèle + 1re requête | 8,9 s | 5,6 s | 5,2 s | idem |
| Mémoire, médiane pendant Alloprof | — | 3,4 → 3,7 Go | 3,6 → 3,9 Go | idem |
| Pic mémoire (WebKit, banc) | 4,6 Go (PHQA + Syntec) | 5,4 Go | 5,4 Go | idem |

La v1 de référence a été remesurée avec le nouveau banc, qui donne la médiane et le pire cas, sur PublicHealthQA, Syntec et les requêtes courtes et longues. Sa ligne Alloprof reprend le bilan A1 (74 min, 1 thread).

## Condition 1 : WASM multi-thread

### Isolation COOP/COEP

- **Comment.**
  - En développement, les en-têtes `Cross-Origin-Opener-Policy: same-origin` et `Cross-Origin-Embedder-Policy: require-corp` sont posés sur toutes les réponses de Vite, y compris les fichiers du runtime local (worker, WASM, OCR).
  - En production, `app.security.headers` de `tauri.conf.json` les ajoute aux réponses du protocole de l'app (Tauri 2.10.3 les applique dans `protocol/tauri.rs`).
  - Les modèles arrivent par le protocole `asset`. Tauri y renvoie `Access-Control-Allow-Origin` avec l'origine de la fenêtre : les `fetch()` en CORS des modèles passent COEP.
- **Preuve en dev** (`http://localhost:5180`, vrai WKWebView) : `crossOriginIsolated: true`, `SharedArrayBuffer` disponible, et 4 threads réellement appliqués par onnxruntime, relevés dans le worker.
- **Preuve en production** (build de production `tauri://localhost`, sonde temporaire retirée depuis, résultat dans `donnees/`).
  - La page est isolée (`crossOriginIsolated: true`, contexte sécurisé).
  - **Mais WebKit ne publie pas le constructeur `SharedArrayBuffer` en global sur ce schéma**, alors que la mémoire WebAssembly partagée fonctionne (son tampon est un `SharedArrayBuffer`). onnxruntime teste ce global et retombait sur 1 thread en silence.
  - Correctif dans le worker d'encodage : quand la page est isolée et que le global manque, on expose le constructeur fourni par la mémoire partagée.
  - Résultat en production : **4 threads appliqués, vecteurs identiques à ceux sur 1 thread** (cosinus 1,000000 sur 3 textes), requêtes à chaud de 124 et 193 ms contre 294 et 694 ms.
- **Rien n'est cassé**, vérifié dans la page isolée, en dev et en production :
  - l'OCR relit une image (« Vaccin rage 2026 ») ;
  - PDF.js extrait le texte d'un PDF ;
  - Whisper se charge ;
  - Gemma 3 répond ;
  - les fichiers modèles arrivent bien par le protocole `asset` (HTTP 200) ;
  - aucune ressource bloquée ni erreur au démarrage.

  L'app n'utilise ni iframe ni image externe, et `convertFileSrc` ne sert qu'aux modèles.
- **Windows, non vérifié** : en production, l'app y est servie par `http://tauri.localhost`, où Chromium expose normalement `SharedArrayBuffer`. Le correctif ne s'active que si le global manque. La ligne « Isolation active » du kit le vérifiera.

### Nombre de threads, choisi sur mesures

| Threads | Indexation PHQA / Syntec (s par extrait) | Requêtes PHQA, médiane / pire cas | Tes questions, médiane |
|---|---|---|---|
| 1 | 2,49 / 2,38 | 502 ms (médiane) | 179 à 186 ms |
| 2 | 1,31 / 1,21 | 258 / 574 ms | 94 à 98 ms |
| **4** | **0,88 / 0,77** | **163 / 591 ms** | **60 à 67 ms** |
| 6 | 1,7 (PHQA) | — (run figé sur Syntec) | — |

Le M1 a 8 cœurs logiques, dont 4 performants : au-delà de 4 threads, ils se gênent. Règle retenue dans le code (`arcticThreadCount`) : la moitié des cœurs logiques, 4 au plus. Sur ce poste, cela donne 4. Sur un PC à 4 cœurs et 8 threads, cela donnerait 4. Cette règle sera à confirmer sur le poste Windows (le kit mesure aussi 1 thread pour comparer). La v1 et Whisper restent sur 1 thread : rien ne change pour eux.

### Latence, indexation, mémoire

- **Requêtes.**
  - Questions courtes : 105 ms en médiane, 214 ms au pire.
  - Tes questions : 60 à 67 ms, plus rapide que la v1.
  - Médiane des jeux publics : 163 ms (PHQA), 132 ms (Syntec), 220 ms (Alloprof).
  - **Pire cas des questions longues : de 329 à 1 633 ms, au-dessus des 200 ms.** La v1 est dans le même cas (pire cas de 284 à 419 ms). La latence suit la longueur de la question : les plus lentes font 250 caractères et plus.
- **Indexation : 0,9 fois la v1** sur Alloprof (66 min contre 74), au lieu de 2,9 fois. Point réglé.
- **Mémoire : pas de gain.** La médiane pendant Alloprof va de 3,6 à 3,9 Go, avec un pic à 5,2 Go pendant l'indexation et 5,4 Go pendant le classement des 200 questions. Comme avant, une légère dérive au fil du run, à surveiller.
- **Gel.**
  - 2 gels sur environ 16 h de runs : à 1 thread après environ 2 h 15 (avant ce chantier), et à 6 threads au début de Syntec.
  - Aucun gel à 4 threads, y compris pendant les 70 min d'Alloprof.
  - Pendant le gel à 6 threads, aucun délai de 480 s n'a expiré en 2 h 45 : c'est toute la page qui était à l'arrêt, pas une requête lente.
  - Le banc a maintenant un pouls de page par minute, indépendant du moteur, et une ligne tous les 100 textes avec l'état du moteur. Si le gel revient, le journal dira si la page ou seulement le moteur s'est arrêté. **La cause reste inconnue.**

## Condition 2 : robustesse du seuil

### Les 16 nouvelles questions

Figées avant toute mesure : SHA-256 `9ee8c263f92b75498225a3927dd70e0ad080e7f75c59a93474b529a225b1a833` du fichier d'origine, identique après les mesures. Choisies sur des critères de langue, sans regarder aucun cosinus. Patient A : lapin, une consultation (fièvre, vomissement, diarrhée, perte de poids, antibiotique, vaccin) et une ordonnance. Patient B : chien, deux consultations (insuffisance rénale, maladie infectieuse ; allergie aux pénicillines, boutons sur le visage).

| # | Patient | Question | Attendu | Raison du choix |
|---|---|---|---|---|
| n1 | A | anesthésie générale | rien | voisine de la chirurgie évoquée hors des sources indexées |
| n2 | A | insuffisance rénale | rien | piège inter-patients : présente chez B seulement |
| n3 | A | otite | rien | affection courante chez le lapin, absente du dossier |
| n4 | A | parasites intestinaux | rien | voisine des troubles digestifs, sans réponse |
| n5 | A | allergie à la pénicilline | rien | voisine de l'antibiotique, présente chez B seulement |
| n6 | B | vaccin contre la rage | rien | voisine de « maladie infectieuse », aucune vaccination indexée |
| n7 | B | diabète | rien | voisin métabolique du bilan rénal |
| n8 | B | insuffisance cardiaque | rien | piège lexical : partage « insuffisance » avec l'insuffisance rénale |
| n9 | B | calculs urinaires | rien | voisins de l'appareil urinaire |
| n10 | B | dysplasie de la hanche | rien | plausible chez un malinois, absente |
| p1 | A | le lapin a maigri | la consultation | paraphrase de « perte de poids » |
| p2 | A | troubles digestifs | la consultation | terme englobant, absent du texte |
| p3 | A | température élevée | la consultation | paraphrase de « fièvre aiguë » |
| p4 | B | problème aux reins | consultation rénale | langage courant |
| p5 | B | éruption sur la face | consultation allergie | paraphrase de « boutons sur le visage » |
| p6 | B | intolérance aux antibiotiques | consultation allergie | lien indirect (les pénicillines sont des antibiotiques) |

### Résultat du balayage

Seuil de 0,05 à 0,50 au pas de 0,001, bonus de 0,05, garde-fou numérique inchangé, même logique que `rankPassages` (contrôle d'identité 35/35).

- **Fenêtre où tout passe : aucune.** Fenêtre sans régression et sans faux positif, même en tolérant les positives manquées : **aucune** non plus.
- La question qui bloque ne vient pas d'un réglage : les faux positifs sont **purement sémantiques**, aucune correspondance lexicale n'y entre. Meilleur cosinus hors sujet des négatives :

  | Négative | n8 | n7 | n5 | n6 | n9 | n10 | n4 |
  |---|---|---|---|---|---|---|---|
  | Cosinus | 0,433 | 0,254 | 0,178 | 0,167 | 0,164 | 0,150 | 0,147 |

  Or la source pertinente de plusieurs questions d'origine est plus basse : q5 0,139, q13 0,169, q2 0,194, q7 0,211. Les positives aussi : p2 0,081, p1 0,129. Il n'existe donc aucune valeur qui sépare les deux familles.
- Ce que coûte chaque choix (arctic, 35 questions) :

  | Seuil | Originales | Négatives sans réponse | Positives | Total |
  |---|---|---|---|---|
  | 0,116 (meilleur sans régression des 19) | 19/19 | 3/10 | 5/6 | 27/35 |
  | 0,13 (actuel) | 19/19 | 3/10 | 4/6 | 26/35 |
  | 0,167 (meilleur total) | 18/19 (q5) | 7/10 | 4/6 | 29/35 |
  | 0,30 (seuil de la v1) | 15/19 (q5, q7) | 9/10 | 3/6 | 27/35 |
  | 0,434 (zéro faux positif) | 11/19 | 10/10 | 0/6 | 21/35 |

- Le meilleur seuil des 19 questions d'origine (0,120 à 0,135) est **calé sur une seule question** de chaque côté : q11 en bas, q5 en haut. Avec les nouvelles questions, cette fenêtre ne tient plus.
- Piste testée et écartée, un seuil relatif à chaque question : z-score contre un fond de 300 extraits publics sans rapport. Le chevauchement reste le même (n8 à z = 6,6, n7 à 5,1, contre 2,4 pour q5).

### Le verdict du modèle tient-il ?

Oui, rien de net ne le contredit.
- Sur les 35 questions, la v1 plafonne aussi à 29/35. Elle y arrive à son seuil de production (0,30 : 17/19, 9/10, 3/6) comme à 0,251. Arctic plafonne au même total (29/35 à 0,167).
- La v1 laisse passer elle aussi n8 (cosinus 0,319).
- Arctic garde son avance sur les jeux publics.
- La faiblesse vient du mécanisme commun, un seuil absolu sur le cosinus d'un bi-encodeur, pas d'arctic seul. Mais elle empêche de livrer arctic au seuil de 0,13.

### Options pour remplir la condition 2 (non appliquées)

| Option | Ce que les mesures disent | Compromis |
|---|---|---|
| A. Arctic au seuil de la v1 (0,30) | 15/19, 9/10, 3/6 ; jeux publics quasi inchangés (Syntec 98/85,8, Alloprof 55,0/48,6) | 2 régressions sur tes questions (q5 « amaigrissement », q7 « rappel vaccin ») |
| B. A + synonymes cliniques dans le lexique (amaigrissement ↔ perte de poids, rappel ↔ vaccin) | non mesuré | rattrape probablement q5 et q7 par la voie lexicale, qui n'est pas soumise au seuil ; travail de lexique, sans coût de calcul |
| C. Deuxième étage de reclassement (cross-encodeur sous licence permissive) sur les 5 premiers résultats | non mesuré | c'est le moyen standard de rejeter les faux voisins ; il coûte un modèle de plus (de l'ordre de 0,5 Go) et une latence par résultat, à mesurer |
| D. Présenter les résultats sémantiques seuls comme des « rapprochements possibles », distincts des correspondances exactes | — | ne supprime pas les faux positifs, mais les rend moins trompeurs ; relève du chantier UI séparé |

Ma préférence : **B d'abord**. C'est le moins cher, et il se mesure sur le banc existant avec les 35 questions figées. Puis **C** si B ne suffit pas.

## Condition 3 : PC Windows 8 Go

**En attente de poste.** Je n'ai pas accès à un PC Windows depuis cette session. Aucun chiffre Windows n'est simulé ni extrapolé du Mac.

- Le kit est prêt : [kit-windows.md](kit-windows.md) (procédure pas à pas, tableau à remplir face aux chiffres du Mac) et [run-bench.ps1](../../../../scripts/eval-local-ai/windows/run-bench.ps1).
  - Le script mesure l'isolation, OCR, PDF, dictée et générateur sous isolation, les requêtes courtes et longues, le chargement, l'indexation (395 extraits, puis les 4 156 d'Alloprof), la mémoire WebView2 à la seconde, et le pouls en cas de gel.
  - Le banc tourne sans aucun dossier patient : `cases.json` n'est plus lu que par les tâches qui en ont besoin.
  - **Le script PowerShell n'a pas pu être exécuté ici**, faute de Windows. Il faudra peut-être un ajustement au premier lancement.

### Livrer arctic avec l'app (non activé)

Aujourd'hui, arctic est installé à la main sur ce poste : `local-ai/arctic-embed-l-v2/`, source `Snowflake/snowflake-arctic-embed-l-v2.0`, révision `ac6544c`, licence Apache 2.0. Il n'est pas dans le manifeste. Pour le proposer au téléchargement comme les autres modèles :

1. Ajouter une entrée au manifeste `resources/local-ai/download-manifest.json`. URLs `https://huggingface.co/Snowflake/snowflake-arctic-embed-l-v2.0/resolve/<révision complète>/…` (la forme courte `ac6544c` est à compléter en révision complète au moment de l'ajout). Fichiers, tailles et empreintes mesurés sur la copie installée :

   | Fichier | Taille (octets) | SHA-256 |
   |---|---|---|
   | `config.json` | 818 | `706f5d1e…33b6c15` |
   | `tokenizer.json` | 17 083 074 | `39feb986…039a8edc` |
   | `tokenizer_config.json` | 1 339 | `cb058b4c…af80f0f77f1` |
   | `special_tokens_map.json` | 964 | `8c785abe…4cf10835` |
   | `onnx/model_quantized.onnx` | 569 721 975 | `4b164a8b…c00872d8` |

   Les empreintes complètes sont dans `donnees/arctic-fichiers.json`. Total : 587 Mo. `sentencepiece.bpe.model` (5 Mo) n'est pas lu par transformers.js et peut être omis.
2. Autoriser l'identifiant dans `manifest()` de `local_ai_download.rs`, qui n'accepte aujourd'hui que `whisper`, `generator` et `embeddinggemma`. Brancher la validation existante (`validate_arctic`) à l'activation du dossier.
3. Côté interface, garder le nom générique « Recherche clinique », sans nom technique. Ajouter la mention de licence Apache 2.0 aux licences de l'app.
4. Au moment de la bascule seulement : décider s'il remplace la v1 au téléchargement (1 261 Mo en moins pour une nouvelle installation) ou s'il s'y ajoute le temps de la transition. La v1 reste le repli tant qu'arctic n'est pas installé.

## Ce qui a changé dans le code

| Élément | Fichier |
|---|---|
| En-têtes COOP/COEP sur toutes les réponses du serveur de dev | `vite.config.ts` |
| En-têtes COOP/COEP du protocole de l'app en production | `src-tauri/tauri.conf.json` |
| Threads d'arctic : règle `arcticThreadCount` (moitié des cœurs, 4 au plus), surchargeable par le banc en dev uniquement ; état réel du moteur remonté (`searchEngineInfo`) | `local-ai/embedding-store.ts`, `local-ai/worker-protocol.ts` |
| Worker : threads ONNX appliqués seulement avec mémoire partagée ; exposition du `SharedArrayBuffer` que WebKit cache sur `tauri://` ; état réel du moteur dans la réponse | `workers/embedding.worker.ts` |
| Banc : pouls de page, latence médiane et pire cas, tâches `queries` (latence sans corpus) et `isolation` (OCR, PDF, dictée, générateur), corpus clinique facultatif | `scripts/eval-local-ai/eval.ts`, `vite.eval.config.ts` |
| Kit Windows | `scripts/eval-local-ai/windows/run-bench.ps1`, `kit-windows.md` |

La v1, Whisper et la génération restent sur 1 thread et ne changent pas de comportement. Les calibrations arctic ne sont pas appliquées (`MODEL_CALIBRATION` inchangé), la génération active reste `passages`, et aucun index n'est supprimé.

## Tests

Suite complète : **156 fichiers, 1 211 tests unitaires verts** (2 nouveaux : règle des threads, en-têtes identiques en dev et en production), typecheck et ESLint sans erreur, **tests Rust : 20 verts, 4 ignorés** (ceux qui exigent un téléchargement réseau ou des fichiers modèles choisis à la main).

## Données

Dans [donnees/](donnees/) :
- les rapports du banc (identifiants tronqués, durées, scores), les journaux du run figé et d'Alloprof ;
- la sonde de production (son code et son résultat) ;
- les 16 questions figées, sans nom de patient ;
- les balayages des 35 questions (arctic et v1) et le rejeu des jeux publics au seuil final.

Commit : COMMIT_LIGNE
