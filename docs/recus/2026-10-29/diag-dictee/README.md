# Diagnostic de la dictée au vrai micro (29/10 au soir)

Ce bilan porte sur les deux problèmes relevés au test de bout en bout du 29/10 (`../fix-breches-workflow/README.md`, § 7). C'est un diagnostic seulement : aucun correctif n'est appliqué au produit.

- **P1.** Les premières secondes d'une dictée manquent dans la transcription.
- **P2.** Le générateur renvoie « La réponse de l'assistant n'est pas un JSON SOAP valide ».

Les deux causes sont prouvées par la mesure. Elles sont indépendantes l'une de l'autre.

## Ce qui a été mesuré, et comment

**P1 : deux rejeux au vrai micro dans l'app de mesure déjà autorisée.** L'app est `~/Library/Caches/baitari-eval/mesure/Baitari.app`, du build release de 14 h 56. Elle n'a pas été reconstruite, pour garder l'autorisation du micro.

- **Pilote.** Le pilote [p1/diag-p1.sh.txt](p1/diag-p1.sh.txt) est une copie de `workflow.sh`. Il ajoute trois choses :
  - des horodatages à la milliseconde ;
  - une scrutation toutes les 50 ms ;
  - un capteur qui crée un lien dur vers chaque `audio.wav` du dossier temporaire `baitari-dictee-<pid>-*`, avant que `dictation.rs` ne le supprime. On garde ainsi **le WAV exact envoyé à `whisper-cli`**, sans toucher au code.
- **Base.** La base est une copie `sqlite3` en `mode=ro` dans le HOME isolé `workflow-home`. Le chemin du signal est figé dans ce build, d'où ce HOME.
- **Comparaison.** Le script [compare-wav.py](../../../../scripts/eval-local-ai/compare-wav.py) compare le WAV envoyé au clip joué. Il calcule l'enveloppe en dB sur des trames de 20 ms, puis la corrélation de ces enveloppes pour situer le clip dans l'enregistrement. Il donne enfin, seconde par seconde du clip, l'écart de niveau entre l'enregistrement et le clip.
- **Contrôle hors ligne.** `whisper-cli` (le même binaire et le même turbo q8) transcrit en entier R1 et R2 à partir des clips propres.

**P2 : le banc de référence existant.** Le banc (`reference-bench.ts`, binaire debug, `BAITARI_DATA_DIR` vide) a tourné sur deux cas :

- les **transcriptions exactes** du micro2 (`micro2-mesures.json`, champ `dictated`) ;
- le cas écrit `otite-max.json`.

Les deux cas portent le **contexte exact** du panneau : Max, Chien, Berger Allemand, motif « Se gratte l'oreille droite depuis trois jours. ». Le générateur est Gemma 3, avec la variante guidée, comme dans le panneau.

## P1. Début de dictée perdu

### Cause prouvée

**Les ~3,4 premières secondes de chaque capture arrivent dans la page atténuées de 15 à 35 dB.** C'est le cas à chaque dictée, pas seulement la première. L'atténuation est calée sur **le démarrage de la capture**, et non sur le moment où le son commence. Le mot dit dans cette fenêtre est perdu par Whisper, ou mal reconnu.

**Rejeu 1.** La lecture commence 0,01 s après « Écoute en cours ».

| Position | Clip joué | Écart de niveau, secondes 0 / 1 / 2 / 3 / 4 du clip | Début transcrit |
|---|---|---|---|
| 1 | 5 s de silence + R1 | (silence) puis −1,2 dB dès la parole | **complet** (« Le propriétaire remarque… ») |
| 2 | R2 d'origine | −25,0 / −25,4 / −20,2 / −5,2 / −2,4 dB | complet cette fois (« Température 38.5 °C… ») |
| 3 | 5 s de silence + R2 | (silence) puis +0,1 dB | complet |
| 4 | R1 d'origine | −23,7 / −21,7 / −20,4 / −8,3 / −0,9 dB | **« Légère baisse… » : première phrase perdue**, comme au micro2 |

**Rejeu 2.** La lecture est **retardée de 2,5 s** après « Écoute en cours ». Les clips sont ceux d'origine.

