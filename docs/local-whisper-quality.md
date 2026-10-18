# Dictée locale : modèles et précision constatée

Vérification du 8 octobre 2026, avec `tauri dev` pour l’application et les vrais workers du projet dans Chromium pour les mesures reproductibles. Aucun build release n’a été effectué pour ce chantier.

## Modèles préparés et installés

Le modèle de dictée installé sur cette machine est **Whisper medium multilingue, ONNX q8**. Les téléchargements publics ont été réalisés pendant la préparation, séparément de l’application. La fonctionnalité ne télécharge rien et n’utilise aucun service distant.

| Modèle | Dépôt et révision vérifiés | Fichiers du bundle, hors manifeste/licence | Usage |
| --- | --- | --- | --- |
| Medium q8 | [onnx-community/whisper-medium-ONNX](https://huggingface.co/onnx-community/whisper-medium-ONNX), `d3978248a6b5de6df7ec29ddfbde3993845fa806` | 991 549 428 octets | Installé dans les données locales de Baitari |
| Small q8 | [onnx-community/whisper-small](https://huggingface.co/onnx-community/whisper-small), `36050c46d777d46dc4b5f43f6d90574fc38f8732` | 253 466 530 octets | Alternative plus rapide, disponible sur le Bureau |
| Base q8 | `onnx-community/whisper-base`, `1846881b6b3a3024392c1eea3ad983695bc23925` | 81 284 108 octets | Comparaison historique ; plus accepté pour une nouvelle importation |

Les dossiers complets se trouvent sur le Bureau sous `whisper-medium` et `whisper-small`. Medium est copié dans `~/Library/Application Support/com.baitari.vetera/local-ai/whisper`. L’ancien modèle est conservé dans `whisper-base-backup-2026-10-08`. Le fichier de génération des notes n’a pas été remplacé.

Chaque bundle contient `config.json`, `generation_config.json`, les fichiers de tokenizer, `preprocessor_config.json`, les deux fichiers ONNX q8 et un manifeste. Les fichiers LFS ont été comparés à leur empreinte SHA-256 publiée ; les petits fichiers à leur identifiant Git blob. Le manifeste conserve aussi les empreintes SHA-256 de tous les fichiers téléchargés. Les copies installées ont été revérifiées avant le remplacement du dossier.

Empreintes des deux poids medium :

```text
onnx/encoder_model_quantized.onnx
313154567 octets
2507d090bf9f1d468f4c1cef274aa34eda025894118f5476e24a0d80308a5315

onnx/decoder_model_merged_quantized.onnx
672556229 octets
a524f9f1759143e1a8ec3ca3559594ced7282e2061e23ef2fd602bf1813bbde1
```

Les dépôts ONNX sont publics, sans token ni accès restreint. La licence upstream de [Whisper OpenAI](https://github.com/openai/whisper/blob/main/LICENSE) est MIT ; une copie et sa provenance figurent dans les bundles. Le dépôt medium communautaire ne contient pas de model card précisant davantage la provenance de sa conversion.

## Audio et langue

- Capture mono via le microphone, fréquence idéale de 16 kHz ; la fréquence réelle de l’`AudioContext` est utilisée pour le rééchantillonnage.
- Conversion vers PCM à 16 kHz, retrait du décalage continu, ajustement du niveau avec gain plafonné à ×4 et crête cible de 0,8. Le silence ou un signal non fini est rejeté. L’ajustement du niveau préserve la durée et les pauses.
- **Français** reste le choix par défaut. **Automatique** choisit la langue dominante de la prise ; le choix est conservé localement et capturé au démarrage de chaque dictée.
- Le bouton **Assistant** ouvre le panneau sans allumer le micro ; **Dicter** commence la capture après le chargement du modèle.
- Une prise est limitée à trois minutes. Le texte reconnu est affiché et peut être corrigé avant l’envoi à la préparation SOAP.

Le moteur installé est `@huggingface/transformers` **3.8.1**, ONNX Runtime WASM q8, un thread. Dans cette version, `_retrieve_init_tokens` utilise l’anglais lorsque `language` est absent et indique que la détection n’est pas implémentée. Le code ne se repose donc pas sur cette omission : il passe les caractéristiques audio et le token de début au modèle, choisit le meilleur logit parmi ses véritables tokens de langues, puis passe explicitement cette langue à la transcription avec `task: "transcribe"` et `do_sample: false`.

Cette détection utilise le début de la prise, jusqu’à 30 secondes, et encode de nouveau l’audio pour la transcription. Elle a un coût de calcul supplémentaire et ne traite pas séparément chaque changement de langue à l’intérieur d’une phrase. Aucun modèle de traduction ni correcteur cloud n’intervient.

## Mesure sur des voix réelles

Les extraits ont été choisis et leurs références fixées **avant** d’exécuter les modèles. Les mesures n’utilisent pas de synthèse vocale. Les WAV ont traversé les fonctions réelles de rééchantillonnage et de normalisation du projet. Chaque worker a chargé les vrais poids, transcrit, libéré ses sessions et été terminé avant le suivant. Les requêtes autres que celles du serveur temporaire sur `127.0.0.1` ont été bloquées : **aucun accès extérieur et aucune erreur JavaScript** sur les 28 transcriptions comparatives.

Le **WER** est le nombre d’erreurs d’édition sur les mots — substitutions, suppressions et insertions — divisé par le nombre de mots de référence. Il est agrégé sur les mots, pas moyenné entre extraits. Les textes sont normalisés en NFKC, minuscules, ponctuation séparée et espaces regroupés ; pour l’arabe, les diacritiques et variantes d’alif sont normalisés. Les accents français ne sont pas effacés. Le WER peut dépasser 100 % lorsqu’un modèle insère de longues répétitions ; ce n’est pas un « pourcentage de précision » négatif.

### Français avec accents déclarés algérien et marocain

Quatre extraits du jeu [french-common-voice-6h](https://huggingface.co/datasets/afyfbadreddine77/french-common-voice-6h), révision `0bee4c983abbbc19ea5a8455b885e01ea41722e9`, lignes 4, 6, 46 et 52 du split train : **20,96 secondes et 52 mots de référence**. Trois accents sont déclarés « Français d’Algérie » et un « Français du Maroc ». Il s’agit de lecture enregistrée, sans certification indépendante de l’accent ni garantie que les quatre extraits représentent quatre personnes distinctes.

| Modèle, français forcé | Erreurs / mots | WER | Médiane de transcription par extrait | Médiane du chargement |
| --- | --- | --- | --- | --- |
| Base q8 | 13 / 52 | 25,00 % | 3,38 s | 1,57 s |
| Small q8 | 7 / 52 | 13,46 % | 12,07 s | 2,50 s |
| Medium q8 | 4 / 52 | 7,69 % | 40,44 s | 6,46 s |

Medium corrige davantage de mots sur cet échantillon, mais reste faillible et sensiblement plus lent avec le moteur WASM actuel. Deux extraits sont sans erreur de mots ; les deux autres conservent des erreurs comme « Ça donne » à la place de « S’adonnant » et le nom propre « Hers-Mort ». Ces nombres ne sont pas une estimation de précision générale ou de dictée vétérinaire.

### Mélange français/darija algérienne

Quatre extraits réels du corpus [Casablanca, UBC-NLP](https://huggingface.co/datasets/UBC-NLP/Casablanca), révision `8951b1b88e28c1107142ced57967b8d16350951d`, subset Algeria, split test, lignes 111, 314, 31 et 40 : **21,36 secondes et 54 mots de référence**. Certaines références originales doublent les mots français en transcription phonétique arabe et en caractères latins ; les doublons ont été retirés une fois, avant les inférences, en conservant les formulations de la source. Le mélange d’écritures rend néanmoins ce WER particulièrement sensible aux conventions de transcription.

| Modèle / mode | Erreurs / mots | WER | Médiane de transcription par extrait |
| --- | --- | --- | --- |
| Base / Français | 579 / 54 | 1 072,22 % | 7,65 s |
| Small / Français | 55 / 54 | 101,85 % | 12,63 s |
| Medium / Français | 68 / 54 | 125,93 % | 42,48 s |
| Medium / Automatique | 46 / 54 | 85,19 % | 77,01 s |

**Le code-switching français/darija n’est pas suffisamment fiable.** Forcer le français sur des phrases surtout arabes entraîne des phrases françaises inventées ; base produit aussi de longues répétitions. Le mode Automatique choisit l’arabe sur trois extraits et le français sur un, évitant une partie de cette mauvaise orientation, mais il omet ou déforme toujours des mots et transcrit parfois les mots français en caractères arabes. Augmenter la taille du modèle ne résout pas ce problème à lui seul.

Les enregistrements Casablanca ont une licence CC-BY-NC-ND-4.0. Ils ont servi uniquement à cette évaluation locale ; les audios, leurs transformations et leurs transcriptions ne sont ni intégrés ni redistribués dans l’application. Les fichiers de test restent hors du dépôt.

## Cycle complet dans le panneau

Le parcours testé est **Clinique → Reprendre une consultation → Assistant → Dicter → Arrêter et transcrire → confirmer le patient → préparer SOAP → relire et cocher → valider et enregistrer**.

Un extrait français enregistré avec accent déclaré algérien a été injecté dans `getUserMedia` de Chromium, avec silence de préparation, puis capturé par le véritable pipeline audio. Whisper-medium a reconnu tous les mots de cet extrait sans correction manuelle. Gemma 3 1B IT local a produit dès la première tentative un JSON avec les quatre sections : S reprend exactement la transcription ; O, A et P restent vides. L’historique et l’allergie du patient fictif n’ont pas été inventés comme observations actuelles. Les opérations et le nombre de caractères générés sont visibles dans Marker.

La note n’a été écrite qu’après la case de relecture et le clic de validation, puis le panneau s’est fermé après confirmation de l’écriture. **19 contrôles du cycle ont réussi**, sans requête extérieure ni erreur de console, avec un seul worker de modèle actif à la fois. La base navigateur était isolée et ne contient que des patients fictifs ; ce test n’écrit pas dans la base SQLite du cabinet.

Cet extrait n’est **pas une dictée médicale** et l’injection d’un enregistrement réel ne remplace pas le microphone physique du vétérinaire dans WKWebView. Les scénarios SOAP cliniques à quatre rubriques ont été vérifiés séparément avec le vrai Gemma lors de la phase initiale. Une dictée clinique enregistrée par le vétérinaire, notamment avec noms de médicaments et code-switching, reste nécessaire pour évaluer son cas personnel.

## Vérifications et limites

Les **280 tests sur 42 fichiers** et le typecheck passent. Les fichiers modifiés pour Whisper et le fil passent ESLint. Le fichier du panneau ajouté par l’utilisateur est resté intact ; ESLint signale séparément à sa ligne 25 un `setState` synchrone dans un effet. Ce signalement ne bloque pas le démarrage de `tauri dev` et n’a pas été masqué.

**24 contrôles supplémentaires d’interface** passent avec les modèles simulés pour provoquer des erreurs de façon déterministe : modèles absents, choix d’un homonyme, transcription modifiable, composants Message/Marker, étapes repliables, clair/sombre, panneau à 390 × 844 et 1440 × 1000, blocage des posologies et JSON invalides, réinitialisation de la case de relecture après une modification, abandon et sauvegarde explicite. La page contient du contenu, aucun overlay Vite ni erreur de console. Ces contrôles ne servent pas à mesurer la précision des modèles. Le plugin Browser n’étant pas disponible, ils utilisent Playwright ; rapports et captures restent sous `/private/tmp/baitari-assistant-panel-*`.

Les contrôles natifs de provisioning couvrent les dossiers incomplets, le refus de base/tiny, le refus d’une fréquence différente de 16 kHz, l’acceptation de medium et le remplacement avec conservation du modèle précédent en cas d’échec. L’ouverture et les tests utilisent la version dev, sans rebuild release.

Les latences indiquées appartiennent à Chromium/WASM sur cette machine. Elles ne mesurent pas les performances de chaque Mac, le GPU de WKWebView, une consultation longue ou la voix personnelle du vétérinaire. Le micro réel et le rendu du panneau natif restent à confirmer lors de son essai dans l’app ouverte.
