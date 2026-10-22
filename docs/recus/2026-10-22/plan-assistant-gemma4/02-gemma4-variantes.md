# 2. Gemma 4 et EmbeddingGemma 2 : faits vérifiés et coût variante par variante

Sources primaires consultées le 22 octobre 2026 : la fiche officielle `google/gemma-4-E4B-it`, les dépôts `litert-community/gemma-4-*-litert-lm` (tailles de fichiers lues par l'API Hugging Face, tableaux de performance officiels), `unsloth/gemma-4-*-GGUF`, `google/embeddinggemma-2` et `onnx-community/embeddinggemma-2-ONNX`, ainsi que la documentation MediaPipe LLM Inference Web.

## 2.1 Vérification des faits annoncés

| Affirmation de départ | Verdict | Détail |
|---|---|---|
| Sortie le 2 avril 2026, Apache 2.0, issu de la recherche Gemini 3 | **Confirmé** | Licence Apache 2.0 sur la fiche ; date de sortie reprise par la presse. MediaPipe 0.10.27 est publié le même jour. |
| E2B ≈ 2,3 Md effectifs, E4B ≈ 4,5 Md effectifs | **Confirmé, à compléter** | Avec les tables d'embedding par couche : **5,1 Md** (E2B) et **8 Md** (E4B). C'est ce qui pèse sur le disque et en mémoire. |
| 12B dense | **Confirmé** (« 12B Unified », 11,95 Md) | |
| 26B MoE, environ 4 Md actifs | **Confirmé** : 25,2 Md au total, **3,8 Md actifs**, 128 experts dont 8 actifs plus 1 partagé | Tous les experts doivent rester en mémoire : l'économie porte sur le calcul, pas sur la RAM. |
| 31B dense | **Confirmé** (30,7 Md) | |
| Texte + image sur toutes les tailles, audio sur E2B et E4B | **À corriger** | L'audio existe aussi sur le **12B**. Surtout : **les fichiers web (navigateur, donc notre moteur) d'E2B et E4B sont texte seul**. |
| Contexte de 128 000 à 256 000 tokens | **Confirmé pour les poids d'origine** (128 k pour E2B, E4B ; 256 k au-delà) | Les builds LiteRT annoncent « jusqu'à 32 k », et les bancs officiels utilisent 2 048 tokens. |
| Disponible via Ollama et llama.cpp, appels d'outils natifs | **Confirmé** | Hors sujet pour nous tant que l'on reste dans le webview (voir 2.3). |
| E4B tient sur un portable 16 Go ; 26B et 31B demandent 24 Go et plus | **Confirmé en ordre de grandeur** | Les GGUF Q4_K_M pèsent 16,95 Go (26B) et 18,32 Go (31B). |

## 2.2 EmbeddingGemma 2 existe et change la donne

Publié début octobre 2026 (dépôt Google créé le 14 septembre, export ONNX communautaire le 4 octobre). Licence Apache 2.0, architecture Gemma 4.

- 740 M paramètres au total, en composants **séparables** : texte 270 M, vision 170 M, audio 300 M. On charge seulement ce dont on a besoin.
- **Texte, images, vidéo et audio dans le même espace à 768 dimensions.** Une requête texte peut retrouver une photo.
- **Contexte 8 192 tokens**, contre 2 048 aujourd'hui, ce qui fait disparaître le refus « La rubrique dépasse la capacité de lecture locale ».
- Même dimension (768) : la colonne `embedding` (3 072 octets) et le schéma restent valables.
- Qualité texte multilingue : MTEB multilingue v2 à **61,36 contre 61,15** pour la v1. Le gain en texte pur est **négligeable**. L'intérêt est ailleurs : contexte, images, coût mémoire.
- Le float16 est interdit (NaN silencieux) : fp32, bf16, q8 ou q4 seulement.
- **Nécessite transformers.js 4.x** (architecture `embedding_gemma2`, absente de la 3.8.1 installée, qui ne connaît que `gemma3_text`). La dernière stable est la 4.3.1 (6 octobre 2026).

| Fichier ONNX (EmbeddingGemma 2) | Taille |
|---|---|
| Texte q8 (`model_quantized`) | 314 Mo |
| Texte q4 | 174 Mo |
| Texte fp32 | 1 084 Mo |
| Vision q8 | 195 Mo |
| Vision q4 | 109 Mo |
| Tokenizer | 32 Mo |

## 2.3 Ce que peut charger notre moteur

L'application génère dans un worker de webview (WKWebView sur macOS, WebView2 sous Windows) avec MediaPipe en WebGPU. Seuls les fichiers « web » sont utilisables sans changer de moteur :

| Variante | Fichier pour le moteur actuel (MediaPipe `.task`) | Pour LiteRT-LM JS (successeur) | Hors webview (GGUF Q4_K_M, llama.cpp) |
|---|---|---|---|
| Gemma 3 1B (actuel) | 700 Mo | — | — |
| **Gemma 4 E2B** | **2 004 Mo**, texte seul | 2 008 Mo | 3,11 Go (+0,99 Go pour la vision) |
| **Gemma 4 E4B** | **2 964 Mo**, texte seul | 2 969 Mo | 4,98 Go (+0,99 Go pour la vision) |
| Gemma 4 12B | aucun | 5 986 Mo | 7,12 Go |
| Gemma 4 26B A4B | aucun | 15 787 Mo | 16,95 Go |
| Gemma 4 31B | aucun | aucun relevé | 18,32 Go |

**Conséquence :** seules E2B et E4B sont des remplacements directs du fichier actuel. Le 12B exige de migrer vers LiteRT-LM ; le 26B et le 31B exigent un processus natif (llama.cpp en sidecar Tauri) et une machine de 24 Go et plus.

## 2.4 Coût variante par variante

Colonnes « mesuré » : Apple M1 8 Go, moteur réel, même séquence de chargement que l'application (voir [mesures/](mesures/)). Colonnes « publié » : tableaux officiels LiteRT-LM (M4 Max en WebGPU, et CPU Intel Lunar Lake), qui donnent l'ordre de grandeur sur une autre machine.

### Génération : note SOAP de test, moteur actuel, M1 8 Go (mesuré)

| | Gemma 3 1B (actuel) | **Gemma 4 E2B** | Gemma 4 E4B |
|---|---|---|---|
| Téléchargement | 700 Mo | **2 004 Mo** | 2 964 Mo |
| Chargé par le MediaPipe 0.10.29 installé | oui | **oui, sans mise à jour** | oui |
| Mémoire supplémentaire pendant la génération | +2,0 Go | **+3,0 Go** | +4,4 à +4,7 Go |
| Swap pendant la série | +0 Mo | +0,3 Go | **+3,8 Go** |
| Premier lancement à froid | 33,0 s | 30,2 s | 41,9 s |
| Note à chaud, prompt court (≈ 540 tokens) | 6,7 à 10,0 s | **11,9 à 12,7 s** | 33 à 35 s |
| Note à chaud, prompt long (≈ 1 350 tokens) | 9,7 s | 13,3 à 13,6 s | 35,7 s |
| …dont double chargement des poids | 3,1 à 5,5 s | 6,0 à 6,8 s | 12,9 à 13,2 s |
| Délai avant le premier mot (court / long) | 1,0 à 1,2 s / 2,9 s | **1,3 s / 2,7 à 2,9 s** | 8 à 12 s / 14 s |
| Vitesse de rédaction | 44 à 53 tokens/s | 30 à 33 tokens/s | 14 tokens/s |
| JSON valide | 7/7 | 6/6 | 4/4 |
| Fidélité à la trame | **4/5 sur chacun des 4 essais mesurés** (mots altérés) | **5/5 à chaque essai** | 5/5 à chaque essai |
| Temps ressenti par note, compte tenu du second essai déclenché par le contrôle de fidélité | ≈ 14 à 20 s (deux essais) | ≈ 12 à 13,5 s (un essai) ; ≈ 9 à 10 s après correction du double chargement | 33 à 36 s |

### Repères publiés (tableaux officiels LiteRT-LM, autre matériel)

| | E2B | E4B |
|---|---|---|
| WebGPU, MacBook Pro M4 Max : premier mot / rédaction / mémoire GPU | 1,09 s / 73 tok/s / ≈ 1,8 Go | 1,75 s / 44 tok/s / ≈ 3,3 Go |
| PC Intel Lunar Lake, GPU natif : premier mot / rédaction / mémoire | 0,29 s / 48 tok/s / 3,5 Go | 0,89 s / 25 tok/s / 7,1 Go |
| PC Intel Lunar Lake, CPU : premier mot / rédaction / mémoire | 2,4 s / 30 tok/s / 3,5 Go | 6,0 s / 17 tok/s / 9,4 Go |

Ces repères portent sur 1 024 tokens d'entrée et 256 de sortie, sans le temps de chargement. Ils confirment l'écart d'un facteur 2 environ entre E2B et E4B, et une empreinte de 7 à 9 Go pour E4B sur PC Windows, **soit plus que la mémoire totale d'un poste à 8 Go**.

### Variantes non chargeables par le moteur actuel

| Variante | Mémoire minimale réaliste | Latence attendue sur poste modeste | Verdict pour un poste de clinique 8 Go |
|---|---|---|---|
| 12B | ≈ 6 Go de poids web, plus le contexte | non mesurable sur 8 Go (swap permanent) | Non : ne tient pas en mémoire. Exigerait de plus LiteRT-LM. |
| 26B A4B (MoE) | ≈ 16 à 17 Go (tous les experts en mémoire) | — | Non : 24 Go minimum. Le faible nombre de paramètres actifs accélère le calcul, pas la mémoire. |
| 31B | ≈ 18 à 19 Go | — | Non : 24 Go minimum, et le plus lent de la famille. |

### Lecture

- **E2B** coûte +1 Go de mémoire et environ 2 s de plus par essai que Gemma 3, mais ne déclenche pas de second essai sur le cas de test. En temps ressenti, il est probablement *plus rapide* que l'actuel. **C'est la seule variante qui tient sur 8 Go sans swap notable.**
- **E4B** est aussi fidèle qu'E2B sur ce cas, mais trois fois plus lent et en swap lourd sur 8 Go. Il ne doit pas être le modèle par défaut. Il ne peut se discuter que comme option pour les postes à 16 Go, et seulement si le jeu d'évaluation lui trouve un gain de qualité net sur E2B. Sur une tâche extractive, c'est peu probable.
- Le gain de qualité n'est mesuré ici que sur **une seule dictée fictive**. Il est cohérent et reproductible (6 passages sur 6 pour E2B ; 4 essais sur 4 en défaut de fidélité pour Gemma 3), mais il doit être confirmé sur le corpus réel (phase 0).

## 2.5 Ce que cela implique pour le téléchargement par le toast

Le budget de 2 Go n'est plus une limite dure : le téléchargement est compté comme un **coût d'entrée unique**, non bloquant. Repères :

| Configuration distribuée | Dictée | Recherche | Assistant | Total | Écart avec aujourd'hui |
|---|---|---|---|---|---|
| Aujourd'hui | 254 | 1 261 (v1 fp32) | 700 (Gemma 3 1B) | **2 215 Mo** | — |
| Après la phase A (EmbeddingGemma 2 texte q8) | 254 | 346 | 700 | **1 300 Mo** | −915 Mo |
| Après la phase B (Gemma 4 E2B) | 254 | 346 | 2 004 | **2 604 Mo** | +389 Mo |
| Après la phase C (vision q8 pour les photos) | 254 | 541 | 2 004 | **2 799 Mo** | +584 Mo |
| Variante E4B au lieu d'E2B | 254 | 541 | 2 964 | 3 759 Mo | +1 544 Mo |

Avec une connexion de clinique à 20 Mbit/s (2,5 Mo/s), 2,6 Go représentent environ 17 minutes en arrière-plan, contre 15 minutes aujourd'hui. **La phase A rembourse l'essentiel du surcoût de la phase B.**

Le toast doit rester non bloquant : chaque modèle est vérifié (SHA-256) et activé séparément, et l'ancien reste en service jusqu'à ce que le nouveau soit complet et validé. Le manifeste et le code Rust le permettent déjà (identifiants `whisper`, `generator`, `embeddinggemma`) ; il faudra un identifiant par nouveau fichier pour que les deux versions coexistent pendant la transition.
