# 1. Audit de l'existant : ce qui tourne réellement

Passe d'audit sans modification du code de l'application. Sources : le code de la branche `feat/tableau-flux` (commit `84fa111`), le manifeste de téléchargement, les fichiers installés sur le poste de développement, une copie en lecture seule de la base réelle, et des mesures faites sur un Apple M1 à 8 Go avec le moteur réel de l'application (voir [mesures/](mesures/)).

## 1.1 Les trois modèles distribués

Le toast post-installation télécharge ce que liste `resources/local-ai/download-manifest.json`. Le code Rust (`src-tauri/src/local_ai_download.rs`) n'accepte que trois identifiants, uniquement depuis `huggingface.co` en HTTPS, avec contrôle SHA-256 de chaque fichier.

| Rôle (nom affiché) | Modèle exact | Format, précision | Moteur | Téléchargement |
|---|---|---|---|---|
| Dictée vocale | `onnx-community/whisper-small` | ONNX, encodeur et décodeur quantifiés q8 | transformers.js 3.8.1, WASM | 254 Mo |
| Recherche clinique | `onnx-community/embeddinggemma-300m-ONNX` | ONNX **fp32**, sortie 768 dimensions | transformers.js 3.8.1, WASM, **1 thread** | 1 261 Mo |
| Assistant IA | `litert-community/Gemma3-1B-IT`, fichier `gemma3-1b-it-int4-web.task` | MediaPipe `.task`, poids int4 | `@mediapipe/tasks-genai` 0.10.29, WebGPU | 700 Mo |
| **Total** | | | | **2 215 Mo** |

Constats :

- **Le budget de 2 Go est déjà dépassé aujourd'hui** (2,2 Go).
- **57 % du téléchargement sert à l'embedding**, le plus petit modèle (300 M paramètres), parce qu'il est livré en fp32. Les versions q8 (309 Mo) et q4 (197 Mo) du même modèle existent dans le même dépôt.
- Le poste de développement n'a pas la configuration distribuée : il a un Whisper *medium* q8 (986 Mo) importé à la main. Les mesures de dictée prises sur ce poste ne représentent donc pas une clinique.

## 1.2 Comment la génération est branchée

Un seul moteur de génération : `src/modules/consultations/workers/soap.worker.ts`. Toutes les fonctions qui génèrent du texte passent par lui via `LocalInferenceSession.create("soap", …)` (`local-ai/inference-client.ts`). Un verrou global (`model-lease.ts`) garantit qu'un seul modèle local tourne à la fois : la dictée, la génération et la recherche ne peuvent pas être simultanées.

| Fonction | Fichier d'entrée | Ce que fait le modèle | Garde-fous déterministes |
|---|---|---|---|
| **Dictée** | `hooks/use-local-consultation-ai.ts` (`start`/`stop`) | Rien : c'est Whisper. Gemma n'intervient pas dans la transcription. | Normalisation des mentions parlées (`normalizeSpokenMentions`) |
| **Note SOAP** | `use-local-consultation-ai.ts` (`generate`), `patient-context.ts` (`createSoapPrompt`) | **Mise en forme extractive.** Le code construit d'abord une trame SOAP déterministe (`buildDictationScaffold`) ; le modèle reçoit la trame comme « format strict à conserver » et renvoie un JSON à quatre clés. | Phrases de posologie retirées avant le modèle puis réinjectées mot pour mot ; JSON validé par zod ; **contrôle de fidélité** (`assertFaithfulSoap`) : toute phrase de la trame doit se retrouver ; un second essai avec un prompt « recopie exactement » ; rejet de toute posologie en sortie. |
| **Réponses sur un document** | `documents/lib/read-document-answer.ts`, `document-reading.ts` | Extraction de 1 à 8 citations (page + texte) répondant à une question, sur **un seul** document choisi par l'utilisateur (≤ 20 pages, ≤ 60 000 caractères ; PDF.js ou OCR Tesseract en amont). | Chaque citation est vérifiée contre le texte source ; second essai si échec. |
| **Assistant conversationnel** | `components/AIAgentChat.tsx` → `services/localTextService.ts` (`generateText`) | Réponse libre à partir de l'historique (8 derniers tours). **Aucun accès aux dossiers, aucune recherche.** | Rejet si une posologie apparaît. |
| **Reformulation de notes** | `services/geminiService.ts` (malgré son nom, 100 % local : il appelle `generateText`) | Correction, reformulation, résumé en puces. | Mêmes garde-fous que l'assistant. |
| **@mentions** | `local-ai/patient-mentions.ts` | Rien : expression régulière + résolution sur la liste des patients. Le prompt précise que « tu ne choisis pas le patient ». | Entièrement déterministe. |

Paramètres de génération : température 0, `topK` 1, graine fixe ; `maxTokens` = tokens d'entrée mesurés + réserve de sortie (≥ 256 pour une note, 512 à 768 sinon). Le gabarit de conversation Gemma 3 (`<start_of_turn>…<end_of_turn>`) est écrit en dur à **trois endroits** : `patient-context.ts`, `localTextService.ts` et `document-reading.ts`.

### Ce que cela implique pour un changement de modèle

