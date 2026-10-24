# Phase B : Gemma 4 E2B pour la génération des notes (24 octobre 2026)

Gemma 4 E2B est installé à côté de Gemma 3 dans le moteur actuel (MediaPipe web, WebGPU), sans rien retirer. Un repli automatique vers Gemma 3 est en place et vérifié dans le vrai moteur. Les deux modèles sont mesurés sur le banc de la phase 0, dans le vrai moteur (WKWebView, M1 8 Go), avec les mêmes dictées et les mêmes trames. **Pas de bascule** : Gemma 3 reste le modèle par défaut (`DEFAULT_GENERATOR = "gemma3"`). Whisper, la recherche, ses index et ses calibrations n'ont pas changé.

## Verdict : deux critères sur trois manquent, pas de bascule

| Critère (tous requis) | Gemma 3 | Gemma 4 E2B | État |
|---|---|---|---|
| Acceptation au 1er essai, en hausse d'au moins 15 points | 25 % (3 sur 12) | 25 % (3 sur 12) | **non atteint** (+0 point) |
| Zéro fait inventé | 0 dans les notes livrées, mais 2 mots altérés dans les premiers jets (« croânial », « Examens réalisé ») | **0 dans toutes les sorties**, premiers jets compris | **atteint** |
| Médiane de génération d'une note ≤ 15 s | 7,1 s | **36,5 s** (de 19,8 à 63,7 s) | **non atteint** |

Les deux échecs ont une cause précise, mesurée. Aucune ne tient à la qualité de rédaction de Gemma 4.

