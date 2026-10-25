# Correctifs du test terrain avec Aissa (25 octobre 2026)

Test du matin : 10 h 57 à 11 h 20, en partage d'écran, avec `tauri:dev` sur le Mac M1 8 Go et la branche `feat/tableau-flux`. L'assistant a été ouvert depuis le dossier de Boby, sans rendez-vous, pour une dictée d'otite par rubriques.

Tout ce qui suit a été mesuré dans le vrai moteur (WKWebView, binaire debug de Tauri, même Mac). Les mesures tournent sur une instance de test isolée : dossier de données temporaire, port 5181, donc une origine et un `localStorage` séparés. La base réelle n'a reçu aucune écriture. Aucun push.

| Lot | État |
|---|---|
| 1. Dictée | **Causes établies, 2 corrigées dans le code** : Whisper passe de 1 à 4 threads, et le modèle reste chargé entre deux rubriques. Transcription 2 à 2,5 fois plus rapide, plus de rechargement de 20 à 36 s avant chaque rubrique. **Objectif non atteint sur ce Mac** : la transcription reste 1,3 à 2,3 fois plus longue que la parole. C'est une décision à prendre (§ 1.5). |
| 2. Assistant | **Cause du 2e refus trouvée et corrigée** : le panneau envoyait les rubriques en un seul texte, et l'intitulé « Motif et antécédents : » laissait le reliquat « Motif et » dans le Subjectif. Gemma 4 le corrigeait, et le contrôle refusait. Après correctif, la note de référence est acceptée au 1er essai par les deux générateurs. **Sortie de secours** codée et tracée. **Retour aux rubriques** rendu visible. **Mise en forme** : la consigne seule ne tient pas sur Gemma 3, c'est une décision à prendre (§ 2.5). |
| 3. Note sans visite | Audit seulement. La note validée hors visite est **copiée dans le presse-papier, jamais enregistrée** ; la dictée n'existe qu'en mémoire du panneau. Implémentation chiffrée au § 3.3, à valider avec Aissa. |

## Conditions de mesure

- **Poste.** M1, 8 cœurs (4 performance + 4 efficacité), 8 Go. L'instance `tauri:dev` du test tournait encore pendant toute la session : lancée le 24 octobre à 20 h 41, je n'ai pas pu l'arrêter (refusé par les permissions). Le swap était à 4,1 Go dès 11 h 29, puis a monté jusqu'à 13,5 Go pendant le banc (§ 1.2).
- **Audio.** Il n'existe aucun enregistrement de la dictée réelle. J'ai donc fait dicter le texte de référence de l'annexe par la voix française « Thomas » de macOS (`say`), convertie en 16 kHz mono :

  | Fichier | Durée | Contenu |
  |---|---|---|
  | `passage30` | 28,6 s | S et premières constantes |
  | `plan-gabarit` | 17,2 s | gabarit Plan du test |
  | `plan-reference` | 38,0 s | rubrique P complète |

  Une voix de synthèse n'est pas celle d'un vétérinaire au micro : les taux d'erreur ci-dessous comparent des configurations entre elles, ils ne mesurent pas la précision réelle.
- **Bancs.** `scripts/eval-local-ai/` contient deux nouvelles tâches, `dictation` et `reference`. Elles appellent les vrais workers par les mêmes fonctions que l'écran. Les données sont dans [donnees/](donnees/) ; le cas « Max » étant fictif, les textes y figurent en entier.

## Lot 1 — Dictée

### 1.1 Reproduction

Whisper sur 1 thread, rechargé à chaque dictée : c'est la configuration du jour du test. Le banc retrouve les temps chronométrés sans aucun partage d'écran.

| Passage | Test terrain (chronomètre) | Banc, 1 thread (2 essais) |
|---|---|---|
| ~30 s dictées | ~1 min 30 de transcription | 28,6 s → **94 s et 79 s** (×3,3 et ×2,8) |
| Rubrique Plan | 2 min 04 de transcription | 38 s → **132 s et 128 s** (×3,5 et ×3,4) |
| Avant le micro | (inclus dans les 1 min 44 entre le lancement et la transcription) | **chargement de 20 à 36 s à chaque dictée** (6 mesures : 26,4 ; 27,9 ; 36,5 ; 32,5 ; 20,5 ; 19,5 s) |