1. **Pour la note SOAP, le modèle est cantonné à un rôle de copiste-formateur.** Un modèle plus intelligent n'a presque rien à ajouter ; il peut seulement *moins abîmer* la trame. Le gain attendu se mesure donc en taux de rejet du contrôle de fidélité et en seconds essais, pas en « qualité rédactionnelle ».
2. **La recherche sémantique n'alimente aucune réponse de l'assistant.** C'est une interface séparée (`patient-document-search.tsx`) qui affiche des extraits. L'assistant conversationnel n'a aucun contexte patient, et la lecture de document travaille sur un document choisi à la main. L'hypothèse de départ (« la recherche actuelle sert les réponses de l'assistant ») ne correspond pas au code.
3. Le cycle de vie est coûteux : **le modèle est rechargé à chaque demande**, et deux fois par demande. Le worker appelle `createFromOptions` avec `maxTokens: 1024`, mesure le prompt, puis `setOptions` relit les poids pour fixer le vrai `maxTokens`. Puis `close()`.

## 1.3 Comment la recherche est branchée

- `embedding-store.ts` : recherche hybride. D'abord une recherche lexicale française instantanée (dictionnaire vétérinaire, DCI, acronymes) sur six domaines ; ensuite, si le modèle est installé, une recherche vectorielle sur les sections SOAP, documents et protocoles uniquement. Les deux listes sont fusionnées, la correspondance textuelle passant en tête.
- `embedding.worker.ts` : préfixes officiels `task: search result | query:` et `title: none | text:`. **Refus explicite au-delà de 2 048 tokens** par section (« La rubrique dépasse la capacité de lecture locale »).
- Stockage : table `embeddings`, vecteurs de 3 072 octets (768 × float32), avec une colonne **`model_key`** dans la clé d'unicité (`embeddinggemma-300m-onnx-fp32-wasm-768-sections-v2`). Deux index de modèles différents peuvent donc coexister sans migration de schéma. C'est l'atout majeur pour une réindexation réversible.
- `embedTexts` crée une session, donc un worker, **à chaque appel** : chaque recherche recharge les 1,2 Go de poids.
- Photos et PDF des dossiers (`consultation_documents`, stockés en `data_url`) : **non indexés**. Seul le texte des notes et documents générés l'est.

## 1.4 Données réelles disponibles (copie en lecture seule de `baitari.db`)

| Table | Lignes |
|---|---|
| patients | 10 |
| consultation_soaps | 9 (longueur moyenne 68 caractères, maximum 382) |
| appointments | 50 (dont 2 avec des notes de plus de 20 caractères) |
| notes | 3 |
| documents | 1 |
| consultation_documents (photos, PDF) | **0** |
| embeddings | 4 (une seule note SOAP indexée) |

**La base de ce poste ne permet pas une évaluation statistiquement utile.** Le jeu d'évaluation doit tourner sur la base d'une clinique en activité (voir [04-jeu-evaluation.md](04-jeu-evaluation.md)).

## 1.5 Latence et mémoire mesurées (Apple M1, 8 Go)

Conditions : moteur réel (`@mediapipe/tasks-genai` 0.10.29 en WebGPU, transformers.js 3.8.1 en WASM 1 thread), mêmes paramètres et même séquence de chargement que les workers de l'application. Le banc tourne dans le navigateur Chromium intégré, pas dans WKWebView ; voir [mesures/](mesures/). Le système avait déjà 6,2 Go occupés et 4 Go de swap au départ, une situation réaliste pour un poste qui fait tourner d'autres logiciels.

Note SOAP de test (dictée fictive de boiterie, rédigée pour le banc, sans donnée patient) :

| Mesure | Gemma 3 1B |
|---|---|
| Premier lancement à froid (fichier hors cache disque) | **33,0 s**, dont 25,3 s pour la seconde lecture des poids |
| Lancement à chaud, prompt court (≈ 520 tokens) | 6,7 à 10,0 s au total |
| …dont chargement (deux lectures) | 3,1 à 5,5 s |
| …dont délai avant le premier mot | 1,0 à 1,2 s |
| Vitesse de rédaction | 45 à 53 tokens/s |
| Prompt long (≈ 1 350 tokens, 12 consultations d'historique) | 9,7 s ; premier mot à 2,9 s |
| Pic mémoire supplémentaire (processus GPU + rendu, simultané) | **≈ +2,0 Go** pour un fichier de 0,7 Go |
| JSON valide | 7 sur 7 |
| Fidélité à la trame | **4 phrases sur 5** à chaque essai : « ligament croisé crânial » devient « ligament croânial », « vomissement » devient « vomition » |

Le contrôle de fidélité de l'application rejetterait chacune de ces notes et lancerait un second essai : **la latence réelle d'une note est donc d'environ 2 × 7 à 10 s**, puis l'utilisateur obtient un brouillon issu du prompt « recopie exactement ».

Recherche sémantique :

| Mesure | EmbeddingGemma 300M fp32 |
|---|---|
| Chargement du modèle (payé à chaque recherche) | **6,1 s** |
| Encodage d'une requête | 0,21 s |
| Encodage d'un extrait de 135 tokens (indexation) | 0,90 s |
| Pic mémoire supplémentaire | **≈ +3,0 Go** |

**La recherche coûte plus de mémoire que la génération**, à cause du fp32. Sur un poste à 8 Go déjà chargé, c'est elle qui pousse le système en swap.

## 1.6 Risques de plateforme relevés

- **MediaPipe LLM Inference est en « maintenance only »** : Google recommande de migrer vers l'API JavaScript LiteRT-LM (`@litert-lm/core`). La dernière version stable de `@mediapipe/tasks-genai` est la 0.10.29 (juillet 2026) ; seules des préversions nocturnes 1.x sortent depuis.
- Les fichiers web de Gemma 4 sont **texte seul** (contrainte mémoire du navigateur, indiqué sur les fiches officielles). L'argument « Gemma 4 lit images et documents » ne s'applique pas au moteur actuel.
- Les postes de clinique typiques sont plutôt des PC Windows à 8 Go avec GPU intégré Intel (WebView2) que des Mac. Aucune mesure n'a été possible sur ce matériel dans cette passe ; c'est le premier trou à combler (phase 0).
