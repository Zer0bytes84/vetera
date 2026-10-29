# Port de la dictée turbo dans l'original (28 octobre 2026)

Dossier de travail : l'original, `…/BAITARI 2.1/bAItari`, branche `feat/dictee-turbo-native`. La copie du Bureau (`~/Desktop/Copie Baitari/BAITARI 2.1/bAItari`) a été lue, jamais modifiée. Aucun push.

## Verdict

| Critère | Résultat |
|---|---|
| Bouton Dicter actif dans l'original | **Oui.** Il est utilisable 0,5 s après l'ouverture du panneau, sur la release. |
| Dictée au micro réel par le parcours normal du panneau, posologies intactes | **Oui, avec une réserve de méthode.** Sur la release, le vrai bouton Dicter du panneau et le vrai micro du Mac ont transcrit les trois cas du banc, que les haut-parleurs jouaient. Les posologies étaient intactes dans les deux passages complets (« 5 gouttes », « 2 fois par jour », « 10 jours », « 10 à 14 jours », « 38.5 °C »). Tu l'as aussi constaté en direct sur la section Plan. **Réserve** : l'annulation d'écho a été coupée dans l'app de mesure (§ 4.2). Aucune voix humaine n'a dicté pendant cette session. |
| Aussi rapide que la copie | **Oui.** 3,35 à 4,39 s après « Arrêter » sur les cas de 17 et 29 s, 6,66 à 6,94 s sur le cas de 38 s. Copie : 3,33 / 3,87 / 6,01 s en debug, 6,40 à 6,75 s empaquetée. Banc : 3,90 / 3,15 / 6,76 s. |
| Le modèle arrive par le vrai parcours de téléchargement | **Oui, ajouté dans cette session.** La copie ne l'installait pas : sur une installation propre, son bouton serait resté grisé. |
| Empaquetage prouvé depuis la release | **Oui.** Transcriptions faites depuis le `.app` release, compagnon et six dylibs dans le bundle. **Non distribuable** : signature adhoc, aucune notarisation. |
| Chargement de l'assistant (« Note prête à relire ») | **Diagnostic seulement.** Avec Gemma 3, chargement de 3,6 s et rédaction de 12,4 s. Avec Gemma 4, chargement de 16 à 28 s, puis **rédaction bloquée à 0 caractère jusqu'au délai de 480 s** sur le Plan transcrit. Ce n'est pas le mécanisme du bouton Dicter (§ 5). |

## 1. Avant le code : les quatre questions, ce qui a été retenu

| Réponse donnée avant le port | Retenu ? | Ce qui en est sorti |
|---|---|---|
| **Prouver le parcours d'installation, pas le fichier posé à la main.** | Oui | Le manifeste de l'original ne contenait que Whisper small, EmbeddingGemma, Gemma 3 et Gemma 4. Ni la copie ni l'original n'installaient le turbo. Il est ajouté (§ 3). |
| **Ne pas casser Windows.** | Oui | La copie déclarait le compagnon pour toutes les plateformes : un build Windows aurait réclamé un `whisper-cli` Windows inexistant, et la dictée Windows aurait cherché un compagnon absent. Correction : déclaration dans `tauri.macos.conf.json`, moteur natif limité à macOS, WASM ailleurs. |
| **Lire le code porté, pas seulement le copier.** | Oui | `fin_journal` coupait le journal du compagnon à l'octet, ce qui fait paniquer Rust sur un caractère accentué. Il coupe désormais sur une frontière de caractère, et un test le couvre. |
| **Juger sur la release, préférence de générateur comprise.** | Oui | Mesures faites sur un `.app` release. Le générateur a été fixé explicitement à chaque passage (§ 5.1). |
| Matière brute : commits de la copie, fichier modèle et SHA-256, API Hugging Face, journaux, `ps`, `footprint`, `otool`, `codesign` | Oui | Le cache d'évaluation `~/Library/Caches/baitari-eval` avait disparu. Les trois WAV ont été régénérés à l'identique par `say` (28,62 / 17,15 / 38,03 s). |
| Juge de posologies de la copie (`juge-corrige.py`) | **Non** | Il lit le format de rapport du banc de la copie. Les posologies ont été vérifiées à leur place, par motif exact, dans les textes affichés. C'est moins général, mais suffisant pour les quatre ancrages du critère. |
| Juger « hors de nous » | Oui | Valeurs publiées par Hugging Face, inventaire du bundle par les outils système, PID et chemins relevés par `ps`, tests rejouables, et ton observation en direct de la section Plan. |

