# A2 : EmbeddingGemma 2 recalibrée contre arctic-embed-l-v2 (23 et 24 octobre 2026)

Consigne : ne pas fermer A2 sur un compromis. Il faut une qualité au moins égale à la v1 actuelle à filtres égaux, aucune régression sur les 19 questions validées, une licence propre pour la vente, et une tenue mesurée sur le poste plancher. Deux candidats sont départagés dans le vrai moteur (WKWebView de l'app, binaire de debug, M1 8 Go), sur les mêmes bancs : Alloprof, Syntec, PublicHealthQA et tes 19 questions. Le découpage (extraits de 800 caractères), le classement (`rankPassages`) et le garde-fou numérique sont les mêmes pour tous. **Rien n'est supprimé, rien n'est basculé** : la recherche reste sur la v1 en extraits.

## Verdict

**Aucun des deux ne remplit tous les critères aujourd'hui.**

- **EmbeddingGemma 2 est éliminée sur la qualité.** Aucun réglage ne retrouve la v1 sur Syntec (−7 points de rappel, −8 de MRR) ni sur Alloprof (−3 et −4,4). L'écart vient du modèle, pas des filtres. Elle exige en plus WebGPU, que je n'ai pas pu vérifier sur le PC Windows plancher.
- **arctic-embed-l-v2, tronqué à 768 dimensions et recalibré, atteint la qualité.**
  - Résultats : au-dessus de la v1 sur PublicHealthQA et Syntec, au même niveau sur Alloprof, 19/19 sur tes questions sans régression, licence Apache 2.0.
  - Sa tenue ne suffit pas encore : la requête dépasse 0,2 s dès que la question est longue (400 à 680 ms), l'indexation est 2,9 fois plus lente que la v1, et la marge de son seuil sur la question négative est étroite.

| | v1 actuelle (référence) | EmbeddingGemma 2 recalibrée | arctic-embed-l-v2 q8, tronqué à 768 |
|---|---|---|---|
| Réglage | seuil 0,30, bonus 0,05 | seuil 0,65, bonus 0,05 | seuil 0,13, bonus 0,05 |
| PublicHealthQA (Rappel@5 / MRR) | 91,8 % / 81,1 | 90,6 % / 82,9 | **91,8 % / 84,5** |
| Syntec | 94,0 % / 79,9 | 87,0 % / 71,9 | **99,0 % / 86,1** |
| Alloprof | 56,5 % / 46,4 | 53,5 % / 42,0 | 55,5 % / **49,3** |
| Tes 19 questions | 17/19 | **19/19, aucune régression** | **19/19, aucune régression** |
| Fenêtre de seuil sans régression | large (0,16 à 0,34) | 0,650 à 0,675 | étroite (0,120 à 0,135) |
| Requête à chaud, tes questions | 70 ms | 115 à 135 ms | 179 à 186 ms |
| Requête à chaud, questions longues des jeux publics | 143 à 180 ms | 130 à 151 ms | **398 à 676 ms** |
| Indexation, par extrait | 0,9 à 1,1 s (WASM) | 0,3 à 0,8 s (WebGPU) | **2,4 à 3,1 s** (WASM) |
| Indexation d'Alloprof (4 156 extraits) | 74 min | 29 à 57 min | **3 h 36** |
| Pic mémoire, tes questions | 3,5 Go | 2,4 Go | 2,8 Go |
| Mémoire, jeux publics | pic 4,6 Go | pic 2,7 Go | médiane 3,4 Go, pic 5,4 Go en fin d'Alloprof |
| Disque | 1 261 Mo | 346 Mo | 592 Mo |
| Moteur requis | WASM | **WebGPU obligatoire** | WASM (WebGPU inutilisable, voir plus bas) |
| Licence | Gemma (non conforme) | Apache 2.0 | Apache 2.0 |

**Lecture.**
- La qualité est celle du banc dans l'app, au seuil indiqué.
- Sur les jeux publics, le seuil ne change presque rien, car chaque question y a une réponse. Le recalibrage ne joue que sur tes questions, et surtout sur q11, la question négative.
- Alloprof pour arctic : 1 point de rappel de moins que la v1, soit 2 questions sur 200 ; le MRR gagne 2,9 points et le nDCG aussi (50,9 contre 49,6 à filtres strictement égaux). Je le classe « au même niveau », pas « au-dessus ».

## Candidat 1 : EmbeddingGemma 2 recalibrée

**Le recalibrage règle tes 19 questions, pas les jeux publics.**

- Balayage du seuil de 0,05 à 0,75 et du bonus lexique de 0 à 0,12, sur les vecteurs produits par le vrai moteur. Contrôle : la réplique du classement redonne exactement celui de `rankPassages` (39 classements sur 39).
- Seuil 0,65, bonus 0,05 : **19/19, aucune régression**. q11 ne renvoie plus rien. q9 repasse en tête : sa source pertinente n'a pas de vecteur et reçoit le score lexical seul de 0,70, juste au-dessus du meilleur hors-sujet, à 0,694.
- Syntec et Alloprof : **aucun réglage ne retrouve la v1**. Le meilleur reste 87 %/71,9 et 53,5 %/42,0. Au-delà de 0,70, le seuil ne fait qu'enlever des réponses (Alloprof à 33 % pour 0,75). Le bonus lexique non plus : à 0, PublicHealthQA gagne 0,6 point de MRR, Syntec et Alloprof ne bougent pas.
- Tenue : c'est le plus léger et le plus rapide des trois.
- **WebGPU obligatoire.** En q8 comme en q4, le modèle utilise l'opérateur `GatherBlockQuantized`, absent du moteur WASM d'onnxruntime-web 1.31. Constaté ici : en WASM, le chargement échoue.

### WebGPU sur un poste Windows 8 Go

**Non mesuré : je n'ai pas de PC Windows.** Ce qui suit vient de la documentation et du code de Chromium.

- WebView2, le moteur web de Tauri sur Windows, est un Chromium (Edge). WebGPU y passe par Direct3D 12 et est actif sur Windows depuis la version 113.
- La liste de blocage WebGPU de Chromium accepte Intel, AMD et Microsoft sur Direct3D 12, mais elle bloque aussi certaines versions de pilotes. Un pilote Intel ancien peut donc couper WebGPU sans prévenir.
- Sur un portable 8 Go à GPU intégré, la carte graphique prend sa mémoire dans les 8 Go. Les 2,4 à 2,7 Go mesurés ici comprennent déjà le processus GPU (mémoire unifiée du M1). Sous Windows, il faut s'attendre à un coût comparable, réparti entre WebView2 et le pilote.
- Je n'ai trouvé aucune contrainte propre à WebView2, mais je n'ai pas non plus de confirmation : seul un essai sur le PC dira si `navigator.gpu.requestAdapter()` répond.

### Sans WebGPU

- Aujourd'hui, si `passages2` est actif sans WebGPU, le worker échoue au chargement et la recherche retombe sur les correspondances textuelles seules. C'est une perte nette, sans message clair.
- Les replis possibles :
  - garder la v1 installée, et donc la licence Gemma ;
  - EmbeddingGemma 2 en fp32 dans WASM : 1 084 Mo, non mesuré, et le gain de taille disparaît ;
  - la recherche textuelle seule.
- Avec EmbeddingGemma 2, la qualité de la recherche dépendrait du GPU et du pilote de chaque poste client.

## Candidat 2 : arctic-embed-l-v2 q8

**C'est la meilleure qualité des trois, mais il est plus lent et sa marge sur la question négative est étroite.**

- **Mesure complète dans le vrai moteur.** transformers.js 3.8.1, WASM sur un seul thread, pooling CLS, préfixe « query: » sur les questions. La mesure A3 avait été faite hors moteur.
- **Au seuil de la v1 (0,30), filtres strictement égaux.**
  - PublicHealthQA : 91,8 %/84,1.
  - Syntec : 97 %/86,1.
  - Alloprof : 54,5 %/48,0.
  - Tes questions : 15/19, avec 2 régressions (q5 et q7). Ses cosinus sont plus bas que ceux de la v1 : la source pertinente de q5 plafonne à 0,145, contre 0,314 avec la v1.
- **Recalibré : 19/19, aucune régression, mais la fenêtre est étroite.**
  - En 1 024 dimensions, le seuil doit rester entre 0,140 et 0,145 : q5 pertinent à 0,145, meilleur hors-sujet de q11 à 0,136.
  - En 768, la fenêtre va de 0,120 à 0,135.
  - Une marge de 0,015 de cosinus, calée sur 19 questions dont une seule négative : c'est son point faible.
- **Troncature à 768 dimensions.**
  - La table `embeddings` impose 768 dimensions (3 072 octets). arctic-embed-l-v2 est entraîné pour supporter la troncature (Matryoshka).
  - En 768, la qualité est égale ou meilleure (Alloprof 55,5 %/49,3, contre 55 %/48,7 en 1 024), la fenêtre de seuil est plus large, et le schéma SQLite ne change pas.
  - En 256 : Syntec 97 %/83,6, avec une fenêtre réduite à un seul point (0,15). Je ne la retiens pas.
- **Tenue.**
  - Requête à chaud : 179 à 186 ms sur tes questions, sous les 0,2 s visés. Sur les questions longues des jeux publics, 398 à 676 ms, au-dessus.
  - Indexation : 2,4 à 3,1 s par extrait, 2,9 fois la v1. Alloprof : 3 h 36, contre 74 min pour la v1. Pour une clinique à 1 000 extraits, l'indexation initiale prendrait de 40 à 50 min en tâche de fond, contre 15 à 18 min avec la v1. Ensuite, chaque note ajoutée coûte quelques secondes.
  - Mémoire : 2,8 Go sur tes questions, sous la v1 (3,5 Go). Pendant les 3 h 36 d'indexation, la médiane monte lentement de 3,4 à 4,3 Go, avec un pic à 5,4 Go à la fin. Une petite dérive est possible, à surveiller sur une longue indexation.
- **WebGPU ne l'aide pas.** Essai fait dans le vrai moteur : en q8, les opérateurs quantifiés repassent sur le CPU, l'indexation est un peu plus lente (488 s contre 444 s pour PublicHealthQA), et surtout les vecteurs sont faux (Rappel@5 à 9 %). arctic reste donc en WASM, ce qui lui évite toute dépendance au GPU : il tourne partout où tourne la v1.

## Recommandation

**Retenir arctic-embed-l-v2 tronqué à 768 comme modèle cible d'A2, sans basculer tout de suite.**

Pourquoi lui :
- C'est le seul candidat qui atteint la qualité de la v1, et il la dépasse nettement sur deux des trois jeux.
- Ce qui lui manque relève de la vitesse, donc de l'ingénierie. Le défaut d'EmbeddingGemma 2 est dans le modèle, et aucun réglage ne l'a corrigé.
- Il ne dépend pas du GPU, il prend moins de mémoire que la v1 et il est sous licence propre.

Avant la bascule, trois conditions, chacune mesurable :

1. **Latence.** Passer le moteur WASM en plusieurs threads, ce qui demande d'isoler la page de l'app (en-têtes COOP/COEP du webview), puis remesurer. Cible : 0,2 s sur une question longue et une indexation proche de la v1. Si la cible n'est pas atteinte, arctic ne tient pas le plancher et la v1 reste en place.
2. **Robustesse du seuil.** Ajouter une dizaine de questions négatives, et quelques positives à faible cosinus, au jeu que tu valides, puis rejouer le balayage. Une fenêtre de 0,015 calée sur une seule question négative ne suffit pas pour livrer.
3. **Plancher Windows 8 Go.** Mesurer arctic sur le PC : requête, RAM, durée de l'indexation initiale. Il tourne en WASM, donc sans question de WebGPU.

À noter aussi : la v1 recalibrée vers 0,15 ferait elle aussi 19/19, avec Syntec à 96 %. Sa licence Gemma l'exclut toujours de la vente.

## Ce qui a changé dans le code

| Élément | Fichier |
|---|---|
| Calibration par modèle (`MODEL_CALIBRATION`) : la v1 garde exactement ses valeurs ; le classement accepte toute dimension | `local-ai/passage-search.ts` |
| Génération `passages3` (arctic tronqué à 768, `model_key` `arctic-embed-l-v2-q8-wasm-768-passages800-v5`). Index tenu à jour seulement si arctic est installé. Repli sur la v1 si arctic manque | `local-ai/passage-search.ts`, `local-ai/embedding-store.ts`, `local-ai/search-generation.ts` |
| Chargement d'arctic (q8, WASM, pooling CLS, préfixe de question) | `workers/embedding.worker.ts`, `local-ai/worker-protocol.ts` |
| Détection d'arctic installé (`arcticReady`), fichiers et tailles vérifiés | `src-tauri/src/local_ai_models.rs`, `local-ai/models.ts` |
| Banc : export des vecteurs (`dumpVectors`), choix des jeux (`onlySets`), reprise sur point de sauvegarde et journal des refus pendant les longues indexations | `scripts/eval-local-ai/eval.ts`, `vite.eval.config.ts` |

Dans le code, les calibrations d'EG2 et d'arctic restent celles de la v1. Les régler sur les valeurs ci-dessus fera partie de la bascule, qui attend ta décision. arctic est installé à la main sur ce poste (`local-ai/arctic-embed-l-v2/`, révision `ac6544c`) ; il n'est pas dans le manifeste de téléchargement.

## Tests

Suite complète : **155 fichiers, 1 209 tests verts**, typecheck et ESLint sans erreur, tests Rust de `local_ai_models` verts. Nouveau test : l'index arctic n'existe que si arctic est installé, ses vecteurs de 1 024 dimensions sont stockés tronqués à 768 (3 072 octets), et les index v1 restent intacts.

## Données

Dans [donnees/](donnees/) :
- les balayages complets (seuil × bonus × jeux) pour les trois modèles ;
- les rapports du banc : identifiants opaques, durées et scores, sans texte clinique ni question.

## Méthode et limites

- Tous les chiffres viennent du vrai moteur, sauf le balayage. Celui-ci rejoue le classement de l'app sur les vecteurs exportés par ce moteur, avec un contrôle d'identité.
- Mémoire : empreinte cumulée des processus WebKit lancés avec l'app, échantillonnée chaque seconde. Le système était en swap de 5 à 9 Go pendant les mesures, applications de bureau ouvertes, comme sur un poste réel.
- Le poste plancher mesuré est le M1 8 Go. **Le PC Windows 8 Go n'a pas été mesuré.**
- L'indexation EG2 d'Alloprof varie de 29 à 57 min selon que la fenêtre reste ou non au premier plan : macOS ralentit aussi le GPU d'une fenêtre masquée.
- Le premier run arctic complet a été coupé par la limite de 3 h du script. Le deuxième s'est figé après environ 2 h 15 : CPU à zéro, écran allumé et déverrouillé, aucune erreur visible. Le troisième, instrumenté (journal tous les 500 textes, reprise possible), est allé au bout en 3 h 36 sans un seul refus. La cause du blocage n'est pas identifiée. Il faudra la garder en tête pour l'indexation initiale d'une grosse base.
