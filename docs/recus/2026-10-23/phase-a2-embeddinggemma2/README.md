# Phase A2 : EmbeddingGemma 2 en index parallèle (23 octobre 2026)

Feu vert du 23 octobre. Démarche suivie : preuve de concept de l'alias transformers.js 4.3.1 d'abord, puis mesures dans le vrai moteur (WKWebView, M1 8 Go) **à filtres égaux** avec A1 : même découpage en 800 caractères, même classement (`rankPassages`), même seuil de 0,30, même garde-fou numérique. Seul l'encodage change. Aucun push. **Ni la v1 du modèle ni l'ancien index ne sont supprimés.**

## Verdict : la qualité recule sur les jeux publics, pas de bascule

| Critère A2 | Exigé | v1, extraits (A1, actif) | **v2, extraits (A2)** | État |
|---|---|---|---|---|
| Alias transformers.js 4.3.1 à côté de Whisper | fonctionne | — | dictée chargée avant et après la v2, v1 intacte | **atteint** |
| Pic mémoire en recherche | < 3,3 Go | ≈ 4,8 Go au banc (3,3 Go mesurés en phase 0) | **2,5 à 3,0 Go** | **atteint** |
| Requête à chaud | ≤ 0,2 s | 67 à 71 ms | **113 à 147 ms** | **atteint** |
| Qualité, PublicHealthQA (Rappel@5 / MRR) | ≥ v1 | 92 % / 81,1 | 91 % / **82,9** | mitigé (−1 / +1,8) |
| Qualité, Syntec | ≥ v1 | 94 % / 79,9 | **87 % / 71,9** | **non atteint** (−7 / −8) |
| Qualité, Alloprof | ≥ v1 | 56 % / 46,4 | **54 % / 42,0** | **non atteint** (−2 / −4,4) |
| Tes 19 questions validées | aucune régression | 17/19, MRR 88,9 | **18/19, MRR 97,2**, mais **2 régressions** : q9 classée 2ᵉ au lieu de 1ʳᵉ, question négative q11 qui renvoie un résultat | **non atteint** |
| Disque | — | 1 261 Mo | **346 Mo** | gain |
| Réindexation Alloprof (4 156 extraits) | — | 74 min (WASM) | **29 min** (WebGPU) | gain |
| Licence | libre ou permissive | Gemma (non conforme) | **Apache 2.0** | gain |

**La recherche reste sur la v1 en extraits** (`DEFAULT_SEARCH_GENERATION = "passages"`). L'index v2 est construit en parallèle, sous son propre `model_key`, uniquement sur les postes où EmbeddingGemma 2 est installé. Il ne sert que si on l'active explicitement (`setActiveSearchGeneration("passages2")`).

## Ce que la preuve de concept a révélé

1. **L'alias fonctionne.** `transformers-v4` (npm `@huggingface/transformers@4.3.1`) embarque son propre onnxruntime-web 1.31, servi sous `local-ai-runtime/onnx-v4/`. Whisper et la v1 restent sur transformers.js 3.8.1 et onnxruntime-web 1.22. Dans la même session : dictée prête en 12 à 15 s avant comme après, v1 inchangée.
2. **EmbeddingGemma 2 en q8, et même en q4, ne tourne pas en WASM.** Le modèle utilise l'opérateur `GatherBlockQuantized`, que le moteur WASM d'onnxruntime-web n'implémente pas. **Il tourne en WebGPU.** Conséquence pour le plancher : il faut WebGPU dans le webview (WKWebView récent, WebView2 avec GPU compatible). **Ce point n'est pas vérifié sur le PC Windows 8 Go à GPU Intel.** Sans WebGPU, la seule voie WASM serait la version fp32 (1 084 Mo), qui annulerait le gain de taille.
3. **Les cosinus d'EmbeddingGemma 2 sont décalés vers le haut** (0,69 pour un passage pertinent, 0,59 pour un passage hors sujet, contre 0,29 et 0,07 avec la v1). À filtres égaux, le seuil de 0,30 et le score lexical seul de 0,35, calibrés pour la v1, ne filtrent plus rien. Cela explique la question négative ratée. Cela fait aussi passer les sources sans vecteur (documents finalisés, produits, fiches) derrière tout résultat sémantique.