## 2. Ce qui a été porté, fichier par fichier

| Fichier (original) | Origine dans la copie | Écart |
|---|---|---|
| `src-tauri/src/dictation.rs` | `768da2c` | `fin_journal` sûr en UTF-8 ; `MODEL_DIR` et `MODEL_FILE` publics, partagés avec l'installateur ; `NATIVE_PLATFORM` (macOS) : `dictee_status` dit « indisponible » ailleurs. |
| `src-tauri/binaries/whisper-cli-aarch64-apple-darwin` et `whisper-cli-dylibs/` | `8cbf33c`, `a434c93` | Aucun. Empreintes identiques à la copie (`eff60f29…`). |
| `src-tauri/tauri.macos.conf.json` (nouveau) | `tauri.conf.json` de la copie | `externalBin` et les six `bundle.resources` sont dans la configuration propre à macOS, pas dans `tauri.conf.json`. Tauri la fusionne seul sur macOS ; un build Windows ne voit pas le compagnon. |
| `src-tauri/src/main.rs` | `768da2c`, `8cbf33c` | Plugin shell et deux commandes. `banc_sidecar.rs` (commande de banc) n'est **pas** porté. `BAITARI_NO_DEVTOOLS` (debug seulement) l'est, pour mesurer sans l'inspecteur. |
| `src-tauri/Cargo.toml`, `Cargo.lock`, `gen/schemas/` | copie | Aucun (`tauri-plugin-shell` et ses dépendances). |
| `src/.../local-ai/native-dictation.ts` (+ test) | `768da2c` | `nativeDictationEnabled` exige macOS en plus de Tauri. |
| `src/.../local-ai/dictation-text.ts` | `768da2c` | Aucun : « degrés Celsius », « degrés centigrades » et « degrés C » deviennent « °C », rien d'autre. |
| `src/.../hooks/use-local-consultation-ai.ts` | `768da2c` | Aucun. |
| `src/.../components/local-consultation-assistant.tsx` | `768da2c` + correctif du 27 octobre non commité | Aucun : le bouton ne dépend que du compagnon. |
| `src/.../components/soap-panel.tsx` | correctif du 27 octobre non commité | Aucun : préchargement du panneau à l'ouverture de la consultation. |
| Non portés, hors périmètre | — | `app-shell.tsx` (recherche), agenda, widgets, feuilles de style : changements non commités de la copie sans lien avec la dictée. |

## 3. Le modèle, par le parcours prévu

**Constat.** Dans la copie, le bouton Dicter n'était actif que parce que le fichier avait été copié à la main le 27 octobre. Le téléchargement installe dans `local-ai/<id>/` selon `resources/local-ai/download-manifest.json`, et ce manifeste ne contenait pas le turbo.

**Ce qui est livré :**
- **Le manifeste.** Entrée `whisper-turbo`, marquée `macosOnly` :
  - fichier `ggml-large-v3-turbo-q8_0.bin` ;
  - URL épinglée `huggingface.co/ggerganov/whisper.cpp/resolve/5359861c…/` ;
  - 874 188 075 octets, SHA-256 `317eb69c…e259a1`.

  Hugging Face publie exactement ces valeurs (`x-linked-size: 874188075`, `x-linked-etag` égal au SHA-256). Le fichier présent sur ce poste les a aussi, et ses 16 premiers octets sont identiques à ceux de l'URL.
- **L'installateur existant, inchangé dans sa mécanique** (dossier intermédiaire, vérification, remplacement atomique). Il pose le fichier dans `local-ai/whisper-turbo/`, le chemin que lit `dictation.rs`.
- **Statut `whisperTurboReady`.** Sur macOS, la dictée n'est prête qu'avec lui. Le toast « Vos outils IA locaux » et les Paramètres le proposent donc aux postes qui ne l'ont pas, en un tap, non bloquant, avec réessai. Seuls les outils manquants sont téléchargés.
- **Ailleurs (Windows), rien ne change** : même base de trois outils, même total de 2 215 021 763 octets (test Rust).

