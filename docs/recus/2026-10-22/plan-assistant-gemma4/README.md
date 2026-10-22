# Plan assistant : Gemma 4 et recherche (22 octobre 2026)

Passe d'audit et de plan. **Aucune modification du code de l'application.** Les mesures ont été prises hors application, avec le moteur réel, sur un Apple M1 à 8 Go.

| Document | Contenu |
|---|---|
| [01-audit-existant.md](01-audit-existant.md) | Ce qui tourne réellement : modèles, branchements, données, latences et mémoire mesurées |
| [02-gemma4-variantes.md](02-gemma4-variantes.md) | Faits Gemma 4 et EmbeddingGemma 2 vérifiés et corrigés ; coût variante par variante |
| [03-verdict-et-plan.md](03-verdict-et-plan.md) | Verdict argumenté sur l'hypothèse ; plan en phases chiffrées |
| [04-jeu-evaluation.md](04-jeu-evaluation.md) | Jeu d'évaluation en français sur données réelles en lecture seule, métriques et seuils |
| [mesures/](mesures/) | Résultats bruts, mode opératoire, banc reproductible |

## L'essentiel

**Ce qui tourne aujourd'hui.** Gemma 3 **1B** IT, poids **int4**, fichier MediaPipe web de 700 Mo, exécuté en WebGPU dans un worker. Le modèle est rechargé à chaque demande, et deux fois par demande. Il sert à la note SOAP (mise en forme *extractive* d'une trame construite par le code, avec contrôle de fidélité), à la lecture d'un document avec citations, à l'assistant conversationnel (sans accès aux dossiers) et à la reformulation. La dictée relève de Whisper small q8 ; les @mentions sont déterministes. La recherche utilise EmbeddingGemma 300M en **fp32** (1,26 Go, 57 % du téléchargement), rechargé à chaque recherche. **Elle n'alimente aucune réponse de l'assistant.** Total distribué : 2,2 Go.

**Mesuré sur M1 8 Go** (note de test fictive) :

| | Mémoire en plus | Note à chaud | Premier mot | Fidélité |
|---|---|---|---|---|
| Gemma 3 1B (actuel) | +2,0 Go | 7 à 10 s, **mais second essai systématique** | 1,0 s | 4/5, mots altérés |
| **Gemma 4 E2B** | **+3,0 Go** | **12 à 13,5 s, un seul essai** | **1,3 s** | **5/5** |
| Gemma 4 E4B | +4,4 à +4,7 Go, **+3,8 Go de swap** | 33 à 36 s | 8 à 14 s | 5/5 |
| Recherche actuelle | **+3,0 Go** | 6,1 s de chargement par recherche | — | — |

**Verdict sur l'hypothèse « génération d'abord, embeddings ensuite » : le découpage est bon, l'ordre non.** Les raisons :

1. La recherche ne sert pas l'assistant. Rien n'oblige donc à commencer par la génération, et c'est la recherche qui sera le prérequis d'un assistant qui répond sur les dossiers.
2. Les fichiers Gemma 4 utilisables par notre moteur sont **texte seul**. La demande d'Aissa (photos et PDF) relève d'**EmbeddingGemma 2**, sorti en octobre, qui place texte et images dans le même espace.
3. La recherche est aujourd'hui le plus gros consommateur de mémoire ; la passer en q8 libère la place pour un générateur plus lourd.
4. Une réindexation coûte plus cher chaque mois ; un changement de générateur, non.
5. Avant tout changement de modèle, il faut un jeu d'évaluation sur données réelles. La base de ce poste (9 notes, 0 photo) ne suffit pas.

**Plan recommandé** (détail dans le [document 3](03-verdict-et-plan.md)) :

| Phase | Contenu | Durée | Téléchargement | Retour arrière |
|---|---|---|---|---|
| 0 | Banc d'évaluation sur la base d'Aissa (lecture seule) ; poste Windows 8 Go de référence ; un seul chargement par note ; modèle de recherche gardé chargé | 4 à 5 j + 0,5 j vétérinaire | 0 | commits isolés |
| A | Recherche avec EmbeddingGemma 2 texte q8 ; index reconstruit en parallèle grâce à `model_key` ; fin du refus à 2 048 tokens | 5 à 7 j | −915 Mo | index v1 conservé |
| B | Génération avec Gemma 4 E2B dans le moteur actuel ; gabarit unifié ; repli automatique sur Gemma 3 | 4 à 6 j | +2 004 Mo | fichier Gemma 3 conservé |
| C | Photos et PDF des dossiers, encodeur vision d'EmbeddingGemma 2 | 6 à 8 j | +195 Mo | `source_type` dédié |

