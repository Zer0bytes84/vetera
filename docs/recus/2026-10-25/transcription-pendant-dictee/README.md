# Transcription pendant la dictée (25 octobre 2026)

L'état de départ est celui des bilans [correctifs-test-aissa](../correctifs-test-aissa/README.md) et [suite-correctifs-webgpu-mise-en-forme](../suite-correctifs-webgpu-mise-en-forme/README.md) (commit `13543be`).

Toutes les mesures viennent du Mac M1 8 Go, dans le vrai moteur (WKWebView, binaire debug sur le port 5181, dossier de données temporaire). Les conditions sont celles de l'usage réel :
- avant chaque dictée, une recherche charge le modèle de recherche, qui reste ensuite parqué ;
- après chaque Plan, Gemma 4 génère la note.

Aucun push.

| Question | Verdict |
|---|---|
| Transcription pendant la dictée | **Critère non rempli, rien n'est intégré au parcours.** Attente après la parole de 29 à 51 s, contre quelques secondes visées. Cause dominante : chaque morceau coûte au moins 15 à 31 s de calcul, même pour 8 à 10 s de parole, si bien que la file prend du retard dès le premier morceau. |
| Éviction de Whisper par la recherche | **Corrigée.** Le micro s'ouvre tout de suite et Whisper se charge pendant que le vétérinaire parle. Après une recherche, l'attente avant le micro passe de 11 à 23 s à **0 s**. L'attente après la parole ne change pas. |

## Méthode du banc (`scripts/eval-local-ai/progressive-bench.ts`)

- **Parole simulée.** L'enregistrement est rejoué en temps réel : un morceau n'existe qu'une fois « prononcé ».
- **Découpe sur les silences.** Après une durée cible de 10 s ou 20 s, le banc coupe sur la trame de 20 ms la plus silencieuse, entre 1,5 s avant la cible et 0,5 s après. La coupe attend donc que ces 0,5 s aient été entendues.
- **Une file séquentielle.** Chaque morceau part au vrai worker Whisper (medium q8, WASM, 4 threads, modèle gardé) dès qu'il est découpé, pendant que la parole continue.
- **Le témoin.** Une cible de « 0 » donne un seul morceau envoyé à la fin, c'est-à-dire le comportement actuel, mesuré dans le même banc et les mêmes conditions.
- **Ce qui est enregistré.** Pour chaque morceau : sa mise en file, le début et la fin de son calcul, et son texte. Ces données permettent de traquer les mots perdus, doublés ou fusionnés aux coupures.
- **Audio.** Les trois cas habituels, dictés par la voix « Thomas » de macOS : `passage30` (28,6 s), `plan-gabarit` (17,2 s), `plan-reference` (38 s).

## Question 1 : l'attente après la fin de la parole

| Cas | Témoin : transcription à la fin | Morceaux de 10 s | Morceaux de 20 s |
|---|---|---|---|
| passage30, 28,6 s | **44,5 s** | 39,4 s (3 morceaux) | 44,4 s (2 morceaux) |
| plan-gabarit, 17,2 s | **32,7 s** | 42,0 s (2 morceaux) | 29,3 s (1 morceau) |
| plan-reference, 38 s | **54,6 s** | 50,9 s (4 morceaux) | 48,6 s (2 morceaux) |

**Le découpage ne fait pas disparaître l'attente** : au mieux, il gagne 4 à 6 s, et il la rallonge sur le gabarit à 10 s.

**Pourquoi** : le calcul de chaque morceau, mesuré.

| Morceau (10 s) | Parole | Calcul |
|---|---|---|
| passage30 | 0–8,7 s | 22,0 s |
| | 8,7–18,9 s | 20,6 s |
| | 18,9–28,6 s | 15,0 s |
| plan-reference | 0–10,3 s | 23,0 s |
| | 10,3–20,1 s | 21,5 s |
| | 20,1–29,7 s | 17,9 s |
| | 29,7–38,0 s | 16,0 s |
| plan-gabarit | 0–9,8 s | 30,6 s |

Chaque morceau coûte 15 à 31 s pour 8 à 10 s de parole. Le premier morceau de passage30, prêt à 10,5 s, n'est transcrit qu'à 32,5 s, alors que la dictée s'est terminée à 28,6 s. La file accumule le retard au lieu de le résorber.