**Preuve de bout en bout.** `installs_turbo_where_the_dictation_reads_it` est ignoré par défaut et se lance avec `BAITARI_TURBO_SOURCE=<fichier> cargo test installs_turbo -- --ignored`. L'installateur réel télécharge le vrai fichier de 874 Mo, servi par un serveur local, vérifie taille et SHA-256, puis le pose à `whisper-turbo/ggml-large-v3-turbo-q8_0.bin`. Résultat : statut prêt, dossier intermédiaire supprimé, **réussi en 38 s**. Les 874 Mo n'ont pas été retéléchargés depuis internet. L'URL, elle, est prouvée par les en-têtes et les premiers octets ci-dessus.

**Sur ce poste, rien n'a été déplacé ni copié.** Le fichier posé à la main le 27 octobre est déjà à l'emplacement de production : la copie et l'original partagent le même dossier de données (`com.baitari.vetera`). Il est identique à l'entrée du manifeste, donc l'installateur le reconnaîtra comme installé.

## 4. Mesures sur la release

### 4.1 L'artefact

`npx tauri build --bundles app`, profil release. Inventaire complet dans [donnees/inventaire-app.txt](donnees/inventaire-app.txt).

| Contrôle | Résultat |
|---|---|
| `Contents/MacOS/whisper-cli` | présent, `eff60f29…`, identique au dépôt |
| `Contents/Resources/dylibs/` | les six dylibs, chacune identique à sa source du dépôt |
| `otool -L whisper-cli` | six dépendances en `@rpath/…` |
| `LC_RPATH` | `@executable_path` et `@executable_path/../Resources/dylibs` |
| `codesign -dv` | `flags=0x20002(adhoc,linker-signed)`, `TeamIdentifier=not set`, `Sealed Resources=none` |
| `codesign --verify --deep --strict` | « code has no resources but signature indicates they must be present » |

L'app s'exécute et charge ses dylibs, mais elle n'est pas signée comme un bundle cohérent. Elle n'est pas distribuable en l'état.

### 4.2 Méthode du test d'acceptation

La release à mesurer est le même build release, avec un scénario injecté dans le frontend par la configuration de capture (`scripts/eval-local-ai/capture-micro.ts`). Hors scénario, son code est celui du produit. Déroulé :
1. Ouvrir le dossier du patient fictif « Max ».
2. Ouvrir l'assistant.
3. Cliquer sur **le vrai bouton Dicter**.
4. Faire jouer chaque enregistrement par les haut-parleurs du Mac.
5. Cliquer sur **Arrêter**.
6. Chronométrer jusqu'au texte affiché dans le champ.

L'app tourne avec un `HOME` isolé : copie de la base, clones APFS des modèles installés. La mémoire et les PID du compagnon sont relevés par chemin d'exécutable exact (`ps -axo pid=,comm=`).

**Premier passage (`run1`) : invalide par construction.** Les trois textes valent « Sous-titrage Société Radio-Canada », l'hallucination de Whisper sur du silence. La cause est l'annulation d'écho : la capture demande `echoCancellation: true`, et macOS retire du micro tout ce que le Mac joue lui-même. Le produit a raison de faire ainsi. Les passages suivants coupent l'annulation d'écho **dans l'app de mesure seulement** (`BAITARI_CAPTURE_NO_AEC=1`, transformation de build, aucune ligne du produit modifiée).

**À retenir pour le produit** : sur du silence, le turbo rend un texte plausible, et non une erreur. « Aucune parole reconnue » n'est jamais déclenché. C'est noté, pas corrigé ici.

### 4.3 Transcription

| Passage | Cas | Dicter → écoute | Arrêter → texte affiché | Dicter → texte |
|---|---|---|---|---|
| `run2` | passage30 (28,6 s) | 2,77 s | **4,13 s** | 36,80 s |
| | plan-gabarit (17,2 s) | 0,26 s | **3,59 s** | 22,55 s |
| | plan-reference (38,0 s) | 0,25 s | **6,66 s** | 46,50 s |
| `run4` | passage30 | 3,53 s | **4,39 s** | 37,92 s |
| | plan-gabarit | 0,25 s | **3,35 s** | 22,49 s |
| | plan-reference | 0,26 s | **6,94 s** | 46,53 s |

