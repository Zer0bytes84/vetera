# 3. Verdict sur l'hypothèse et plan recommandé

## 3.1 L'hypothèse soumise

> Phase A : passer l'assistant de Gemma 3 à Gemma 4 pour poser une base de génération solide. Phase B, plus tard : revoir la recherche avec EmbeddingGemma v2. Deux passes séparées, livrables indépendamment.

## 3.2 Verdict

**Le découpage en passes indépendantes est bon. L'ordre ne l'est pas, et il manque une phase 0.** Je recommande :

0. **Phase 0 : mesurer et arrêter le gaspillage**, sans changer de modèle.
1. **Phase A : la recherche d'abord**, avec EmbeddingGemma 2 en texte.
2. **Phase B : la génération ensuite**, avec Gemma 4 E2B.
3. **Phase C : les photos et PDF** (demande d'Aissa), avec l'encodeur vision d'EmbeddingGemma 2.

Gemma 4 E2B reste la bonne cible de génération : les mesures de ce rapport la soutiennent. Ce qui change, c'est *quand* et *à quelle condition*.

### Arguments pour l'ordre proposé (génération d'abord), et ce qu'ils valent

| Argument | Ce qu'il vaut, preuves à l'appui |
|---|---|
| La génération est ce que le vétérinaire voit. | **Vrai.** C'est la meilleure raison de ne pas trop la retarder. |
| Le changement est presque mécanique. | **Vrai, et mieux qu'attendu** : le MediaPipe 0.10.29 déjà installé charge `gemma-4-E2B-it-web.task` sans mise à jour (mesuré). Il reste à changer le gabarit de conversation, écrit en dur à 3 endroits, et à ajouter le fichier au manifeste. |
| Pas de réindexation. | **Vrai.** Changer d'embedding impose de réencoder tout l'index. |
| EmbeddingGemma 2 est très jeune (16 jours). | **Vrai.** De plus, il exige transformers.js 4.x alors que l'app est en 3.8.1, et Whisper dépend de la même bibliothèque. C'est le risque principal de mon ordre ; la parade est décrite en phase A. |

### Arguments contre, propres à notre cas

1. **La recherche ne sert pas les réponses de l'assistant.** C'est vérifié dans le code (§1.2) : l'assistant conversationnel n'a aucun accès aux dossiers, et la lecture de document travaille sur un document choisi à la main. Il n'y a donc pas de couplage qui obligerait à poser la génération d'abord. À l'inverse, le jour où l'on voudra que l'assistant réponde *sur les dossiers* avec citations, il faudra une recherche qui ne refuse pas les sections de plus de 2 048 tokens et qui ne recharge pas 1,2 Go à chaque question. **La recherche est le prérequis de l'assistant, pas l'inverse.**
2. **Gemma 4 ne lira ni images ni PDF dans notre moteur.** Les fichiers web d'E2B et d'E4B sont texte seul (fiches officielles ; journal du moteur pendant la mesure : `max_num_images: 0`). Le recoupement avec la demande d'Aissa joue donc *en faveur des embeddings* : EmbeddingGemma 2 place texte et images dans le même espace, et une requête « radio du grasset » peut retrouver la photo. C'est exactement l'indexation demandée. Obtenir la vision de Gemma 4 exigerait de quitter MediaPipe (LiteRT-LM natif ou llama.cpp avec `mmproj`), un chantier d'une autre taille.
3. **La mémoire est le facteur limitant sur 8 Go, et c'est la recherche qui en gaspille le plus.** Mesures sur M1 8 Go : la recherche actuelle ajoute environ **+3,0 Go** (embedding fp32), Gemma 3 1B **+2,0 Go**, Gemma 4 E2B **+3,0 Go**. Le verrou `model-lease` interdit qu'ils tournent ensemble, mais un poste de clinique enchaîne dictée, note et recherche. Passer l'embedding en q8 (texte seul) divise son poids par quatre (1 261 → 346 Mo) et retire la plus grosse source de swap *avant* d'introduire un générateur plus lourd.
4. **Le coût de la réindexation croît avec le temps, celui du changement de générateur non.** Aujourd'hui l'index réel compte 4 lignes sur ce poste, et quelques milliers au plus dans une clinique récente. À 0,9 s par extrait mesuré (fp32, 1 thread), 20 000 extraits demanderaient 5 heures de calcul en arrière-plan. Plus on attend, plus la migration coûte cher. Le générateur, lui, se remplace en échangeant un fichier.
5. **Le meilleur générateur bute sur la conception extractive de la note SOAP.** Le modèle ne fait que recopier une trame construite par le code. Le vrai gain mesurable est la fidélité : Gemma 3 1B a altéré un mot de la trame à chaque essai (« croânial », « vomition »), donc rejet et second essai. Gemma 4 E2B a été fidèle à chaque essai (5/5, six passages). C'est un signal fort, mais il porte sur **une seule dictée de test**. Il ne justifie pas de livrer un fichier de 2 Go et +1 Go de mémoire sans le jeu d'évaluation sur données réelles. D'où la phase 0.
6. **Le gaspillage actuel coûte plus cher que l'écart entre modèles.** Chaque note recharge le modèle deux fois (3 à 6 s à chaud, 25 s à froid pour la seconde lecture seule). Chaque recherche recharge l'embedding (6 s pour 0,2 s de calcul). Corriger cela profite à Gemma 3 comme à Gemma 4, et rend les mesures avant/après honnêtes.

### Ce qui pourrait me faire changer d'avis

- Si la phase 0 montre que **Gemma 4 E2B dépasse la mémoire disponible sur le PC Windows 8 Go de référence**, la phase B est repoussée ou rendue optionnelle, quel que soit l'ordre.
- Si **transformers.js 4.x ne peut pas cohabiter** proprement avec Whisper sous un alias (voir A.1), la phase A recule derrière la phase B, en gardant la version q8 d'EmbeddingGemma **v1** comme étape intermédiaire.
- Si le jeu d'évaluation montre que **la recherche vectorielle n'apporte presque rien** face à la recherche lexicale française existante (c'est possible, et on ne l'a jamais mesuré), la phase A se réduit à sa partie mémoire et photos, et la phase B passe en tête.

## 3.3 Plan recommandé, phase par phase

Les durées sont des estimations de développement pour une personne qui connaît le code, tests et reçus compris. Les tailles sont des téléchargements ; les mémoires et latences sont mesurées sur M1 8 Go, sauf mention « attendu ».

### Phase 0 : mesurer et arrêter le gaspillage (aucun changement de modèle)

| Élément | Contenu |
|---|---|
| 0.1 Banc d'évaluation | Script hors bundle (`scripts/eval-local-ai/`), lancé dans `tauri:dev` pour mesurer dans le vrai webview. Il réutilise les fonctions réelles de prompt, de validation et de recherche, et ouvre une copie de la base en lecture seule. Spécification : [04-jeu-evaluation.md](04-jeu-evaluation.md). |
| 0.2 Corpus | Accord d'Aissa, copie locale de sa base ; une demi-journée de vétérinaire pour annoter les tâches B, C et D. |
| 0.3 Poste Windows de référence | Un PC 8 Go à GPU intégré Intel, en WebView2. Mesure de Gemma 3, de Gemma 4 E2B et de l'embedding actuel. **Premier verrou de décision.** |
| 0.4 Génération : un seul chargement par demande | Charger directement avec un `maxTokens` suffisant (mesuré à partir du prompt avec le tokenizer, puis plafonné), au lieu de `createFromOptions` puis `setOptions`. Gain mesuré : 3 à 6 s à chaud, environ 25 s à froid. |
| 0.5 Recherche : garder le modèle chargé | Le worker d'embedding reste vivant quelques minutes après une recherche. Il est libéré dès qu'une dictée ou une note demande le verrou. Gain attendu : 6,1 s → 0,2 s par recherche enchaînée. |
| 0.6 Rapport « avant » | Les chiffres de référence de Gemma 3 et d'EmbeddingGemma v1 sur le corpus. |
| Livrable seul ? | Oui. Les corrections 0.4 et 0.5 ne changent ni les modèles ni les sorties ; le banc ne fait pas partie du bundle. |
| Réversible ? | Oui : deux commits isolés, annulables. |
| Risque de casse | Faible. 0.5 touche au verrou `model-lease` : il faut un test d'enchaînement recherche → dictée. |
| Coût | **4 à 5 jours** de développement, **0,5 jour** de vétérinaire, 0 Mo de téléchargement supplémentaire. |

### Phase A : recherche avec EmbeddingGemma 2 en texte (q8)

| Élément | Contenu |
|---|---|
| A.1 Moteur | transformers.js 4.3.1 installé **sous un alias** (`"transformers-v4": "npm:@huggingface/transformers@4.3.1"`) et importé *seulement* par `embedding.worker.ts`. Whisper reste sur la 3.8.1 : la dictée n'est pas touchée. Il faut vérifier que les deux versions d'onnxruntime-web cohabitent dans le plugin `local-ai-runtime`. **Premier jour de la phase : preuve de concept, sinon repli** (voir 3.2). |
| A.2 Modèle | `onnx-community/embeddinggemma-2-ONNX`, composant texte en q8 (`model_quantized`, 314 Mo, plus 32 Mo de tokenizer). La configuration vision et audio est retirée pour ne charger que le texte. Préfixes identiques à aujourd'hui. Sortie 768 dimensions : schéma inchangé. |
| A.3 Index en parallèle | Nouveau `model_key` (`embeddinggemma-2-text-q8-768-v1`). L'index est reconstruit en arrière-plan à côté de l'ancien ; la clé d'unicité inclut déjà `model_key`. La bascule a lieu quand le nouvel index est complet **et** que le jeu B passe ses seuils. L'ancien index et les anciens poids restent sur disque pendant une période de retour arrière. |
| A.4 Fin du refus à 2 048 tokens | Limite portée à 8 192 tokens. Les sections aujourd'hui refusées deviennent cherchables. |
| A.5 Toast | Nouvel identifiant de manifeste (`embeddinggemma2`), téléchargé en arrière-plan ; la recherche actuelle continue en attendant. |
| Coût d'entrée | **+346 Mo** à télécharger. Après validation, suppression des 1 261 Mo de la v1 : **solde −915 Mo**. |
| Mémoire et latence | Attendues : environ −2 Go au pic de recherche (q8 au lieu de fp32), encodage par extrait plus rapide. À mesurer en phase. |
| Réindexation | Temps par extrait à mesurer ; ordre de grandeur actuel : 0,9 s en fp32 sur 1 thread. Tâche interruptible et reprise là où elle s'est arrêtée. |
| Critère de livraison | Jeu B : Rappel@5, MRR@10 et nDCG@10 ≥ v1 ; 0 section refusée ; pic mémoire inférieur à celui d'aujourd'hui. |
| Réversible ? | Oui : on revient au `model_key` v1, dont l'index n'a pas été supprimé. |
| Coût | **5 à 7 jours.** |

### Phase B : génération avec Gemma 4 E2B

| Élément | Contenu |
|---|---|
| B.1 Gabarit | Une seule fonction de gabarit de conversation, choisie selon le modèle installé, au lieu des trois gabarits Gemma 3 écrits en dur (`patient-context.ts`, `localTextService.ts`, `document-reading.ts`). Gemma 4 : `<\|turn>user\n…<turn\|>\n<\|turn>model\n`. |
| B.2 Fichier | `generator/gemma4-e2b.task` à côté de `gemma3.task`, avec un nouvel identifiant de manifeste. `getLocalModelUrls` choisit Gemma 4 s'il est présent et vérifié, sinon Gemma 3. |
| B.3 Repli automatique | Si le chargement de Gemma 4 échoue (mémoire GPU insuffisante, WebGPU absent), la demande repart sur Gemma 3 avec un message neutre. Le vétérinaire n'est jamais bloqué. |
| B.4 Toast | « Amélioration de l'assistant », 2,0 Go, en arrière-plan, non bloquant. Aucun nom technique affiché. |
| B.5 Garde-fous | Inchangés (fidélité, posologie, citations). On ne les assouplit pas parce que le modèle est meilleur. |
| Coût d'entrée | **+2 004 Mo** ; Gemma 3 (700 Mo) est conservé comme repli tant que Gemma 4 n'a pas fait ses preuves sur le parc. |
| Mémoire (mesuré, M1 8 Go) | **+3,0 Go** pendant la génération, contre +2,0 Go pour Gemma 3. |
| Latence (mesurée, M1 8 Go, à chaud) | 12 à 13,5 s par note *avec* le double chargement actuel, 6 à 7 s de génération ; premier mot à 1,3 s (prompt court) ou 2,8 s (prompt long) ; 30 tokens/s. Après 0.4, attendu : environ 9 à 10 s. Gemma 3 fait 7 à 10 s par essai, mais altère la trame et déclenche un second essai, donc 14 à 20 s ressenties. **Gemma 4 E2B est probablement plus rapide en temps ressenti**, à confirmer sur le corpus. |
| Critère de livraison | Jeu A : acceptation au 1er essai ≥ +15 points, 0 posologie ou fait inventé, médiane ≤ 15 s sur le PC Windows 8 Go. Jeu C : citations pertinentes ≥ l'avant. |
| Réversible ? | Oui : supprimer le fichier E2B ou le désactiver fait revenir Gemma 3, qui n'a pas bougé. |
| Coût | **4 à 6 jours.** |

### Phase C : photos et PDF des dossiers (demande d'Aissa)

| Élément | Contenu |
|---|---|
| C.1 | Encodeur vision d'EmbeddingGemma 2 (q8, 195 Mo), chargé seulement pour indexer ou chercher des images. |
| C.2 | Photos de `consultation_documents` indexées dans le même espace que le texte (nouveau `source_type`, migration du `CHECK` de la table `embeddings`). |
| C.3 | PDF : texte extrait par PDF.js ou l'OCR existant, puis indexé en texte. Les pages scannées peuvent en plus passer par l'encodeur vision. |
| C.4 | Résultats affichés avec vignette ; jamais d'interprétation clinique automatique de l'image. |
| Coût d'entrée | **+195 Mo.** |
| Critère | Jeu D, seuil fixé avec Aissa. |
| Réversible ? | Oui : les vecteurs d'images portent leur propre `source_type` et se suppriment sans toucher au reste. |
| Coût | **6 à 8 jours.** |

### Hors plan, mais à inscrire au calendrier

- **Migration MediaPipe → LiteRT-LM JS** (`@litert-lm/core`). MediaPipe est en maintenance seule ; le jour où un correctif WebGPU ou WebView2 manquera, il faudra migrer. Les fichiers Gemma 4 existent dans les deux formats, donc la phase B ne rend pas cette migration plus difficile. Environ 5 jours, à planifier après B.
- **Assistant qui répond sur les dossiers** (recherche + génération + citations vérifiées). C'est l'usage qui rendra la phase A visible ; il suppose A et B.

## 3.4 Récapitulatif chiffré

| | Phase 0 | Phase A | Phase B | Phase C | Total |
|---|---|---|---|---|---|
| Développement | 4 à 5 j | 5 à 7 j | 4 à 6 j | 6 à 8 j | **19 à 26 j** |
| Vétérinaire | 0,5 j | — | — | (seuil avec Aissa) | 0,5 j |
| Téléchargement (solde) | 0 | −915 Mo | +2 004 Mo | +195 Mo | **+1 284 Mo**, soit 3,5 Go au total tant que le repli Gemma 3 est conservé, 2,8 Go ensuite |
| Mémoire au pic | inchangée | ≈ −2 Go sur la recherche (attendu) | +1,0 Go sur la génération (mesuré) | +0,2 à 0,5 Go à l'indexation d'images (attendu) | Pic du poste inférieur ou égal à aujourd'hui, la recherche ayant été le pire cas |
| Livrable seul | oui | oui | oui | oui (après A) | |
| Retour arrière | commits | `model_key` v1 conservé | fichier Gemma 3 conservé | `source_type` dédié | |

## 3.5 Mise à jour du 22 octobre au soir : configuration de référence à 16 Go

Ordre des essais : chez toi d'abord, puis chez Aissa. **Le portable d'Aissa (16 Go) est la configuration de terrain de référence** ; le PC Windows 8 Go reste la vérification de plancher (phase 0).

- **Le choix d'E2B par défaut ne change pas** : c'est le seul modèle qui tient sur le plancher 8 Go, et il était déjà fidèle à 100 % sur le cas mesuré.
- **E4B redevient candidat sur 16 Go.** Il avait été écarté sur 8 Go à cause du swap (+3,8 Go) ; sur 16 Go, ses +4,4 à +4,7 Go tiennent. Il reste environ 1,7 fois plus lent qu'E2B (repères officiels WebGPU).
- **Phase B amendée :** E2B et E4B mesurés tous deux sur le portable d'Aissa (mémoire, latence, jeux A et C) ; E2B seul sur le plancher 8 Go. L'option E4B n'est proposée qu'aux postes de 16 Go et plus, et seulement si son gain de qualité est net avec une note en 15 s au plus.
- Résultats de la phase 0 et détail du raisonnement : [../eval-phase0/README.md](../eval-phase0/README.md).