### 1.2 Où part le temps

| Cause candidate | Constat mesuré | Verdict |
|---|---|---|
| **Modèle du poste** | Ce Mac utilise **Whisper medium** q8, importé à la main (`model-manifest.json` : `onnx-community/whisper-medium-ONNX`). La configuration distribuée est **small** (audit du 22 octobre). | **Configuration du poste.** Medium est le modèle le plus lent, mais c'est le seul assez précis (§ 1.4). |
| **1 thread** | `wasm.numThreads = 1` en dur. À 4 threads, la transcription est 1,6 à 2 fois plus rapide. À 8 threads, elle est **plus lente qu'à 4** (×2,8 contre ×1,6 sur 28,6 s), et le processus web a été **tué faute de mémoire** : swap à 13,5 Go, puis chute de 7,4 Go à sa disparition. | **Code. Corrigé** (4 threads). |
| **Rechargement à chaque passage** | Le worker libérait Whisper après chaque transcription, ce qui impose 20 à 36 s de chargement avant chaque rubrique. | **Code. Corrigé** (modèle gardé). |
| **Décodage contre encodeur** | À 4 threads, le premier mot arrive après 17 à 25 s : c'est l'encodeur, sur une fenêtre fixe de 30 s. Un passage de 17 s coûte donc presque autant qu'un passage de 28 s. Au-delà de 30 s, il faut deux fenêtres (plan de 38 s : ×2,2 à ×2,5). Le reste du temps part dans le décodage. | Limite du moteur WASM sur ce processeur. |
| **Modèle de recherche gardé et son verrou** | Par construction, `reserveClinicalModel` évince le modèle parqué avant que la dictée démarre. Les deux ne tournent jamais ensemble. | Exclu par le code. Pas de mesure dédiée. |
| **Modèle de génération en mémoire** | La session de note est fermée à la fin de chaque note (`session.close()`). | Exclu par le code. |
| **Partage d'écran** | Non reproduit. Les mesures sans partage d'écran retrouvent déjà les temps du test. | **Pas nécessaire pour expliquer les temps.** Son effet propre n'est pas mesuré. |
| **Charge mémoire du poste** | 8 Go, l'instance du test encore ouverte, des navigateurs, swap de 4 à 13 Go. Deux séries à 4 threads, à 30 minutes d'écart, varient de ×1,6 à ×2,5. | Facteur aggravant réel, mais pas la cause première : il ne change pas l'ordre de grandeur. |

### 1.3 Après correctif (medium, 4 threads, modèle gardé, 6 dictées d'affilée)

| | Avant (1 thread) | Après |
|---|---|---|
| Chargement avant le micro | 20 à 36 s **à chaque dictée** | **26,9 s à la première dictée, 0 s ensuite** |
| 28,6 s dictées | 79 à 94 s (×2,8 à ×3,3) | **36 à 55 s** (×1,3 à ×1,9) |
| Gabarit Plan, 17,2 s | 56 à 78 s (×3,3 à ×4,5) | **26 à 29 s** (×1,5 à ×1,7) |
| Plan complet, 38 s | 128 à 132 s (×3,4 à ×3,5) | **72 à 89 s** (×1,9 à ×2,3) |
| Précision | même modèle, même décodage glouton : taux d'erreur par mot (0,033 ; 0,154 ; 0,160) et chiffres manquants identiques à 1, 4 et 8 threads | |

Pour une note en 4 rubriques, il reste un seul chargement au lieu de quatre, soit environ 1 min 30 de gagnée sur ce Mac, en plus du gain de transcription.

Détails du code :
- `whisperThreads()` prend la moitié des cœurs, au plus 4 et au moins 1 : 4 sur ce M1, 2 sur un PC à 4 cœurs.
- Le modèle gardé ne détient pas le verrou, comme le modèle de recherche : une note, une recherche ou la lecture d'un document l'évincent avant de démarrer.
- Il est libéré après 5 minutes d'inactivité, ou à la fermeture de l'assistant.