- La première dictée d'un lancement paie 2,8 à 3,5 s pour ouvrir le micro ; les suivantes 0,25 s.
- La toute première transcription d'un binaire neuf (`run1`) a pris **19,31 s** : compilation des shaders Metal au premier usage, déjà constatée dans la copie (15,48 s).
- **Posologies et chiffres** : intacts dans `run2` et `run4`, aux quatre ancrages du Plan (« 5 gouttes », « 2 fois par jour », « 10 jours », « 10 à 14 jours ») et dans passage30 (« 38.5 °C », « 92 », « 20 mouvements », « deux semaines »). La normalisation « °C » est visible dans le texte livré.
- **Début de dictée perdu, non diagnostiqué.** Sur passage30 et plan-gabarit, les 3 à 5 premières secondes manquent dans les deux passages (« Il se gratte l'oreille droite… », « Céruminolytique… »). plan-reference est complet. La boucle haut-parleur → micro sans annulation d'écho est un montage de mesure, je ne peux pas l'imputer au produit. **À vérifier avec une voix réelle** avant de conclure.

### 4.4 Mémoire et processus

| Passage | PID distincts du compagnon | Pic du compagnon | Après le passage |
|---|---|---|---|
| `run1` | 3 | 1 107 Mo | 0 processus au chemin du compagnon |
| `run2` | 3 | 1 110 Mo | 0, aucun WAV `baitari-dictee-*` restant |
| `run4` | 3 | 1 126 Mo | 0 |

Un compagnon neuf par dictée, toujours fils de l'app (`ppid` = PID de l'app dans `filiation.txt`). Aucun processus résident, aucun orphelin, empreinte nulle après chaque dictée. Données dans `donnees/run*/`.

## 5. Le chargement de l'assistant : diagnostic, aucun correctif

### 5.1 Ta question : le résumé « succès venus de Gemma 3 en dev, Gemma 4 jamais validé »

**À corriger en partie :**
- **L'origine dev n'était pas sur Gemma 3.** Le bilan du 25 octobre (`correctifs-test-aissa`, § 2.1) a lu `baitari.generator = gemma4` dans le `localStorage` de l'origine `http://localhost` (journal WAL écrit le 24 octobre à 22 h 31). Gemma 3 n'est actif que là où la clé est absente.
- **Le test Aissa du 25 octobre tournait donc sur Gemma 4.** Chargement d'environ 9 s, rédaction d'au plus 1 min 05. Notes refusées par le contrôle de fidélité, mais rédigées.
- **Gemma 4 a été validé au banc**, dans le vrai moteur en dev, le 25 octobre : notes de référence acceptées au premier essai en 67 à 96 s, Plan dactylographié. **Il ne l'a jamais été dans le parcours complet** avec la dictée native, ni dans la copie (son banc d'intégration ne générait aucune note), ni dans l'original avant aujourd'hui.
- **Le test Rifka du 27 octobre, sur Gemma 4 : probable, pas prouvé.** Le stockage WebKit de l'origine dev n'existe plus sur ce poste (`~/Library/WebKit/vetera` est absent aujourd'hui) : je ne peux pas relire la préférence de ce jour-là. La dernière valeur connue était `gemma4`.
- **Origine release (`tauri://localhost`) :** son stockage n'existait pas avant mes mesures (créé le 28 octobre à 19 h 22), donc la release tournait par défaut sur **Gemma 3**. Mes passages y ont écrit `baitari.generator = gemma4`. Ma tentative de remettre la clé à vide a été refusée par les permissions de la session. **À faire de ton côté** : Paramètres, carte de la nouvelle version, interrupteur sur « non ».

### 5.2 Mesures (release, même poste, même cas)

| Passage | Avant la note | Générateur | Chargement de l'assistant | Rédaction | Issue |
|---|---|---|---|---|---|
| `run2` | 3 dictées natives | Gemma 3 | **3,6 s** | **12,4 s** | note affichée, Plan numéroté, posologie intacte (point 7) |
| `run2` | 3 dictées, puis la note Gemma 3 | Gemma 4 | — | **0 caractère** | délai de 480 s |
| `run3` | rien | Gemma 4, Plan de référence dactylographié | **28,5 s** | **20,7 s** | note affichée |
| `run4` | 3 dictées natives | Gemma 4, Plan dicté | **28,3 s** | **0 caractère pendant 452 s** | délai de 480 s |
| `run5` | rien | Gemma 4, **même Plan dicté qu'en `run4`** | **16,1 s** | **0 caractère pendant 464 s** | délai de 480 s (tu l'as vu en direct) |
| `run1` | 3 dictées (texte halluciné) | Gemma 4 | — | — | note affichée, 81 s au total |