## Pourquoi le recul sur Syntec et Alloprof

C'est cohérent avec le challenge (Syntec −8 points de MRR, Alloprof −4) : sur ces textes, la v1 encode mieux le français que le composant texte de 270 M d'EmbeddingGemma 2. Le gain d'EmbeddingGemma 2 se voit sur la santé et sur tes dossiers. Il retrouve « diarrhée » malgré la faute « diarhée », et « IRC » sans le mot « chronique ». Mais ces deux corpus sont petits.

## Ta décision

1. **Rester sur la v1 en extraits** (situation actuelle). La recherche est la meilleure sur les jeux publics, mais elle tourne sous licence Gemma, non conforme à ta contrainte, et pèse 1 261 Mo.
2. **Activer la v2 après recalibrage de son seuil et du score lexical seul**, calés sur sa propre distribution de cosinus avec le banc. Il faudrait ensuite rejouer le banc, puis vérifier WebGPU sur le PC Windows plancher. Le recul sur Syntec et Alloprof resterait probablement, puisqu'il vient de l'encodage et non des filtres.
3. **Mesurer arctic-embed-l-v2** (Apache 2.0) dans les mêmes conditions. A3 l'a trouvé au niveau de la v1 en qualité, mais environ 3 fois plus lent en WASM.

## Ce qui a changé dans le code

| Élément | Fichier |
|---|---|
| Alias `transformers-v4` (4.3.1, version exacte) | `package.json`, `package-lock.json` |
| Runtime ONNX v4 servi à part (`onnx-v4/`) | `scripts/local-ai-runtime-plugin.mjs` |
| Chargement d'EmbeddingGemma 2, texte seul, q8, WebGPU (`V2_ENGINE`) ; v1 et Whisper inchangés ; message d'erreur détaillé en développement uniquement | `workers/embedding.worker.ts` |
| Détection du modèle v2 installé (`embedding2Ready`), fichiers et tailles vérifiés | `src-tauri/src/local_ai_models.rs`, `local-ai/models.ts` |
| Génération `passages2` (`model_key` `embeddinggemma2-text-q8-webgpu-768-passages800-v4`) ; correspondance génération → modèle ; index v2 tenu à jour seulement si la v2 est installée ; repli sur la v1 en extraits si la v2 manque | `local-ai/passage-search.ts`, `local-ai/embedding-store.ts`, `local-ai/search-generation.ts` |
| Banc : tâche `poc` (coexistence), modèle de l'index par extraits (`searchModel`), index par rubriques facultatif (`skipSections`) | `scripts/eval-local-ai/eval.ts`, `vite.eval.config.ts` |

Le modèle v2 est installé à la main sur ce poste (`local-ai/embeddinggemma2/`, révision `daa72c5`, empreintes SHA-256 conformes). Il n'est pas encore dans le manifeste du toast : ce serait l'étape de distribution, à faire seulement si tu choisis la v2.

## Tests

Suite complète : **155 fichiers, 1 208 tests verts**, typecheck et ESLint sans erreur, tests Rust de `local_ai_models` verts. Nouveaux tests :
- l'index v2 n'est tenu à jour que si son modèle est installé, et chaque génération est encodée avec son propre modèle ;
- les index v1 ne sont pas touchés par l'index v2 ;
- la recherche v2 interroge EmbeddingGemma 2, avec repli sur la v1 tant que la v2 manque.

## Données

Dans [donnees/](donnees/) : preuve de concept, tes questions et jeux publics avec la v2, sans texte clinique. Les chiffres v1 de référence viennent du bilan A1.

## Incident

En WebGPU, le calcul passe par le GPU et le CPU reste bas. Mon garde anti-veille l'a pris pour une mise en veille : il a ramené la fenêtre de debug au premier plan sept fois en 15 minutes avant que je l'arrête. Si cela t'a gêné pendant ce temps, c'était lui.