### 1.4 Pistes écartées, mesures à l'appui

- **Whisper small** (le modèle distribué, présent sur le Bureau, cloné pour le banc puis supprimé) :
  - temps : ×0,5 à ×1,0, chargement en 4 à 7 s ;
  - précision : inacceptable. « 5 gouttes » devient « **sainte goutte** », et le Plan de référence perd tout le passage entre la prescription et « sans enfoncer l'embout ». Taux d'erreur par mot : 0,15 à 0,48, contre 0,03 à 0,16 pour medium. Le brief exige que les chiffres soient intacts.
- **Medium sur WebGPU avec les fichiers q8 installés** : page muette deux minutes après le début du chargement, puis plus aucun signe de vie. Inutilisable en l'état.
- Medium aussi se trompe sur la voix de synthèse : « seins de gouttes » pour « 5 gouttes » dans le Plan long, « Collier Élisabeth 1 ». La relecture du vétérinaire reste indispensable. Les chiffres du test réel étaient intacts.

### 1.5 À décider ensemble

L'objectif, une transcription nettement plus rapide que la parole, **n'est pas atteint sur ce Mac de 8 Go avec medium**. Options, mesurées ou chiffrées :
1. **Mesurer d'abord sur le portable d'Aissa** (16 Go, référence terrain) avec ce correctif. Ce Mac de 8 Go chargé n'est pas le poste de la clinique.
2. **Transcrire pendant la dictée**, fenêtre de 30 s par fenêtre. L'attente après « Arrêter » se réduit à la dernière fenêtre (20 à 45 s ici), quelle que soit la longueur de la rubrique. Environ 1 jour de code. Ne réduit pas le calcul total.
3. **Medium sur WebGPU avec des poids fp16** : environ 1,5 Go à télécharger (accord requis), puis à mesurer. C'est la seule piste qui peut descendre sous le temps réel sans perdre la précision de medium.
4. **Small** : rejeté par les mesures ci-dessus.

## Lot 2 — L'assistant

### 2.1 Générateur actif pendant le test

**Gemma 4 E2B** (« Utiliser la nouvelle version »).
- **Preuve.** Le `localStorage` de l'origine `http://localhost` de `tauri:dev` contient `baitari.generator = gemma4`. Fichier `localstorage.sqlite3`, journal WAL écrit pour la dernière fois le 24 octobre à 22 h 31, aucune écriture depuis.
- **Cohérence des temps.** Rédaction de 42 s à 1 min 05 pendant le test, contre une note médiane de 36 à 39 s pour Gemma 4 et de 6 à 7 s pour Gemma 3 (bilan du 24 octobre).
- **Limite.** Un repli silencieux sur Gemma 3 ne laisse pas de trace persistante, je ne peux donc pas l'exclure absolument. Les temps l'écartent.

### 2.2 Diagnostic du deuxième refus