Le chargement se lit au clic sur « Relire la note SOAP », jusqu'à l'apparition de « Rédaction de la note… ». La rédaction court de là jusqu'à l'onglet de relecture. En `run1`, la note est arrivée sans que « Rédaction de la note… » soit jamais lu, d'où un total seul.

### 5.3 Ce que ces passages établissent

1. **Ce n'est pas le chargement.** Gemma 4 se charge en 16 à 28 s dans les trois passages bloqués comme dans celui qui aboutit. Le blocage commence **après** : l'étape « Note prête à relire » affiche « 0 caractère », ce qui veut dire qu'aucun premier jeton n'est rendu.
2. **Ce n'est pas la dictée native ni la mémoire qu'elle laisse.** `run5` bloque **sans aucune dictée** dans le processus. Le compagnon a disparu avant la note dans tous les passages (0 processus à son chemin).
3. **Ce n'est pas le mécanisme du bouton Dicter.** Le bouton lit `dictee_status`, côté Rust : un simple test d'existence du fichier, sans aucun modèle chargé. La note charge Gemma par MediaPipe, dans un worker web, depuis le protocole `asset://`, avec le verrou « un seul modèle à la fois ». Les deux mécanismes ne partagent rien. Le correctif du bouton ne s'applique donc pas ici.
4. **Le déclencheur le mieux établi est l'entrée.** Même release, même Gemma 4, même état de départ :
   - Plan dactylographié de référence : la note sort en 20,7 s ;
   - Plan transcrit par le turbo : aucun jeton en 464 s.

   Gemma 3 rédige ce même type d'entrée en 12,4 s.
5. **Non établi** : pourquoi MediaPipe/Gemma 4 ne rend aucun jeton sur cette entrée. Ni le flux du moteur, ni le nombre de jetons, ni l'état WebGPU ne sont instrumentés dans le produit, et je ne l'ai pas touché.

   Différences visibles entre les deux Plans : le texte transcrit est une suite de propositions séparées par des virgules, avec très peu de points. Les phrases de posologie sont retirées avant le modèle, ici sur une seule longue phrase.

   Un point de mémoire, lui aussi non tranché : le swap passe de 2,0 à 5,6 Go au chargement de Gemma 4 (`run4`). Sur 8 Go, ce modèle tourne à la limite, même seul.

**Cause racine, en l'état : un blocage de la génération Gemma 4 dépendant de l'entrée, pas un problème de chargement ni de mémoire laissée par la dictée.** Le mécanisme exact n'est pas établi.

Pour l'établir dans une session génération dédiée, rejouer au banc de développement (`reference-bench.ts`) le cas [donnees/case-plan-dicte.json](donnees/case-plan-dicte.json), en relevant :
- le nombre de jetons d'entrée et la valeur de `maxTokens` passée par le worker ;
- le premier rappel de `generateResponse` ;
- la même entrée, découpée en phrases ou non.

Puis décider entre ces options, modèles légers compris : Gemma 3 par défaut tant que Gemma 4 n'est pas sûr sur ce type d'entrée, un délai court sans premier jeton qui bascule sur Gemma 3, une autre version de Gemma 4.

### 5.4 Les deux points de vigilance du brief

- **« Rifka » transcrit « Rivka », 39,2 °C devenu 39.** Ce sont deux sujets distincts, et aucun ne relève de ce port :
  - Ancrer le nom sur le dossier ouvert est une correction du texte transcrit par une donnée du dossier, sans lien avec le moteur porté. Cela peut aller dans une petite session dictée (normalisation, comme « °C »).
  - La décimale perdue vient de la **génération** : la transcription garde « 38.5 » dans tous mes passages. C'est pour la session génération.