**La cause dominante tient au moteur, pas au découpage.** Transformers.js complète chaque morceau à une fenêtre de 30 s avant l'encodeur (`feature_extraction_whisper.js`, `waveform = new Float32Array(length)`). Un morceau de 8 s paie donc tout l'encodeur : 15 s et plus en WASM 4 threads sur ce M1. Pour une attente résiduelle de quelques secondes, il faudrait :
- calculer chaque morceau en moins de temps qu'il n'en faut pour le dire ;
- et calculer le dernier en quelques secondes,

soit un Whisper au moins 5 à 10 fois plus rapide qu'aujourd'hui, avec la précision de medium.

**Ce qu'il faudrait pour lever la cause.** Aucune de ces pistes n'est mesurée, toutes sont à éprouver :
1. **Whisper natif dans la partie Rust de Tauri**, avec l'encodeur sur le GPU ou le Neural Engine du Mac (whisper.cpp avec Metal ou Core ML). L'encodeur ne serait plus exécuté en WASM. C'est le seul levier qui vise directement la cause. À mesurer sur ce Mac et sur le PC Windows plancher avant toute décision.
2. **Un encodeur ONNX acceptant une fenêtre plus courte que 30 s**, réexporté. Le gain viserait les petits morceaux, mais avec un risque de précision connu. À éprouver.
3. **Whisper small** reste écarté : précision insuffisante (bilan du 25 octobre). Le WebGPU fp16 aussi (bilan de suite).

## Question 2 : la précision, morceau par morceau

| Cas | Témoin : erreurs / chiffres | 10 s | 20 s |
|---|---|---|---|
| passage30 | 0,033 / intacts (« deux semaines » en lettres) | 0,016 / identiques | 0,016 / identiques |
| plan-gabarit | 0,154 / intacts | **0,256** : « 2 », « 10 », « 10 », « 14 » deviennent « deux », « dix », « dix », « quatorze » | 0,154 / identiques (un seul morceau) |
| plan-reference | 0,160 / « 5 gouttes » entendu « seins de gouttes » | 0,149 / « 5 » retrouvé, mais « 10 à 14 » écrit « dix à quatorze » | 0,160 / identiques au témoin |

**Ce qui a été traqué aux coupures**, par comparaison mot à mot avec la transcription complète du même moteur (`donnees/report-p-usage.rows.jsonl`) :
- **aucun morceau perdu, aucun morceau doublé** : les coupes tombent dans les silences ;
- **mais l'écriture change d'un morceau à l'autre**, faute du contexte précédent :
  - chiffres en lettres ou en chiffres selon le morceau ;
  - un « est » ajouté ;
  - des verbes passés à l'impératif (« planifiez », « appelez ») ;
  - des pluriels changés (« antifongique », « mouvements »).

Le critère « chiffres intacts » n'est pas tenu à 10 s sur deux cas sur trois.

## Question 3 : la mémoire et la concurrence

| Phase (usage réel, empreinte page + GPU + app) | Pic | Swap max | Mémoire libre min |
|---|---|---|---|
| Recherche, chargement de Whisper, dictée et transcription par morceaux | **7,9 Go** | 10,8 Go | — |
| Génération de la note juste après | **8,9 Go** | 12,3 Go | 13 % |

**Concurrence** : aucun conflit. Le verrou n'admet qu'un modèle à la fois, donc la génération attend la fin de la dernière transcription. Les 6 notes générées ont été acceptées au 1er essai, en 48 à 78 s. La transcription pendant la dictée n'ajoute pas de modèle : la mémoire reste celle de la transcription actuelle.

## Critère d'intégration, appliqué strictement

| Critère | Résultat |
|---|---|
| Attente résiduelle d'au plus quelques secondes sur les trois cas | **Non** : de 29 à 51 s |
| Précision au niveau de la référence | **Non à 10 s** (gabarit 0,256 contre 0,154, chiffres réécrits en lettres). Oui à 20 s, mais sans gain de temps |
| Mémoire tenable | Comme aujourd'hui : 7,9 Go en dictée, 8,9 Go en génération sur ce Mac chargé |

**Rien n'est intégré au parcours.** Le banc progressif reste dans `scripts/eval-local-ai/`, hors bundle, pour rejouer la mesure le jour où le moteur aura changé.

## Éviction de Whisper par la recherche : corrigée

**Avant.** Le clic sur « Dicter » chargeait d'abord Whisper, puis ouvrait le micro. Après une recherche, qui évince le modèle gardé, le vétérinaire attendait 11 à 23 s avant de pouvoir parler.