| Position | Clip | Début du clip dans le WAV | Écart de niveau, secondes 0 / 1 / 2 du clip | Début transcrit |
|---|---|---|---|---|
| 1 | R1 | +2,90 s | −34,2 / −5,3 / −0,2 dB | complet |
| 2 | R2 | +2,76 s | −15,8 / −0,8 / +0,8 dB | complet |
| 3 | R3 | +2,76 s | −14,4 / −1,8 / −1,5 dB | « **Petite** externe droite… » (« Otite » mal reconnu) |
| 4 | R4 | +2,72 s | −18,9 / −3,2 / −3,3 dB | « Nettoyage minutieux… » : **« Soins au cabinet » perdu** |

Le rejeu 2 tranche entre l'entrée et la sortie :

- Si le haut-parleur se réveillait lentement, les ~3 premières secondes du clip seraient atténuées, quel que soit le moment de lecture.
- Ici, seule la première seconde du clip l'est : celle qui tombe avant ~3,4 s de capture. La remontée a lieu au même instant de capture qu'au rejeu 1.

**La perte est donc dans la chaîne d'entrée, pas dans le montage de test.**

Autre indice, au rejeu 1, position 1 : pendant les 5 s de silence numérique, le bruit de fond capté passe de −62 dBFS à −43 dBFS à 3,4 s. Tout le signal remonte d'un coup, bruit compris. Une réduction de bruit qui converge ferait l'inverse : elle baisserait le bruit.

Ce schéma explique aussi les observations du micro2. Les premiers mots de R3 (« Autite ») et de R4 (« Soin ») tombaient dans la fenêtre atténuée, mais Whisper les a encore reconnus, de travers. R1 et R2 y ont perdu une phrase entière.

### Hypothèses écartées

- **Capture démarrée après l'affichage « Écoute en cours ».** Écartée. Le premier échantillon non nul arrive entre 0,05 et 0,16 s dans le WAV, et le bruit de la pièce est enregistré dès le début. Le début de capture déduit (écriture du WAV moins sa durée) tombe entre +0,05 et +0,31 s après l'affichage. C'est une borne haute, qui inclut le traitement de l'arrêt. Le clip apparaît à +0,28 à +0,42 s dans le WAV pour une lecture lancée à +0,01 s. Le code le confirme : `setPhase("listening")` n'est appelé qu'après le branchement du `ScriptProcessor` (`use-local-consultation-ai.ts`).
- **Normalisation ou découpe avant `whisper-cli`.** Écartée. Le WAV envoyé dure toute la capture : 20 à 54 s pour des clips de 15 à 52 s, rien n'est rogné au début. `normalizeMicrophoneAudio` applique un seul gain et un seul centrage pour tout l'enregistrement. `resampleAudio` est un filtre uniforme. Aucun des deux ne peut atténuer le début seul.
- **Whisper lui-même.** Écarté comme cause première. Sur les clips propres, R1 et R2 sont transcrites en entier. Sur le WAV envoyé du rejeu 1, position 4, `whisper-cli` hors ligne redonne « Légère baisse… ». La phrase manque donc déjà dans le signal qu'il reçoit.
- **Montage `afplay` et haut-parleur du Mac.** Écarté par le rejeu 2 (ci-dessus).
- **Premier réveil du périphérique audio seulement.** Écarté. L'atténuation se répète aux positions 2, 3 et 4, après chaque nouveau `getUserMedia`. Chaque dictée ouvre et ferme son propre flux.

### Ce qui reste à isoler

La fenêtre de ~3,4 s vient de l'amont de la page : traitement vocal de WebKit et Core Audio, ou montée du gain du périphérique. Le composant exact n'est pas isolé.

- **Ce qu'il faudrait tester.** La contrainte `noiseSuppression: true` reste active dans ce build. On ne sait pas si `echoCancellation` y était coupé : la recette documentée (`../../2026-10-28/port-dictee-original/README.md`) l'ajoute, mais les ressources embarquées du binaire ne permettent pas de le vérifier. La mesure qui tranche est un build de capture avec `noiseSuppression: false`, puis un autre avec `echoCancellation: false`, rejoués avec le même pilote.
- **Ce que ça demande.** Un nouveau build change l'identité de l'app : macOS redemandera l'autorisation du micro, et il faudra que tu cliques.

Le clic « Dicter » n'a pas été horodaté (pas de build instrumenté, pour la même raison). Il n'intervient pas dans la perte mesurée ici, puisque la lecture attend l'affichage. En usage réel, en revanche, le délai entre le clic et « Écoute en cours » s'ajoute à la fenêtre atténuée. Il était de 2,77 s au passage `run2` du 28/10.