- **Chargement de l'assistant de 1 min 20 le 27 octobre, contre environ 9 s le 25.** Sur la release d'aujourd'hui, le chargement seul prend 3,6 s avec Gemma 3 et 16 à 28 s avec Gemma 4. Le long délai vécu correspond plutôt au **blocage de la rédaction** décrit ci-dessus, qui apparaît à l'écran comme un chargement qui n'en finit pas, avec « 0 caractère ». Ces chiffres sont mesurés sur la release, pas en dev.

## 6. Tests

| Contrôle | Résultat |
|---|---|
| `npm test` | **165 fichiers, 1 260 tests verts** (départ 1 251 ; 9 nouveaux) |
| Nouveaux tests | encodage PCM et « °C », portés de la copie ; choix du moteur selon le système ; préparation de la dictée selon le modèle natif ; entrée du manifeste |
| `npx tsc -b` | 0 erreur |
| `npx eslint .` | 0 erreur |
| `cargo test` | 27 verts, dont 7 pour `dictation.rs` (fin de journal accentuée comprise) et le manifeste à cinq outils. Le test d'installation réelle du turbo est ignoré par défaut, et vert quand on le lance (§ 3). |
| Identifiant, schéma, base | inchangés : `com.baitari.vetera`, aucune migration |
| WASM | conservé, toujours utilisé hors macOS |

## 7. Ce qui reste non prouvé

- **Signature et notarisation** : l'app est adhoc, `codesign --verify` échoue. Sur un autre Mac, Gatekeeper la refusera probablement. L'autorisation du micro (TCC) dans une app signée n'est pas éprouvée.
- **Windows** : aucun compagnon. Le build Windows ne devrait plus réclamer le binaire macOS, mais il n'a pas été lancé.
- **Une voix humaine au micro**, avec l'annulation d'écho active, comme en consultation. Le début de dictée perdu (§ 4.3) est à vérifier dans ces conditions.
- **Le téléchargement de 874 Mo depuis internet** sur une installation vierge : prouvé par morceaux (URL et en-têtes, installateur sur le vrai fichier servi localement), pas d'un seul tenant.
- **La cause exacte du blocage de Gemma 4** (§ 5.3).
- **L'annulation pendant la transcription** : le compagnon n'est pas tué, il finit seul. Constat hérité de la copie, non remesuré.

## 8. Rejouer

- **App release produit** : `npx tauri build --bundles app`. Une copie est gardée dans `~/Library/Caches/baitari-eval/produit/Baitari.app`.
- **App de mesure** :
  1. Construire le frontend de capture : `BAITARI_CAPTURE_SCENARIO=micro`, `BAITARI_CAPTURE_QUERY="passage30,plan-gabarit,plan-reference"` (vide pour aucune dictée), `BAITARI_CAPTURE_GENERATOR="gemma3,gemma4"`, `BAITARI_CAPTURE_SIGNAL=<HOME isolé>/signal`, `BAITARI_CAPTURE_NO_AEC=1`, puis `TAURI_ENV_PLATFORM=darwin npx vite build --config scripts/eval-local-ai/vite.capture.config.ts --outDir dist-capture`.
  2. Construire l'app : `npx tauri build --bundles app --config '{"build":{"frontendDist":"../dist-capture","beforeBuildCommand":""}}'`.
  3. Lancer le pilote : [donnees/micro.sh.txt](donnees/micro.sh.txt). Il prépare le `HOME` isolé, joue les WAV à la demande et relève mémoire et processus. Les WAV se régénèrent avec `say -v Thomas -r 165` sur les textes de `docs/recus/2026-10-25/correctifs-test-aissa/donnees/`.
- **Installation du turbo** : `BAITARI_TURBO_SOURCE=<fichier> cargo test installs_turbo -- --ignored`.

Commits (branche `feat/dictee-turbo-native`) :
- `982e014` : port du moteur, du bouton et du préchargement ;
- `35a3355` : téléchargement du turbo ;
- un dernier commit : scénario de mesure et ce bilan.