## Variante retenue : Gemma 4 E2B, et son coût complet

| Poste de coût | Valeur | Source |
|---|---|---|
| Téléchargement (coût d'entrée, une fois, via le toast, non bloquant) | **2 004 Mo** (`gemma-4-E2B-it-web.task`, SHA-256 `2cbff161…c5a5`) ; environ 13 min à 20 Mbit/s | API Hugging Face, fichier vérifié |
| Total distribué après les phases A, B et C | 2,8 Go (3,5 Go tant que Gemma 3 reste en repli), contre 2,2 Go aujourd'hui | calcul, §2.5 |
| Mémoire pendant la génération | **+3,0 Go** (+1,0 Go par rapport à Gemma 3) ; swap +0,3 Go sur un poste déjà chargé | mesuré, M1 8 Go |
| Latence par note | 12 à 13,5 s aujourd'hui, environ 9 à 10 s après la phase 0 ; premier mot à 1,3 s ; 30 tokens/s | mesuré, M1 8 Go |
| Latence ressentie face à l'actuel | probablement inférieure (pas de second essai sur le cas mesuré) | mesuré sur un cas, à confirmer (jeu A) |
| Moteur | aucun changement : MediaPipe 0.10.29 installé | mesuré |
| Code | gabarit de conversation à unifier (3 endroits), manifeste, choix du fichier, repli | audit |
| Développement | 4 à 6 jours (phase B), après la phase 0 | estimation |
| Risques | MediaPipe en maintenance seule (migration LiteRT-LM à planifier, fichier E2B disponible dans les deux formats) ; mémoire sur PC Windows 8 Go à GPU Intel **non mesurée** ; gain de qualité mesuré sur un seul cas | §1.6, §3.2 |

**Pourquoi pas les autres.** **E4B** : aussi fidèle qu'E2B sur le cas de test, mais trois fois plus lent et en swap lourd sur 8 Go ; les repères officiels sur PC donnent 7 à 9 Go d'empreinte. Il ne se discute que comme option pour les postes à 16 Go, si le jeu d'évaluation lui trouve un gain net. **12B, 26B, 31B** : 6 à 19 Go de poids. Ils ne tiennent pas en mémoire sur 8 Go et exigent un autre moteur (LiteRT-LM ou llama.cpp natif).

## Corrections apportées aux faits de départ

- Il existe aussi une variante **12B** avec audio : l'audio n'est pas réservé à E2B et E4B.
- Les fichiers web d'E2B et d'E4B, les seuls que charge notre moteur, sont **texte seul**.
- Le 26B MoE a 3,8 Md de paramètres actifs, mais **tous les experts restent en mémoire** (≈ 16 à 17 Go en Q4).
- Avec leurs tables d'embedding par couche, E2B et E4B comptent 5,1 Md et 8 Md de paramètres : c'est ce qui pèse sur le disque et en mémoire.
- **EmbeddingGemma 2 existe** (octobre 2026, Apache 2.0) : multimodal, contexte de 8 192 tokens, mais un gain négligeable en texte pur (MTEB multilingue 61,36 contre 61,15). Il impose transformers.js 4.x.
- Le budget de 2 Go était déjà dépassé (2,2 Go) avant tout changement.

## Ce qui n'a pas pu être vérifié dans cette passe

- Les mesures dans WKWebView et WebView2 : le banc a tourné dans Chromium.
- Un PC Windows 8 Go à GPU intégré Intel, le poste de clinique typique.
- La qualité sur données réelles : la base de ce poste est trop petite.
- EmbeddingGemma 2 lui-même : non téléchargé (seuls E2B et E4B étaient autorisés), donc non mesuré. Ses gains de mémoire et de vitesse sont attendus d'après les tailles de fichier, pas mesurés.