**Après** (`hooks/use-local-consultation-ai.ts`) :
- le micro s'ouvre dès que la session est réservée ;
- Whisper se charge en parallèle, pendant que le vétérinaire parle ;
- « Arrêter » attend la fin du chargement, si besoin, avant de transcrire ;
- un échec de chargement pendant l'écoute arrête la dictée et dit pourquoi, comme avant.

Mesures dans le vrai moteur (banc progressif, témoin, recherche avant chaque dictée) :

| Cas | Avant le micro : avant / après | Attente après la parole : avant / après |
|---|---|---|
| passage30 | 22,6 s / **0 s** | 44,5 s / 40,2 s |
| plan-gabarit | 12,4 s / **0 s** | 32,7 s / 28,9 s |
| plan-reference | 11,1 s / **0 s** | 54,6 s / 68,9 s |

Lecture de ces chiffres :
- **Le chargement est entièrement caché** : il finit avant la fin de la parole sur les trois cas, puisque le calcul démarre à la seconde où la parole s'arrête.
- **L'attente après la parole est celle de la transcription seule.** Ses écarts entre deux passages sont la variance déjà connue sur ce Mac : 72 à 95 s pour plan-reference au bilan du 25 octobre.
- **Du clic au texte complet, passage30 passe de 95,7 s à 68,8 s.**
- **Pic mémoire** de ce passage : 7,3 Go, swap 10,2 Go.
- **Ce que cela ne change pas** : la mémoire, puisque la recherche évince toujours Whisper. Garder les deux modèles résidents en même temps aurait dépassé le budget de 8 Go mesuré ci-dessus.
- **Si la dictée est plus courte que le chargement**, le vétérinaire attend la fin du chargement après « Arrêter ». Le total reste celui d'avant, simplement réparti autrement.

**L'interface ne bouge pas** : mêmes écrans et mêmes messages, la bannière « Écoute en cours » apparaît simplement plus tôt. Je n'ai donc pas fait de captures. Elles demanderaient de toute façon un vrai micro dans l'instance isolée, ce que le binaire de banc n'a pas.

## Tests

| Contrôle | Résultat |
|---|---|
| Suite complète | **163 fichiers, 1 251 tests verts** (référence 1 250) |
| Nouveau test | Le micro s'ouvre avant la fin du chargement du modèle. Avec l'ancien ordre, ce test resterait bloqué. |
| Typecheck (`tsc -b`) | 0 erreur |
| ESLint | 0 erreur |

## Livré, non livré

| Élément | État |
|---|---|
| Micro ouvert tout de suite, Whisper chargé pendant la parole (`use-local-consultation-ai.ts`) | **Livré** |
| Banc progressif : tâche `progressive`, découpe sur les silences, chronologie et texte de chaque morceau | **Livré**, hors bundle |
| Transcription pendant la dictée dans le parcours | **Non livré** : critère non rempli (attente, précision) |

## Note de reprise

1. **Pour que la dictée n'attende presque plus, il faut un moteur plus rapide, pas un meilleur découpage.** Prochaine étape à décider ensemble : mesurer un Whisper medium natif (whisper.cpp, Metal ou Core ML) appelé depuis Rust. Mesurer d'abord le temps d'encodeur par fenêtre de 30 s, sur ce Mac et sur le PC plancher, avant toute intégration.

   Si ce temps tombe à quelques secondes, le banc progressif est prêt à rejouer la mesure. Il lui faudra alors deux ajouts :
   - transmettre en invite le texte du morceau précédent, pour corriger les chiffres réécrits en lettres et les accords ;
   - un repli vers la transcription complète.
2. **Rejouer le banc.** Variables :

   | Variable | Valeur |
   |---|---|
   | `BAITARI_EVAL_TASKS` | `progressive` |
   | `BAITARI_EVAL_DICTATION` | liste des clips |
   | `BAITARI_EVAL_SEGMENTS` | par exemple `0,10,20` (0 = témoin) |
   | `BAITARI_EVAL_WHISPER_THREADS` | `4` |
   | `BAITARI_EVAL_PARK_SEARCH` | `1` (usage réel) |
   | `BAITARI_EVAL_LOAD_DURING_SPEECH` | `1` (chargement pendant la parole) |
   | Note après chaque Plan | `BAITARI_EVAL_REFERENCE=<cas>`, `BAITARI_EVAL_NOTE_AFTER_PLAN=1` |

   La mémoire est mesurée par `banc2.sh`, hors dépôt : il fait tourner le banc et relève l'empreinte physique des processus WebKit et de l'app (décrit dans le bilan de suite).
3. **Aucun autre chantier ouvert** dans cette session. Le lot 3, déjà validé par Aissa, reste planifié.