1. **Le contrôle de fidélité refuse le travail que Gemma 4 fait bien.**
   - La note est construite de façon extractive : le code bâtit une trame à partir de la dictée et met dans « Subjectif » tout ce qui n'a pas d'intitulé explicite. Il exige ensuite que chaque rubrique de la note soit identique à la trame.
   - Gemma 4 range les phrases dans les bonnes rubriques, mot pour mot, sans en ajouter une seule. Le contrôle y voit des faits déplacés et refuse. Le second essai (« recopie exacte ») remet alors tout dans « Subjectif ».
   - Rejoué avec le vrai code de l'app sur les premiers jets :
     - avec le contrôle actuel, Gemma 3 et Gemma 4 sont acceptés sur 1 cas sur 4 ;
     - avec une règle « mêmes mots, rubrique libre », Gemma 4 passe sur 4 cas sur 4 (3 sur 4 si l'on exige en plus des phrases entières), et Gemma 3 reste à 1 sur 4.
   - Les échecs de Gemma 3 sont de vrais défauts : JSON coupé, mot altéré, phrase inventée (« Examens réalisé »).
2. **Le temps est perdu au chargement, pas à la rédaction.**
   - Chaque note recharge le modèle (la session ferme le worker en fin de note). Gemma 4 met 29 s en médiane à se charger (de 12 à 50 s), contre 2,8 s pour Gemma 3.
   - Une fois chargé, Gemma 4 rédige une note en 8,5 s en médiane, second essai compris (5,8 s pour un seul essai).
   - Le pic mémoire WebKit atteint 7,0 Go sur ce Mac de 8 Go (3,4 Go avec Gemma 3), avec 4 Go de swap : la lecture des 2 Go de poids se fait sous pression mémoire.
   - L'audit du 22 octobre mesurait 3 s de chargement à chaud dans Chromium. Ce n'est pas ce qu'on obtient dans le vrai moteur sur ce poste.

**Limite à garder en tête :** ce poste n'a que 4 cas, et le modèle est déterministe (température 0), donc les 3 répétitions de chaque cas ne mesurent que la latence. Un écart de 15 points se lit ici sur 4 cas. C'est un signal, pas une preuve statistique : le corpus d'Aissa reste nécessaire pour trancher.

## Mesures comparées (vrai moteur, M1 8 Go)

Code final, série `pb3f` / `pb4f`. Une première série (`pb3` / `pb4`), avant le correctif du repli, donne les mêmes résultats à quelques dixièmes près : 37,5 s de médiane pour Gemma 4, 8,3 s pour Gemma 3, même acceptation.

| | Gemma 3 1B | Gemma 4 E2B |
|---|---|---|
| Notes mesurées | 12 (4 cas × 3) | 12 (4 cas × 3) |
| Acceptées au 1er essai | 3 / 12 | 3 / 12 |
| Acceptées au final (après le second essai) | 6 / 12 | **9 / 12** |
| Mots absents de la dictée, premiers jets | 2 | **0** |
| Posologies inventées | 0 | 0 |
| Note complète, médiane (de … à …) | 7,1 s (4,0 à 12,1) | 36,5 s (19,8 à 63,7) |
| dont chargement du modèle, médiane | 2,8 s (2,4 à 4,2) | 29,1 s (12,2 à 49,8) |
| dont rédaction, médiane | 4,4 s (1,5 à 7,9) | 8,5 s (3,0 à 15,3) |
| Premier essai seul, médiane | 2,3 s | 5,8 s |
| Pic mémoire (processus WebKit) | 3,4 Go | 7,0 Go |
| Modèle réellement utilisé | Gemma 3 à chaque essai | Gemma 4 à chaque essai, aucun repli |
| Disque | 700 Mo | 2 004 Mo (en plus de Gemma 3, conservé) |

Corpus : il est identique pour les deux modèles.
- La dictée réelle conservée de la phase 0.
- Le cas fictif de la phase 0, réservé jusqu'ici à la latence.
- Deux notes validées de ce poste, relues comme des dictées : leur texte validé, rubriques mises bout à bout, sert de dictée. Ce sont des données réelles, mais pas des dictées vocales : elles sont étiquetées comme telles dans le banc.

Le poste ne contient pas d'autre dictée conservée.

## Notes côte à côte

Quatre cas, avec la dictée transmise et, pour chaque modèle, le premier jet puis la note réellement livrée : [notes-cote-a-cote.md](notes-cote-a-cote.md). Ce qu'on y voit :
- **Cas fictif.**
  - Gemma 3 écrit « ligament croânial » et laisse Évaluation et Plan vides : la note est refusée.
  - Gemma 4 produit d'emblée une note SOAP correcte : anamnèse en Subjectif, constantes en Objectif, suspicion en Évaluation, examens prévus en Plan, sans un mot changé. Le contrôle la refuse quand même, parce que la trame avait tout mis en Subjectif.
- **Dictée réelle.**
  - Gemma 3 renvoie un JSON coupé, deux fois : la note est refusée.
  - Gemma 4 range chaque partie dans sa rubrique, refusée par le contrôle, puis recopie tout dans Subjectif au second essai, ce qui est accepté.
  - Remarque : cette dictée contient déjà les intitulés « S · », « O · », « A · », « P · », que la trame ne reconnaît pas.
- **Note rénale.** Gemma 3 invente « Examens réalisé » au premier jet. Gemma 4 met l'ordonnance en Plan au premier jet, ce qui est refusé, puis la recopie.
- **Note allergie.** Les deux modèles sont acceptés au premier essai, avec la même note.

## Le repli automatique

- **Ordre d'essai.** Le moteur essaie d'abord le modèle choisi, puis Gemma 3.
- **En cas d'échec.** Si Gemma 4 ne se charge pas, ou échoue à son premier calcul (mémoire, pilote graphique, fichier abîmé), la note repart d'elle-même sur Gemma 3 dans un worker neuf, sans message d'erreur.
  - Un worker neuf est obligatoire, et c'est mesuré : après un échec, MediaPipe ne peut plus créer de moteur dans le même worker (« ModuleFactory not set »).
  - La session retient l'échec pour le second essai de la note. L'app le retient ensuite jusqu'à la fin de la séance, pour ne pas repayer un chargement voué à l'échec.
- **Vérifié dans le vrai moteur.** Le vrai fichier a été remplacé, le temps du test, par un fichier invalide de même taille, puis remis en place (empreinte SHA-256 vérifiée). Résultat : Gemma 3 a répondu en 7,9 s, sans erreur visible, avec la mention « repli » dans le rapport.
- **Ce qui a été corrigé en route.** La première version ne savait se replier que si le chargement échouait d'emblée. Ce test réel a montré l'autre cas (un fichier accepté, puis inutilisable) et le blocage de MediaPipe : les deux sont désormais couverts.

## Installation et réglages (noms techniques masqués)

- **Installation de base inchangée** : dictée, Assistant IA (Gemma 3), recherche, 2,2 Go.
- **Proposition en un tap.** Une fois la base installée, une proposition non bloquante apparaît une seule fois : « Nouvelle version de l'Assistant IA », 2 Go, avec « Télécharger » ou « Plus tard ». Le téléchargement se fait en arrière-plan. À la fin, « Essayer » l'active. Rien ne change sans ce geste.
- **Paramètres, Vos outils IA.** Une carte « Nouvelle version de l'Assistant IA » propose le téléchargement, puis un interrupteur « Utiliser la nouvelle version ». Si cet ordinateur n'a pas pu la charger, une ligne l'indique : « l'assistant actuel a pris le relais ».
- **Côté technique.** Le fichier est vérifié par SHA-256 à la source (`litert-community/gemma-4-E2B-it-litert-lm`, révision `1caa527`, licence Apache 2.0). Il est installé dans son propre dossier `generator4/`, si bien qu'une installation ne touche jamais au fichier de Gemma 3.

## Ce qui a changé dans le code

| Élément | Fichiers |
|---|---|
| Choix du modèle de rédaction : `DEFAULT_GENERATOR` (bascule), préférence, candidats dans l'ordre, gabarits Gemma 3 et Gemma 4 (`<\|turn>user … <turn\|>`, vérifié sur le gabarit officiel) | `local-ai/generator-choice.ts` |
| Les trois prompts (note, lecture de document, reformulation) n'écrivent plus le gabarit Gemma 3 en dur : le worker enveloppe le tour pour le modèle réellement chargé | `local-ai/patient-context.ts`, `documents/lib/document-reading.ts`, `services/localTextService.ts` |
| Worker : charge le modèle préféré, vérifie son premier calcul, signale un échec au lieu de le montrer, remonte le modèle utilisé | `workers/soap.worker.ts`, `local-ai/worker-protocol.ts` |
| Session : en cas d'échec de Gemma 4, même demande dans un worker neuf avec Gemma 3, retenue pour la suite de la note | `local-ai/inference-client.ts` |
| Statut `generator4Ready` (taille exacte), entrée de manifeste facultative, téléchargement ciblé (`only`), installation de base inchangée | `src-tauri/src/local_ai_models.rs`, `src-tauri/src/local_ai_download.rs`, `resources/local-ai/download-manifest.json`, `local-ai/models.ts` |
| Proposition en un tap, carte et interrupteur dans les Paramètres | `services/ai-model-provisioning.ts`, `services/ai-model-installation.ts`, `components/ai-model-install-prompt.tsx`, `components/ai-model-settings.tsx` |
| Banc : choix du modèle (`BAITARI_EVAL_GENERATOR`), répétitions (`BAITARI_EVAL_RUNS_A`), sortie brute et modèle de chaque essai, durées par essai | `scripts/eval-local-ai/eval.ts`, `vite.eval.config.ts`, `local-ai/soap-pipeline.ts` (rappel `onAttempt`) |

Les garde-fous ne sont pas assouplis : fidélité, posologies et citations sont inchangées.

## Tests

Suite complète : **158 fichiers, 1 225 tests unitaires verts**, typecheck et ESLint sans erreur, **tests Rust : 20 verts, 4 ignorés** (ceux qui exigent un téléchargement réseau ou des fichiers modèles choisis à la main). Nouveaux tests : choix du modèle et gabarits ; repli du worker (modèle refusé au chargement ou au premier calcul) ; relance par la session dans un worker neuf, retenue au second essai ; proposition et installation séparée de la nouvelle version ; manifeste (installation de base inchangée, entrée facultative de taille exacte).

## Options pour la suite (non appliquées, à décider ensemble)

| Option | Ce que disent les mesures | Compromis |
|---|---|---|
| A. Autoriser le reclassement mot pour mot : chaque phrase de la dictée, sans mot ajouté, retiré ou changé, peut changer de rubrique | Gemma 4 : 3 à 4 cas sur 4 acceptés au 1er essai, contre 1 sur 4 aujourd'hui ; Gemma 3 inchangé (1 sur 4) | Touche un garde-fou voulu : un plan de soins pourrait passer en « Examen réalisé ». Il faudrait au moins interdire ce sens-là et mettre en évidence le reclassement à la relecture. C'est la décision clé : sans elle, aucun meilleur modèle ne peut gagner sur l'acceptation. |
| B. Garder le modèle de rédaction chargé entre deux notes, comme la recherche en phase 0 | Rédaction seule : 8,5 s en médiane, une fois chargé (mesuré) ; le chargement de 29 s ne serait payé qu'une fois par séance (attendu, non mesuré en enchaînement) | Garde environ 3,5 Go occupés sur un poste de 8 Go ; libéré dès qu'une dictée ou une recherche demande la place |
| C. Mesurer sur le portable 16 Go d'Aissa, avec son corpus | — | Sans pression mémoire, le chargement devrait baisser (à mesurer). Son corpus donnera enfin une acceptation statistiquement lisible. |
| D. Faire reconnaître par la trame les intitulés « S · », « O · », « A · », « P · » | La dictée réelle les contient et la trame les ignore | Petit correctif, utile aux deux modèles ; sans changement de garde-fou |

## Données

Dans [donnees/](donnees/) : les rapports du banc des deux séries et le test de repli. On y trouve des identifiants, des durées et des scores, sans texte clinique. Les notes produites figurent seulement dans [notes-cote-a-cote.md](notes-cote-a-cote.md), sans nom de patient ni de propriétaire.

Commit : COMMIT_LIGNE