**La dictée exacte du test n'existe plus.** Elle vivait seulement dans l'état React du panneau, qui a été fermé (capture de l'instance du test à 11 h 31 : panneau fermé). La table `consultation_soaps` n'a aucune ligne du 25 octobre, la table `audit_log` non plus. J'ai donc reproduit avec le cas de référence, dicté rubrique par rubrique comme dans le panneau, dans sa version **corrigée** : celle de l'annexe, sans les erreurs volontaires.

**Résultat dans le vrai moteur.** Le chemin du panneau tel qu'il était le jour du test donne, pour Gemma 4, **un refus aux 2 essais**, sur le cas complet comme sur le gabarit Plan. Capture : [avant-refus-impasse.jpg](captures/avant-refus-impasse.jpg).

**Différences exactes, mot à mot** (rubrique Subjectif, les trois autres rubriques sont identiques à la virgule près) :

| | Début du Subjectif |
|---|---|
| Trame envoyée au modèle | « **Motif et** Le propriétaire remarque que Max gémit lorsqu'il se gratte l'oreille droite. … » |
| Gemma 4, essai 1 | « **Motif et antécédents :** Le propriétaire remarque que Max gémit… » → mot ajouté : `antecedents` |
| Gemma 4, essai 2 | « Le propriétaire remarque que Max gémit… » → mots retirés : `motif`, `et` |

**Aucun mot clinique n'est en cause.** Ni mot altéré, ni rangement, ni numérotation. Voici l'enchaînement :
1. Le panneau transmettait la dictée guidée en un seul texte, une ligne « Motif et antécédents : … », « Examen clinique : … » par rubrique.
2. La trame déterministe ne reconnaît que « antécédents : » comme intitulé : le reliquat « **Motif et** » devient la première observation du Subjectif.
3. Gemma 4 le « répare », ce qui le fait refuser. Gemma 3 le recopie, ce qui le fait accepter, avec « Motif et » en tête de la note.
4. La génération est déterministe (température 0) : **corriger la dictée ne change rien**, tant que le Subjectif est rempli. D'où « il laisse pas continuer ».

Deux autres défauts du même chemin :
- « Traitement antiparasitaire à jour, **administré** il y a 2 semaines » est pris pour une posologie. Cet antécédent, dicté en S, était replacé **dans le Plan**.
- Les réponses par rubrique n'étaient jamais transmises comme rubriques. Le pipeline savait pourtant les recevoir (`guidedSource`), mais le panneau ne les lui passait pas : il redevinait les rubriques par expressions régulières.

### 2.3 Correctif et mesures

Le panneau transmet désormais les réponses de chaque rubrique comme rubriques. Les phrases tenues à l'écart du modèle (posologies, traitements) reviennent mot pour mot **dans la rubrique où elles ont été dictées**. Le garde-fou n'est pas modifié : même comparaison mot à mot, aucune posologie montrée au modèle ni acceptée en sortie.

| Cas de référence (vrai moteur) | Gemma 4 | Gemma 3 |
|---|---|---|
| Avant : chemin du panneau, note complète | **refusée** (2 essais, 222 s) | acceptée, avec « Motif et » en tête du S |
| Avant : chemin du panneau, gabarit Plan | **refusée** (2 essais, 86 s) | acceptée, avec « Motif et » |
| **Après : rubriques transmises**, note complète | **acceptée au 1er essai** (96 s, chargement compris) | acceptée au 1er essai (18 s) |
| **Après : rubriques transmises**, gabarit Plan | **acceptée au 1er essai** (68 s) | acceptée au 1er essai (15 s) |

Contenu de la note acceptée, vérifié :
- l'antécédent antiparasitaire reste en S ;
- la prescription (« 5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours ») est dans le Plan, mot pour mot ;
- « 10 à 14 jours » est intact.

**Reste à reprendre** : la prescription retenue hors du modèle revient **en fin de Plan**, et non à sa place dictée (après « Soins au cabinet »).

Captures « après », moteur réel, même cas :
- [apres-rubrique-plan-retour-visible.jpg](captures/apres-rubrique-plan-retour-visible.jpg)
- [apres-note-generee-intitules-complets.jpg](captures/apres-note-generee-intitules-complets.jpg)

Deux variantes à relire, plus dures, sont aussi acceptées par Gemma 4 : un Plan transcrit par Whisper et non corrigé, et un cas oral avec hésitations. Gemma 4 recopie alors les fautes et les « euh » tels quels. **Le garde-fou ne corrige jamais la dictée : c'est au vétérinaire de la relire.**

### 2.4 Sortie de secours, retour aux rubriques

- **Après un refus**, quel qu'il soit (fidélité, format, posologie, délai), la carte d'erreur dit pourquoi relancer ne sert à rien. Elle propose deux sorties :
  - « **Relire ma dictée comme note** » : la dictée devient la note, rubrique par rubrique, mot pour mot, mise en forme par le code ;
  - « **Modifier « … »** » pour chacune des 4 rubriques.

  Le bouton principal devient lui-même « Relire ma dictée comme note » : on ne peut plus relancer en boucle la même génération. Si la dictée change, la génération est de nouveau proposée.
- **Traçabilité.** La relecture annonce : « Note reprise mot pour mot de votre dictée, sans reformulation par l'assistant… ». À l'enregistrement dans une consultation, `content.localAi.source` vaut `"dictee-relue"`, et `"assistant"` pour une note générée acceptée. Aucune note générée non fidèle n'est enregistrée automatiquement : rien ne s'enregistre sans le clic « Valider » du vétérinaire.
- **Retour visible.** Chaque rubrique passée a son bouton « Modifier « Rubrique » » sous la réponse. L'ancien « Précédent », en texte pâle, devient « ← Revenir à « Rubrique » », avec un contour.

Captures :

| Avant | Après |
|---|---|
| [Refus sans issue](captures/avant-refus-impasse.jpg) : erreur seule, « Précédent » pâle, bouton qui relance la même génération | [Refus avec sorties](captures/apres-refus-sortie-de-secours.jpg) et [note reprise de la dictée](captures/apres-note-depuis-dictee-mise-en-forme.jpg) |
| [Rubrique Plan](captures/avant-rubrique-plan.jpg) | [Rubrique Plan, retours visibles](captures/apres-rubrique-plan-retour-visible.jpg) |

**Important** : le refus de la capture « après » est **provoqué**. Après correctif, je n'ai trouvé aucun refus naturel sur ces cas : ni le cas corrigé, ni le Plan brut de Whisper, ni le cas oral. Le serveur de capture (`BAITARI_CAPTURE_FORCE_REFUS=1`, `vite.capture.config.ts`, hors bundle) fait donc refuser le contrôle. Tout le reste est le code réel : la dictée saisie, la génération par Gemma 4, l'affichage du refus, la sortie de secours. Captures en thème clair seulement.

### 2.5 Mise en forme de la note : mesure et décision

**Piste éprouvée : la consigne interne.** Option `layout` de `prepareSoapDraft` :
- la consigne impose l'intitulé complet de chaque rubrique sur sa propre ligne, une puce par observation et un Plan numéroté ;
- la trame montrée au modèle est déjà mise en forme ;
- **point de jonction** : avant la comparaison mot à mot, le contrôle de fidélité retire **uniquement** l'intitulé de la rubrique (en première ligne) et les marqueurs de liste en début de ligne. Un chiffre dicté « avalé » par un numéro de liste reste refusé, de même qu'un intitulé d'une autre rubrique ou un mot ajouté (tests `soap-layout.test.ts`).

| Consigne de mise en forme, cas de référence | Gemma 4 | Gemma 3 |
|---|---|---|
| Note complète | acceptée ; intitulés, puces et numéros respectés dans les 4 rubriques | **refusée** : il fusionne l'Objectif dans le Subjectif en ajoutant « Évaluation clinique : » |
| Gabarit Plan | acceptée, même respect | **refusée** : JSON invalide aux 2 essais |

**La consigne seule ne tient pas sur les deux générateurs.** Elle n'est donc **pas activée** dans l'écran (`layout` reste à `false`) et devient une **décision à prendre ensemble**.

**Alternative proposée : mise en forme déterministe par le code** autour du contenu accepté. C'est `layoutSoapNote` et `soapNoteText`, déjà écrits et testés. Un constat plaide pour elle : sur le chemin guidé, **la note acceptée est mot pour mot la dictée** (contrôle extractif). Le modèle n'y apporte que 15 à 96 s d'attente. La forme par le code est immédiate, identique sur tous les postes, et ne peut pas faire refuser une note.

**Ce qui est déjà en place, sans attendre la décision :**
- les intitulés complets (« P — Plan (Actions et suivi) », etc.) servent de titres aux 4 rubriques de la relecture ;
- ils sont écrits dans le texte de la note copiée (`soapNoteText`) ;
- la note reprise de la dictée (sortie de secours, ou poste sans assistant) est mise en forme par le code : puces, Plan numéroté.

La note générée acceptée reste, elle, en blocs de phrases jusqu'à la décision.

### 2.6 Option A (bilan du 24 octobre)

**Le cas réel du test ne la nécessite pas** : le refus venait d'un artefact de l'app, pas d'un rangement des mots par le modèle. La décision reste ouverte, avec ces mesures :
- après correctif, 4 notes sur 4 sont acceptées au 1er essai sur ce cas ;
- l'option A deviendrait utile si l'on veut laisser le modèle **réordonner** ;
- dans le chemin guidé, il n'a aujourd'hui rien à réordonner.

## Lot 3 — Note introuvable sans rendez-vous (audit, aucun code)

### 3.1 Faits établis dans le code

- **Deux portes d'entrée.**
  - **Assistant global** (bouton de l'en-tête, ⌘J ou mascotte) : `app-shell.tsx` monte `LocalConsultationAssistant` avec le patient du dossier ouvert, **sans `onValidate`**. À la validation, `save()` passe par la branche sans `onValidate` : la note est **copiée dans le presse-papier** (« Note validée et copiée dans le presse-papier »), puis le panneau se ferme. **Rien n'est écrit en base.** C'est vrai même quand un `appointmentId` est transmis par l'événement d'ouverture.
  - **« Note clinique » du dossier** (`patient-detail-page.tsx`) : ouvre la note SOAP de la visite `in_progress` ou, à défaut, de la **dernière visite terminée, même ancienne**. Pour Boby (`mp1inuxe42km4f5asu7`), c'est la consultation du **4 octobre**. Une note validée par ce chemin aurait été rattachée à une visite vieille de trois semaines.
- **La dictée « conservée »** n'existe que dans l'état React du panneau, sans sauvegarde : elle est perdue à la fermeture. Après le test, l'instance n'avait plus de panneau ouvert, et la base ne contient aucune ligne datée du 25 octobre.
- **Le schéma impose la visite** : `consultation_soaps.appointment_id` est `NOT NULL UNIQUE`. Une note SOAP sans visite est impossible.
- **La chronologie** (`patient-timeline.tsx`) ne lit que les rendez-vous, les vaccins et les pesées. Les notes libres (`notes.patient_id`) n'y figurent pas. Pour une visite, elle affiche le diagnostic, le traitement ou les notes du **rendez-vous**, jamais la note SOAP : sinon « Compte rendu non renseigné ».
- **Facturation** : créer une visite ne crée pas de facture. Le brouillon `appointment-invoice-…` ne naît que par la commande explicite de clôture avec facturation (`data/repositories/index.ts`).
- **À noter** : la base contient deux patients « Boby », Berger Allemand, créés à une seconde d'intervalle le 11 mai.

### 3.2 Où la note devrait se ranger

Dans une **visite du patient, datée du moment de la dictée**, visible dans sa chronologie avec son compte rendu. Cela suit la piste de Zouhir, à valider avec Aissa : ne pas forcer la prise de rendez-vous, mais forcer le rattachement.

### 3.3 Implémentation proposée (à valider avant tout code)

| Étape | Contenu | Estimation |
|---|---|---|
| 1 | Service `createVisitForNote(patientId, vetId)` : rendez-vous `Consultation`, début = fin = maintenant, motif « Consultation du moment (assistant) », propriétaire du patient, salle par défaut, entrée `audit_log`. Statut à valider avec Aissa : `in_progress` (reste ouverte, puis clôture habituelle) ou `completed` (sans facture : voir § 3.1) | 0,5 j |
| 2 | Assistant global avec un patient et sans visite : la validation crée cette visite, puis enregistre la note par le même chemin que `soap-panel` (extraire `persist` et `validateNote` en service partagé, trace `localAi.source` comprise). Le bouton dit ce qu'il fera : « Enregistrer dans une consultation d'aujourd'hui ». Sans patient : la copie actuelle reste, avec ce libellé explicite | 1 j |
| 3 | « Note clinique » : sans visite du jour, proposer « Nouvelle consultation maintenant » au lieu d'ouvrir la dernière visite terminée | 0,5 j |
| 4 | Chronologie : pour une visite qui a une note SOAP validée, afficher l'Évaluation et le Plan au lieu de « Compte rendu non renseigné » | 0,5 j |
| 5 | Dictée non validée : brouillon gardé dans la session, ou avertissement à la fermeture qui précise que la dictée sera perdue (l'avertissement générique existe déjà) | 0,5 j |
| 6 | Tests (SQLite réel en mémoire), captures avant et après sur instance isolée | 1 j |
| | **Total** | **environ 4 jours** |

Questions pour Aissa : statut de la visite créée, motif par défaut, et faut-il un rattachement à une visite existante du jour quand il y en a une ?

## Tests

| Contrôle | Résultat |
|---|---|
| Suite complète | **162 fichiers, 1 249 tests verts** (référence 1 231 ; 18 nouveaux) |
| Typecheck (`tsc -b`) | 0 erreur |
| ESLint | 0 erreur |

Nouveaux tests :
- mise en forme et canevas sous le contrôle de fidélité ;
- trame guidée et restitution des phrases protégées dans leur rubrique ;
- calcul des threads ;
- session de dictée gardée.

Les comportements visuels sont vérifiés par les captures dans le vrai moteur ; le panneau n'a pas de test d'interface automatisé.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `workers/whisper.worker.ts`, `local-ai/worker-protocol.ts`, `local-ai/shared-memory.ts`, `workers/embedding.worker.ts` | Threads, modèle gardé (`keep`), dossier de modèle et moteur pour le banc ; mémoire partagée mise en commun avec la recherche |
| `local-ai/whisper-threads.ts`, `local-ai/whisper-session.ts`, `hooks/use-local-consultation-ai.ts` | 4 threads ; modèle gardé entre deux rubriques ; `clearError` |
| `local-ai/soap-pipeline.ts`, `local-ai/treatment-routing.ts`, `local-ai/guided-soap.ts` | Trame guidée (`modelScaffold`), restitution dans la rubrique dictée (`mergeGuidedProtected`), texte de la dictée guidée partagé avec le banc, option `layout` (désactivée à l'écran) |
| `local-ai/soap-layout.ts`, `local-ai/dictation-scaffold.ts`, `local-ai/patient-context.ts` | Intitulés complets, mise en forme déterministe, canevas retiré avant la comparaison, consigne de mise en forme |
| `components/local-consultation-assistant.tsx`, `components/soap-panel.tsx` | Rubriques transmises, sortie de secours, retour visible, intitulés complets, trace d'origine |
| `scripts/eval-local-ai/` | Tâches `dictation` et `reference`, cas de référence, scénario de capture `dictee`, refus provoqué pour les captures |

## Note de reprise

1. **Décisions à prendre ensemble**, dans cet ordre :
   - (a) mise en forme déterministe de la note générée (§ 2.5) ;
   - (b) piste de vitesse de la dictée (§ 1.5), en commençant par une mesure sur le 16 Go d'Aissa ;
   - (c) lot 3, à valider avec Aissa (§ 3.3).
2. **Prescription en fin de Plan** : la remettre à sa place dictée (§ 2.3).
3. **Réinstaller Whisper small sur ce Mac ?** Non : les mesures le disqualifient. Garder medium.
4. **Pour rejouer les bancs** :
   - **Dictée.** Variables `BAITARI_EVAL_TASKS=dictation`, `BAITARI_EVAL_DICTATION` (liste JSON de `{ name, wav, text }`, WAV 16 kHz mono float32), puis `BAITARI_EVAL_WHISPER_THREADS`, `…_WHISPER_KEEP=1`, `…_WHISPER_FOLDERS`, `…_WHISPER_DEVICE`.
   - **Note.** `BAITARI_EVAL_TASKS=reference`, `BAITARI_EVAL_REFERENCE=scripts/eval-local-ai/cas-reference/otite-max.json`, `BAITARI_EVAL_VARIANTS=panneau,guidee,guidee-forme`.
   - **Captures.** `BAITARI_CAPTURE_SCENARIO=dictee`. Le scénario crée un compte de test et le patient fictif « Max » dans une **copie** temporaire de la base.
   - **Fenêtre.** Le banc tourne dans un binaire debug compilé pour le port 5181, dossier `target` cloné dans `~/Library/Caches/baitari-eval/target-5181`. On peut ainsi mesurer sans arrêter un `tauri:dev` ouvert.
5. **À arrêter** : l'instance `tauri:dev` du test tourne toujours (depuis le 24 octobre à 20 h 41) et occupe environ 1,4 Go.