### Correctif proposé (non appliqué)

1. **Ouvrir le micro une seule fois par dictée guidée.** Garder le `MediaStream` et l'`AudioContext` ouverts pour les quatre rubriques. Aujourd'hui, `prepareMicrophone` est rappelé à chaque rubrique, et chaque rubrique repaie la fenêtre de ~3,4 s. Ainsi, seule la première ouverture la paierait.
2. **N'afficher « Écoute en cours » qu'une fois le signal stable.** Ouvrir la capture dès le clic, comme aujourd'hui. Pendant les ~3,5 premières secondes, ou jusqu'à ce que le niveau mesuré par `createLevelMeter` cesse de remonter, afficher « Préparation du micro… ». Le vétérinaire ne commence à parler qu'une fois le signal juste.
3. **Préparer le micro dès l'ouverture du panneau de dictée,** si l'autorisation est déjà accordée. Cela supprime l'attente du point 2 pour la première rubrique.

Le point 1 seul suffit pour R2 à R4. Pour R1, il faut le point 2 ou le point 3.

## P2. « La réponse de l'assistant n'est pas un JSON SOAP valide »

### Cause prouvée

L'échec se déroule en trois temps.

1. **La trame envoyée au modèle a deux sections vides.** Whisper rend R1 et R4 en phrases longues, reliées par des virgules, là où le texte tapé met des points. Or le filtre de posologie (`containsDosage`, appliqué **phrase par phrase** par `prepareModelDictation`) retire toute phrase qui contient un mot comme « administré » ou « traitement » suivi d'un nombre dans les 160 caractères.
   - **R1** n'est qu'une seule phrase (« …traitement antiparasitaire à jour, administré il y a deux semaines. »). Elle est retirée **en entier**.
   - **R4** compte deux phrases, retirées toutes les deux.
   - **Résultat :** dans la trame, `subjective` et `plan` sont vides (0 caractère), contre 247 et 488 caractères pour le cas écrit. Dans le cas écrit, seule la phrase fautive est retirée. Le code restitue ces rubriques après coup. Le modèle, lui, reçoit deux sections vides.
2. **Essai 1 : un JSON valide, mais non conforme.** Face à ces sections vides, Gemma 3 les remplit. Il recopie l'examen dans `subjective`, invente un plan (« À investiguer si les récidives persistent. ») et ajoute trois clés : `notes`, `context` et `date`, ces deux dernières tirées du contexte. Le schéma strict refuse cette réponse (`SoapFormatError`). L'assistant relance alors un second essai.
3. **Essai 2 : la réponse s'arrête au milieu d'une chaîne.** La consigne simplifiée est « recopie exactement la trame ». Le modèle recopie l'examen dans `subjective`, `objective` et `plan`, puis **termine son tour de lui-même** au milieu de la chaîne `plan` : il manque le guillemet fermant, l'accolade et la clôture ```` ``` ````. `JSON.parse` échoue, d'où le message affiché.

Les sorties brutes des deux essais sont dans [p2/report-dicte-1.json](p2/report-dicte-1.json) (champ `outputs`). L'entrée exacte est dans [otite-max-dicte-micro2.json](../../../../scripts/eval-local-ai/cas-reference/otite-max-dicte-micro2.json).

### Mesures

| Passage | Cas | Résultat | Jetons, essai 1 | Jetons, essai 2 |
|---|---|---|---|---|
| `dicte-1`, `dicte-2`, `dicte-jetons` | dicté micro2 | refus, 26,7 à 31,6 s | entrée 860, sortie 360, capacité 2 200 | entrée 819, sortie 581, capacité 2 200 |
| `dicte-4096` | dicté micro2, capacité forcée à 4 096 | refus, 28,4 s, **sorties identiques octet pour octet** | 860 / 360 / 4 096 | 819 / 581 / 4 096 |
| `ecrit`, `ecrit-jetons` | écrit (`otite-max.json`) | **acceptée au 1er essai**, 14,7 à 15,8 s | entrée 1 254, sortie 429, capacité 2 722 | (aucun) |

Les comptes de jetons sont ceux du moteur (`sizeInTokens`). Ils remontent par une transformation de build du banc seul (`BAITARI_EVAL_DIAG_TOKENS`, `BAITARI_EVAL_DIAG_CAPACITY` dans `vite.eval.config.ts`).

**Reproductible :** oui, de façon déterministe. Le moteur tourne avec `topK: 1`, `temperature: 0` et `randomSeed: 42`. Sur les cinq passages au banc, les deux essais sont identiques octet pour octet. Le temps du banc (26,7 à 31,6 s) correspond aux 28,9 s de l'app.

**Même lien dans les deux rejeux du micro de ce soir,** chacun avec ses propres transcriptions :
- le rejeu 1 a été refusé en 28,6 s : sa trame avait `plan` vide, car R1 d'origine, en 4ᵉ position, n'est qu'une seule phrase avec « administré il y a deux semaines » ;
- le rejeu 2 a été accepté, puis validé et facturé : sa trame n'avait aucune section vide.

Sur ces trois cas, le refus tombe exactement quand la trame a une section vide.

### Hypothèses écartées

- **Limite de jetons ou troncature.** Écartée. L'essai 2 s'arrête à 1 400 jetons sur 2 200. Avec une capacité forcée à 4 096, il s'arrête au même caractère.
- **Texte hors JSON.** Écarté. La clôture ```` ```json ```` d'ouverture est retirée par `parseGeneratedSoap`, et rien ne suit l'objet à l'essai 1.
- **Échappement.** Écarté. L'essai 1 se lit sans erreur. L'essai 2 n'a pas de caractère mal échappé : il s'arrête avant la fin de la chaîne.
- **Contexte de la consultation.** Écarté. Le même contexte passe avec le texte écrit.
- **Début perdu (P1).** Ce n'est pas la cause : R1 complète, avec « Le propriétaire remarque… » (rejeu 1, position 1), garde le même défaut. Le reste de R1 forme une seule phrase, retirée en entier.

