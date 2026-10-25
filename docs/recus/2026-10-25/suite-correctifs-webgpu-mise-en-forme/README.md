# Suite des correctifs du test Aissa : WebGPU fp16 et mise en forme par le code (25 octobre 2026)

L'état de départ est celui de [correctifs-test-aissa](../correctifs-test-aissa/README.md) (commit `c1b7392`).

Toutes les mesures viennent du Mac M1 8 Go, dans le vrai moteur. Le binaire debug de Tauri tourne sur le port 5181 avec un dossier de données temporaire ; la base réelle n'a reçu aucune écriture. Aucun push.

| Lot | Verdict |
|---|---|
| A. WebGPU fp16 | **Critère non rempli, rien n'est branché dans l'app.** En fp16 sur WebGPU, Whisper medium produit du charabia sur les trois cas (taux d'erreur par mot de 0,98 à 11,4, aucun chiffre conservé) et la mémoire déborde (empreinte de 8,9 Go, swap à 12,3 Go). |
| B. Mise en forme par le code | **Livré.** La note acceptée reçoit son squelette par le code (puces, Plan numéroté), et le texte de la note porte les intitulés complets. Vérifié avec les deux générateurs sur le cas de référence complet : 8 contrôles sur 8 passent. La sortie de secours produit la même mise en forme. |

## Conditions

- **Poste.** M1 8 Go. L'instance `tauri:dev` du test tourne toujours (lancée le 24 octobre à 20 h 41, environ 1,5 Go). Le swap ne descend pas sous 3,3 Go hors banc.
- **Mémoire.** `footprint` (empreinte physique macOS) de tous les processus WebKit lancés par le banc, toutes les 3 s, plus le swap et le pourcentage de mémoire libre. Mesuré par `banc2.sh` (hors dépôt, décrit en note de reprise).
- **Audio.** Les trois cas du banc précédent, dictés par la voix française « Thomas » de macOS : `passage30` (28,6 s), `plan-gabarit` (17,2 s), `plan-reference` (38 s). Les taux d'erreur comparent des moteurs entre eux, ils ne mesurent pas une voix réelle au micro.
- **Usage réel.** Avant chaque dictée, une recherche charge le modèle de recherche (EmbeddingGemma), qui reste ensuite parqué comme après une recherche en consultation. Après chaque Plan, une note est générée par Gemma 4 sur le cas de référence. Par construction, ces modèles ne tournent jamais **en même temps** que Whisper : le verrou évince le modèle parqué avant la dictée. Ils occupent donc la mémoire tour à tour, et c'est ce que mesure le pic.

## Lot A — WebGPU fp16 pour la transcription

### Poids

`onnx-community/whisper-medium-ONNX`, même révision que le medium installé (`d3978248`), téléchargés avec ton accord :

| Fichier | Taille | SHA-256 |
|---|---|---|
| `encoder_model_fp16.onnx` | 614,7 Mo | vérifié contre Hugging Face |
| `decoder_model_merged_fp16.onnx` | 915,1 Mo | vérifié contre Hugging Face |

Ils sont posés dans `local-ai/whisper-fp16-banc/`, à côté du modèle installé, qui n'a pas été touché.

### Mesures

La référence WASM est celle du correctif précédent : medium q8, 4 threads, modèle gardé. Ces chiffres ont été remesurés dans cette session, en usage réel.

| Cas | WASM q8, usage réel : chargement / transcription / erreurs | WebGPU fp16, modèle seul : transcription (2 essais) | WebGPU fp16, usage réel : chargement / transcription / erreurs |
|---|---|---|---|
| passage30, 28,6 s | 17,8 s / **51,3 s** / taux d'erreur 0,033, chiffres intacts (« deux » en lettres) | 29,7 s et 9,4 s | 53,2 s / 28,4 s / **taux d'erreur 0,98**, 38,5, 92 et 20 perdus |
| plan-gabarit, 17,2 s | 14,2 s / **38,5 s** / taux d'erreur 0,154, chiffres intacts | 93,7 s et 92,3 s | 53,9 s / 108,9 s / **taux d'erreur 11,4** |
| plan-reference, 38 s | 12,7 s / **76,6 s** / taux d'erreur 0,160 (« seins de gouttes », comme au bilan précédent) | 14,2 s et 16,3 s | 39,9 s / 28,3 s / **taux d'erreur 1,0**, tous les chiffres perdus |
| Pic mémoire (page + GPU + app) | **7,7 Go**, swap 10,6 Go, mémoire libre jusqu'à 9 % | 9,5 Go, swap 12,2 Go | **8,9 Go**, swap 12,3 Go, mémoire libre jusqu'à 14 % |

Textes WebGPU fp16, identiques à chaque essai (sortie déterministe) :

| Cas | Transcription obtenue |
|---|---|
| passage30 | « Le propri- T- R, » |
| plan-gabarit | « N C C C C C… » jusqu'à la limite de génération, d'où les 93 à 109 s |
| plan-reference | « So é » |

Les temps courts de WebGPU sont donc ceux d'un texte avorté, pas d'une transcription plus rapide.

**Diagnostic complémentaire (mode « hybride »).** Encodeur fp16 sur WebGPU, décodeur q8 sur WASM, pour savoir d'où vient le charabia :
- **Temps.** Le premier mot arrive après 10 à 12 s au lieu de 17 à 25 s. Transcription : passage30 en 36 à 54 s, Plan de 38 s en 36 à 44 s. Pic mémoire de 6,3 Go.
- **Précision : elle recule.**
  - Le gabarit Plan est **coupé après sa première phrase** : « nettoyage du canal auriculaire droit à la solution cerum. », tous les chiffres sont perdus.
  - « 5 gouttes » devient « sainte goutte », « gémit » devient « jemi ».
  - Taux d'erreur par mot de 0,05 à 0,80, contre 0,03 à 0,16 en WASM.
- **Conclusion.** Le fp16 dégrade déjà la sortie de l'encodeur sur ce GPU. Le décodeur fp16 achève de la rendre illisible.

### Verdict, critère appliqué strictement

| Critère | Résultat |
|---|---|
| Transcription nettement sous la durée dictée, sur les trois cas | **Non.** Sans objet en fp16 pur (texte avorté) ; l'hybride reste au-dessus sur passage30 et autour de la durée dictée sur le Plan |
| Précision qui ne recule pas | **Non.** Charabia en fp16 ; troncature et chiffres altérés en hybride |
| Mémoire tenable à 8 Go avec le reste chargé | **Non.** Empreinte de 8,9 Go et swap de 12,3 Go en usage réel (WASM : 7,7 Go, déjà à la limite) |

**Rien n'est branché dans l'app.** L'écran garde Whisper medium q8 en WASM sur 4 threads, avec le modèle gardé. Seul le banc a reçu les options `dtype` (`q8` ou `fp16`) et moteur `hybride`, qui ne servent qu'à mesurer.

**Constat en usage réel, utile pour la suite.** Une recherche entre deux dictées évince le Whisper gardé, qui se recharge alors : 12,7 à 17,8 s à chaque dictée. Le gain du « modèle gardé » ne vaut donc que pour des rubriques dictées d'affilée.

La voie suivante envisagée, la transcription pendant la dictée, se décide ensemble et n'a pas été commencée.

## Lot B — Mise en forme de la note par le code

### Ce qui change

- **La note acceptée reçoit son squelette par le code** (`layoutSoapNote`), sur les deux chemins : la note générée et la sortie de secours. Cela donne une puce « - » par observation et un Plan numéroté « 1. », « 2. »… Les mots et leur ordre ne changent pas : le code ne fait qu'ajouter les marqueurs et couper aux fins de phrase.
- **Les intitulés complets sont écrits dans le texte de la note** (`soapNoteText`) :
  - « S — Subjectif (Ce que le propriétaire rapporte) »
  - « O — Objectif (Ce que le vétérinaire observe et mesure) »
  - « A — Évaluation (Diagnostic / Analyse) »
  - « P — Plan (Actions et suivi) »

  C'est le texte copié par l'assistant global. Ce sont aussi les titres des 4 rubriques dans la relecture.
- **La consigne interne de mise en forme est retirée.** L'option `layout` de `prepareSoapDraft` et la consigne de `createSoapPrompt` sont supprimées : le prompt est revenu exactement à celui de `c1b7392`. Le modèle ne fournit que le contenu.
- **Le contrôle de fidélité est inchangé** depuis le correctif des rubriques. La mise en forme intervient **après** l'acceptation, donc le contrôle compare toujours la sortie du modèle à la trame.

**Où vivent les intitulés.** La note SOAP est stockée en 4 champs, et chaque écran (panneau SOAP, export PDF) affiche déjà son propre libellé de rubrique. Les champs portent donc la structure en listes, et le texte assemblé de la note porte les intitulés. Écrire l'intitulé aussi en tête de chaque champ l'aurait doublé partout, par exemple « S · Subjectif » suivi de « S — Subjectif (…) » dans l'export. Si tu veux les intitulés complets dans l'export PDF du dossier, c'est un changement de libellé dans `patient-record-data.ts`, non fait ici.

### Vérification dans le vrai moteur (cas de référence, deux générateurs)

| Cas | Chemin | Gemma 3 | Gemma 4 |
|---|---|---|---|
| Note complète | note générée | acceptée au 1er essai (19,1 s) | acceptée au 1er essai (71,3 s) |
| Note complète | sortie de secours (dictée) | sans modèle | sans modèle |
| Gabarit Plan | note générée | acceptée au 1er essai (17,4 s) | acceptée au 1er essai (82,0 s) |
| Gabarit Plan | sortie de secours (dictée) | sans modèle | sans modèle |

Contrôles sur la note assemblée, avec le même résultat pour **les 8 lignes** :
- **intitulés présents dans le texte** : oui ;
- **canevas seul** : chaque rubrique, sans ses marqueurs, contient exactement les mots de la note acceptée, dans le même ordre ;
- **aucun mot ajouté ni altéré** : mêmes mots que la dictée ;
- **chiffres intacts** : chaque nombre dicté se retrouve dans le texte de la note (38.5, 92, 20, 32.5, 5 sur 9, 2 secondes, 2 semaines, 5 gouttes, 2 fois, 10 jours, 10 à 14 jours) ;
- **listes nettes** : puces en S, O, A ; numéros 1 à n en P.

Gemma 3 et Gemma 4 donnent **exactement le même texte** de note. La note complète assemblée est dans [donnees/report-b-reference.json](donnees/report-b-reference.json) (champ `assembled.text`).

**Une différence entre les deux chemins**, déjà connue au bilan précédent et hors de cette session : dans la note générée, la prescription revient en **dernier point du Plan (6.)**, et non à sa place dictée. La sortie de secours la garde à sa place (2.). La mise en forme, elle, est identique.

### Captures (instance isolée, Gemma 3, thème clair)

| Avant (`c1b7392`) | Après |
|---|---|
| [Note générée, haut](captures/avant-note-generee-haut.jpg) | [Note générée, haut](captures/apres-note-generee-haut.jpg) |
| [Plan en un bloc](captures/avant-note-generee-plan.jpg) | [Plan numéroté de 1 à 6](captures/apres-note-generee-plan.jpg) |
| — | [Sortie de secours, même mise en forme](captures/apres-sortie-de-secours-note.jpg) |

Le refus de la capture « sortie de secours » est **provoqué** par le serveur de capture (`BAITARI_CAPTURE_FORCE_REFUS=1`), comme au bilan précédent. Après correctif, le cas de référence n'est plus refusé naturellement.

## Tests

| Contrôle | Résultat |
|---|---|
| Suite complète | **162 fichiers, 1 250 tests verts** (référence 1 249 ; 1 nouveau : la note de référence assemblée a ses intitulés et ses listes, avec les mêmes mots et les mêmes chiffres que la dictée) |
| Typecheck (`tsc -b`) | 0 erreur |
| ESLint | 0 erreur |

## Livré, non livré

| Élément | État |
|---|---|
| Mise en forme déterministe des deux chemins, intitulés complets dans le texte | **Livré** |
| Consigne de mise en forme | **Retirée** |
| WebGPU fp16 | **Non livré** : critère non rempli sur la précision, la vitesse et la mémoire |
| Options de banc `dtype` et moteur `hybride` | Gardées pour rejouer la mesure ; l'écran ne les utilise pas |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `components/local-consultation-assistant.tsx` | Squelette posé par le code sur la note générée acceptée |
| `local-ai/soap-pipeline.ts`, `local-ai/patient-context.ts`, `local-ai/soap-layout.ts` | Consigne `layout` et `headedLayout` retirées |
| `workers/whisper.worker.ts`, `local-ai/worker-protocol.ts` | Précision `dtype` et moteur `hybride` pour le banc |
| `scripts/eval-local-ai/` | Mode usage réel (`BAITARI_EVAL_PARK_SEARCH`, `BAITARI_EVAL_NOTE_AFTER_PLAN`), contrôles `assembledChecks`, variante `dictee`, capture du Plan |
| `tests/modules/consultations/soap-layout.test.ts` | Test de la note de référence assemblée |

## Note de reprise

1. **Dictée sur 8 Go.** WebGPU fp16 est écarté par la mesure. La voie suivante, la transcription pendant la dictée, se décide ensemble.

   Un point mesuré dans cette session pèse sur ce choix : en usage réel, une recherche évince Whisper, qui se recharge en 13 à 18 s.

   Autre point : en usage réel, l'empreinte WASM monte déjà à 7,7 Go sur ce Mac, swap à 10,6 Go. Mais la machine porte aussi l'instance du test et les navigateurs.
2. **Prescription à sa place dictée dans la note générée.** C'est le dernier écart entre les deux chemins.
3. **Poids fp16 sur le disque.** Ils restent dans `~/Library/Application Support/com.baitari.vetera/local-ai/whisper-fp16-banc/` (1,53 Go, plus un clone APFS du décodeur q8) pour rejouer la mesure. On peut supprimer ce dossier sans effet sur l'app.
4. **Rejouer les mesures.**

   Lot A, via le banc `dictation` avec ces variables :

   | Variable | Valeur |
   |---|---|
   | `BAITARI_EVAL_WHISPER_FOLDERS` | `whisper-fp16-banc` |
   | `BAITARI_EVAL_WHISPER_DEVICE` | `webgpu` ou `hybride` |
   | `BAITARI_EVAL_WHISPER_DTYPE` | `fp16` |
   | Usage réel | `BAITARI_EVAL_PARK_SEARCH=1`, `BAITARI_EVAL_NOTE_AFTER_PLAN=1`, `BAITARI_EVAL_REFERENCE=<cas>` |

   Lot B, via le banc `reference` avec `BAITARI_EVAL_VARIANTS=guidee,dictee`.

   Le script `banc2.sh`, hors dépôt, ajoute à la boucle de `banc.sh` (décrite dans le bilan précédent) l'empreinte physique des processus WebKit lancés par le banc, mesurée par `footprint`.