### Correctif proposé (non appliqué)

1. **Filtrer les posologies par proposition, et non par phrase, quand la dictée vient de Whisper.**
   - **Principe :** découper aussi sur les virgules et les points-virgules avant `containsDosage`, puis retirer seulement la proposition fautive. Pour R1, seule « administré il y a deux semaines » serait retirée, comme dans le cas écrit. Pour R4, seules les propositions qui portent une quantité ou une fréquence le seraient, comme « 5 gouttes dans l'oreille droite » ou « 2 fois par jour pendant 10 jours ». La liste exacte reste à mesurer.
   - **Garde-fou :** la vérification de la sortie (`parseGeneratedSoap`, `assertFaithfulSoap`) ne change pas.
   - **Fichiers concernés :** `treatment-routing.ts` et `dictation-scaffold.ts`.
2. **Ne pas envoyer au modèle une section que le code a vidée.** Si la trame a une section vide alors que la rubrique dictée ne l'est pas, ne demander au modèle que les sections non vides, puis réassembler. On peut aussi sauter le modèle pour cette section, comme le fait déjà le cas « rien pour le modèle ». Un 1B à décodage glouton remplit les cases vides : c'est la cause directe des deux essais ratés.
3. **À part, pour la lisibilité :** le message final parle de JSON invalide alors que l'essai 1 était un JSON bien formé, refusé pour des clés en trop. Garder la raison du premier refus aiderait le diagnostic. Ce point est d'ordre secondaire.

Avec le point 1 seul, R1 et R4 du micro2 garderaient du contenu dans leur section. Il faut le vérifier par un passage au banc sur ce même cas avant de conclure.

## Fichiers

- **`scripts/eval-local-ai/compare-wav.py`** : comparaison du WAV envoyé et du clip joué.
- **`scripts/eval-local-ai/cas-reference/otite-max-dicte-micro2.json`** et **`otite-max-ecrit-contexte.json`** : les cas P2 avec le contexte du panneau.
- **`scripts/eval-local-ai/reference-bench.ts`** : contexte facultatif par cas et relevé des jetons, sans effet si absents.
- **`scripts/eval-local-ai/vite.eval.config.ts`** : transformation de diagnostic des jetons, banc seul.
- **`p1/`** : pilote, journaux horodatés, `results.json` et comparaisons seconde par seconde des deux rejeux.
- **`p2/`** : pilote du banc et rapports complets, avec trame, sorties brutes et jetons.

Les WAV envoyés (8 fichiers) restent hors du dépôt, dans le dossier scratchpad de cette session : `p1/run1/envoye-N.wav` et `p1/run2-retard/envoye-N.wav`.

Aucun fichier du produit n'est modifié. La base réelle n'a été lue qu'en `mode=ro`, pour en faire la copie.
