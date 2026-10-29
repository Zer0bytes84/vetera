# Correctifs de la dictée et de la génération (29/10 au soir)

Ce bilan suit le diagnostic `../diag-dictee/README.md` (commit `55d5bac`). Il couvre deux volets, chacun rejoué avec les cas du diagnostic.

- **P2, la génération : corrigée.** Commit `ca7d145`, complété par un second essai rubrique par rubrique (§ « Suite »). Les trois cas du diagnostic sont acceptés : trame micro2, rejeu 1 et rejeu 2. Le cas tapé au clavier est inchangé octet pour octet.
- **P1, le début de dictée : corrigé.** Commit qui suit ce bilan. Au vrai micro, les quatre rubriques sont complètes : « Le propriétaire remarque… », « Température 38.5 °C… », « Otite… » et « Soins au cabinet… ».
- **Test complet au vrai micro : passe.** Les étapes 1 à 5 passent, puis aussi 6 à 8 (facture, PDF, recherche) et les états du panneau de dictée.
- **Portes à zéro :** `tsc -b`, `eslint .` et `npm test` (1 325 tests).

Gemma 4 reste grisé. Ni schéma ni identifiant d'app ne changent. Les commits restent locaux.

## P2 : filtre des posologies par proposition

### Ce qui change

Le changement est dans `treatment-routing.ts` (`prepareGuidedSections`), avec ses branchements dans `soap-pipeline.ts`, `patient-context.ts`, `generate-soap.ts` et `soap-schema.ts`.

1. **Une rubrique dictée garde le filtre par phrase**, à une condition : il doit lui laisser du texte. C'est le cas du texte tapé, ponctué. Pour lui, rien ne change.
2. **Une rubrique que ce filtre viderait est filtrée par proposition.** On coupe aux virgules et aux points-virgules suivis d'une espace, donc 38,5 reste entier. Restent hors du modèle :
   - chaque proposition qui porte une dose ;
   - chaque énoncé routé (traitement, antécédent, négation, hypothèse) ;
   - toute proposition qui compléterait un motif de dose à travers le texte que voit le modèle. Par exemple, dans « …pendant le traitement, suivi, planifier une visite de contrôle dans 10 à 14 jours », la dernière proposition reste hors du modèle.
3. **Les propositions écartées reviennent mot pour mot, à leur place.** Elles sont réinsérées après le même nombre de mots que dans la dictée. Si les mots du résultat diffèrent de ceux de la dictée, c'est la rubrique dictée elle-même qui est rendue. Un mot ne peut donc jamais être perdu ni déplacé.
4. **Une rubrique que le code a vidée n'est jamais envoyée au modèle.** Cela couvre le filtre de posologie comme le routage existant. Le modèle reçoit alors seulement les autres clés (« les TROIS clés … »), et l'absence de la clé dans sa réponse est acceptée. S'il remplit quand même cette rubrique, la vérification de fidélité le refuse. Une clé en trop est toujours refusée par le schéma strict.
5. **Inchangé :** le schéma zod, `parseGeneratedSoap` (refus des posologies dans la sortie), `assertFaithfulSoap` et la dictée libre (non guidée).

### Garde-fou des posologies (tests)

Les tests sont dans `tests/modules/consultations/guided-clauses.test.ts`.

- **Posologie complète dictée sans aucune ponctuation :**
  - texte : « …prescription de Surolan 5 gouttes dans l'oreille droite 2 fois par jour pendant 10 jours contrôle dans 10 jours » ;
  - résultat : la rubrique est gardée, n'est pas envoyée au modèle, et revient identique, posologie exacte comprise.
- **La même posologie, avec des virgules :**
  - « 5 gouttes », « 2 fois » et « 10 jours » n'atteignent jamais le modèle ;
  - la rubrique revient identique, et le produit reste devant sa dose.
- **micro2 :** « gouttes auriculaires antibiotiques, antifongiques et anti-inflammatoires, 5 gouttes dans l'oreille droite, 2 fois par jour pendant 10 jours. » revient tel quel, à sa place.
- **Pour les trois cas du diagnostic :** aucune trame ne contient de posologie, et aucun mot dicté n'est perdu ni ajouté.

Un test existant (`treatment-model-boundary.test.ts`) attendait l'ancien comportement : un plan vidé par la protection d'un traitement était envoyé vide. Il attend maintenant que ce plan ne soit pas envoyé.

### Les trois cas rejoués au banc (Gemma 3, variante guidée, contexte du panneau)

| Cas | Avant (diagnostic) | Après | Trame après (caractères S / O / A / P) |
|---|---|---|---|
| Trame micro2 | refus en 28,8 s : S et P vides, réponse arrêtée au milieu d'une chaîne | **acceptée au 1er essai, 16,1 s** | 206 / 622 / 227 / 525 |
| Rejeu 2 | acceptée | **acceptée au 1er essai, 16,6 s** | 247 / 653 / 229 / 463 |
| Rejeu 1 | refus en 28,6 s : P vide, Gemma invente un plan | **refus en 19,3 s**, pour une autre cause (ci-dessous) | 76 / 646 / 642 / exclue |
| Tapé au clavier | acceptée en 15,1 s | **acceptée en 16,9 s, sortie et note identiques octet pour octet** | inchangée |

Les rapports complets sont dans [p2/](p2/) : trame, sorties brutes et comptes de jetons.

### Ce que le premier correctif laissait : le rejeu 1 (réglé par la suite ci-dessous)

- **Une entrée artificielle.** Le rejeu 1 vient du protocole du diagnostic : R2 a été dictée en O **et** en A, et R1 en P.
- **Ce qui est corrigé.** Le plan était vidé par le routage : la phrase niée de R1 part en S. Il n'est plus envoyé, et Gemma n'invente plus de plan.
- **Ce qui casse encore.** Gemma referme maintenant le JSON juste après `objective` et omet `assessment`. Le schéma strict refuse la réponse (« format non conforme »).

Témoins au banc, un seul paramètre changé à chaque fois :

| Témoin | Résultat | Ce que ça montre |
|---|---|---|
| Rejeu 1 avec un A distinct (R3 de micro2) | refus, `assessment` omis | La copie A = O n'est pas la seule cause. |
| Rejeu 1 avec le O de micro2 | **acceptée**, trois clés | Le déclencheur est ce O précis : 646 caractères transcrits en **une seule phrase**, suivi d'une clé finale. |
| Rejeu 1 avec P non dicté (envoyé vide, comme avant) | refus, plan inventé | C'est l'ancien comportement. |
| Cas tapé avec P exclu (seulement une dose) | **acceptée**, trois clés | Omettre une rubrique fonctionne en général. |
| Cas tapé avec A = copie de O | refus | Gemma 3 1B gère mal deux rubriques identiques, même avec quatre clés. |

- **Le constat.** Le refus restant tient à la fragilité de Gemma 3 au décodage glouton sur cette entrée-là. Ce n'est plus la cause du diagnostic.
- **Ce que le correctif garantit.** Le refus reste sûr : rien n'est enregistré, et « Relire ma dictée comme note » est proposé.
- **Ce que je n'ai pas tenté.** Assouplir le schéma, ou deviner une clé manquante : ce serait de la coercition.
- **Piste, non faite :** dans la dictée guidée, ne demander au modèle qu'une rubrique à la fois.

**Constaté aussi, hors du périmètre demandé.** Une rubrique que le vétérinaire **n'a pas dictée** est toujours envoyée vide, et Gemma peut la remplir : c'est le témoin « P non dicté ». La règle demandée ne couvre que les rubriques vidées par le code, donc je n'ai pas changé ce comportement.

### Suite : second essai rubrique par rubrique (rejeu 1 accepté)

**Ce qui change.** Le premier essai ne bouge pas : les quatre rubriques en une seule réponse. Les cas déjà acceptés au 1er essai (tapé, micro2, rejeu 2) sont donc identiques octet pour octet au passage précédent. Seul le second essai de la dictée guidée change, après un refus de format ou de fidélité. Le changement est dans `generate-soap.ts` (`retryParts`) et `soap-pipeline.ts`.
- **Une rubrique à la fois.** Chaque rubrique dictée est redemandée seule, avec sa seule dictée et une réponse JSON à une clé.
- **Les mêmes contrôles.** Chaque réponse passe le même analyseur strict, avec le même refus des posologies. Seule la clé demandée est gardée.
- **Une seule vérification de fidélité,** sur la note réassemblée.
- **Rien n'est redemandé pour une rubrique vide :** non dictée, ou vidée par le code.
- **Pour la dictée libre,** le second essai reste l'ancien.

**Banc (Gemma 3) :**

| Cas | Avant ce complément | Après |
|---|---|---|
| Rejeu 1 | refus, `assessment` omis | **acceptée en 24,7 s** (1er essai refusé, puis 3 rubriques redemandées) |
| Trame micro2, rejeu 2, tapé | acceptés au 1er essai | acceptés au 1er essai, **notes identiques octet pour octet** |
| Témoin « P non dicté, envoyé vide » | refus, plan inventé | **acceptée en 28,8 s, plan vide** : plus rien d'inventé |
| Témoin « tapé avec A = copie de O » | refus | **acceptée en 38,6 s** (4 rubriques redemandées) |
| Témoin « rejeu 1 avec A distinct » | refus | acceptée au 1er essai, 12,2 s |

Le dernier témoin passait déjà grâce à la consigne alignée sur la dictée d'origine, ajoutée plus haut. Je ne l'avais pas rejoué à ce moment-là.

**Au vrai micro, protocole du rejeu 1** ([p1/apres-C](p1/apres-C/analyse.txt)). Ce protocole échouait à l'étape 5 avec le build précédent. Cette fois :
- la note est générée, relue et validée ([5a-relecture](p1/apres-C/5a-relecture.jpg), [5b-note-validee](p1/apres-C/5b-note-validee.jpg)) ;
- la facture est émise, et le parcours va jusqu'au bout ;
- les quatre transcriptions sont complètes, et l'écoute est annoncée sur R1 à +4,24 s, à la marche.

**Le coût.** Un refus au 1er essai coûte maintenant un appel par rubrique dictée au lieu d'un : au banc, de 25 à 39 s au lieu d'environ 19 à 31 s.

## P1 : un micro pour les quatre rubriques, et l'écoute annoncée sur le niveau réel

### Ce qui change

- **Option `holdMicrophone` du hook,** activée par l'assistant guidé seulement :
  - le `MediaStream` et l'`AudioContext` restent ouverts d'une rubrique à l'autre ;
  - ils se ferment à l'annulation, au début de la génération, à la fermeture du panneau, sur une erreur, ou après 2 min sans dictée.
  - La recherche par la voix (`patient-document-search`) n'active pas l'option : son comportement est inchangé.
- **Nouvelle phase `warming`.** Sur un micro qui vient de s'ouvrir, l'enregistrement démarre aussitôt et le panneau affiche « Préparation du micro… Parlez dès « Écoute en cours ». ». « Écoute en cours » n'apparaît qu'une fois la montée du signal mesurée.
- **Le détecteur** (`microphone-warmup.ts`) lit le niveau RMS des échantillons enregistrés eux-mêmes, par fenêtres de 250 ms. Il annonce l'écoute quand deux fenêtres de suite dépassent de 10 dB la référence. La référence est la plus forte des fenêtres précédentes, sans compter :
  - la première fenêtre, transitoire de démarrage ;
  - celle qui précède immédiatement la montée, qui peut chevaucher la marche ;
  - la plus forte de toutes, dès qu'il y en a quatre, pour qu'un clic isolé ne masque pas la marche.
- **Le repli.** Une entrée qui ne monte jamais est prise comme prête au bout de 5 s. C'est un repli, pas la règle.
- **Le calibrage** s'appuie sur les 12 profils réels mesurés ce soir : 10 WAV du diagnostic et des essais, plus 2 cas synthétiques. Ils sont gardés comme tests.

### Mesures avant / après, au vrai micro

Le montage est celui du diagnostic : app de mesure release, `echoCancellation: false` (mesure seulement), `noiseSuppression: true` comme le produit. Les clips sont joués par `afplay` dès que « Écoute en cours » s'affiche, et chaque WAV envoyé à `whisper-cli` est capté.

**Clips d'origine R1 à R4, sans retard (conditions du micro2) :**

| Rubrique | Avant (micro2 et rejeu 1 du diagnostic) | Après ([p1/apres-A](p1/apres-A/analyse.txt)) |
|---|---|---|
| R1, micro neuf | secondes 0 à 2 du clip à −22 à −24 dB ; **« Le propriétaire remarque… » perdu** | marche à 3,5 s de capture, **écoute annoncée à +4,09 s** (par la montée), lecture à +4,18 s à plein niveau ; **« Le propriétaire remarque que Max gémit… » présent** |
| R2 | −25 dB sur les secondes 0 à 2 ; **« Température 38.5 °C » perdu** au micro2 | micro gardé ouvert : **aucune atténuation** (−0,6 / −1,4 / +0,6 dB) ; **« Température 38.5 °C, normale… » présent** |
| R3 | « Autite » (premier mot atténué) | « **Otite** externe droite… » |
| R4 | « Soin au cabinet » (micro2), puis « Soins au cabinet » perdu (rejeu 2) | « **Soins au cabinet**, nettoyage… » |

Pour R2 à R4, « Écoute en cours » s'affiche 0,25 s après le clic, sans préparation, puisque le micro est déjà ouvert.

**Protocole du rejeu 1 du diagnostic, mêmes clips (silence + R1, R2, silence + R2, R1),** dans [p1/apres-B](p1/apres-B/analyse.txt) :

| Position | Avant | Après |
|---|---|---|
| 1 (micro neuf, 5 s de silence en tête) | complet | complet ; écoute annoncée à +4,00 s, à la marche |
| 2 (R2 d'origine) | −25 dB sur les secondes 0 à 2 | **aucune atténuation** ; « Température 38.5 °C… » présent |
| 4 (R1 d'origine) | −24 dB, **première phrase perdue** | **aucune atténuation** ; « Le propriétaire remarque… » présent |

**L'atténuation n'a pas disparu, et je ne la masque pas.** Elle est toujours mesurée à **chaque ouverture neuve** du micro, à environ 3,5 s de capture, avec 15 à 25 dB d'écart. Ce que règle le correctif :
- elle n'a plus lieu qu'une fois par dictée guidée ;
- le panneau demande d'attendre jusqu'à sa fin ;
- tant que le micro reste ouvert, elle ne revient pas.

### Essais intermédiaires (gardés pour la trace)

- **[apres-A-banniere](p1/apres-A-banniere/analyse.txt) : artefact du montage.** Le scénario attendait le texte « Écoute en cours », que ma bannière de préparation contient (« Parlez dès « Écoute en cours » »). La lecture est donc partie pendant la préparation, et R1 a été coupée. Le scénario attend maintenant « Écoute en cours · », c'est-à-dire la vraie bannière, dans `capture-workflow.ts` et `capture-etats-dictee.ts`. Le même essai a échoué à l'étape 6, parce que mon build n'avait pas `BAITARI_CAPTURE_SAVE_DIR`. Les builds suivants suivent la recette complète.
- **[apres-A-detecteur1](p1/apres-A-detecteur1/analyse.txt) : première règle trop naïve.** Elle prenait la première fenêtre comme référence. Le transitoire de démarrage (−76 dB) a fait croire à une montée dès 0,7 s, et R1 a encore été coupée (« Quand il se gratte… »).
- **[apres-A-detecteur2](p1/apres-A-detecteur2/analyse.txt) : deuxième règle trop sensible aux clics.** Un clic à 0,5 s a relevé la référence, et l'écoute a été annoncée au repli de 5 s. R1 était complète, mais 1 s trop tard. La règle finale écarte la fenêtre la plus forte.

Captures du passage final : [4-dictee](p1/apres-A/4-dictee.jpg), [5a-relecture](p1/apres-A/5a-relecture.jpg), [5b-note-validee](p1/apres-A/5b-note-validee.jpg), [6b-facture-emise](p1/apres-A/6b-facture-emise.jpg).

## Ce qui n'est pas prouvé

- **Autres micros et autres Mac.** Le profil d'atténuation (marche à ~3,5 s) n'est mesuré que sur ce Mac, avec son micro intégré et ce montage par haut-parleurs. Sur un autre micro sans marche, l'écoute est annoncée au repli de 5 s : plus lent, mais sûr.
- **Une voix pendant la préparation.** Si le vétérinaire parle pendant la préparation, sa voix atténuée ressemble à une montée. L'annonce arrive alors environ 0,25 s trop tôt (trois profils du diagnostic, gardés comme tests). La bannière demande d'attendre.
- **L'origine exacte de l'atténuation,** dans WebKit ou Core Audio. Elle n'est pas isolée, comme au diagnostic. Le produit garde `echoCancellation: true`, alors que la mesure tourne sans. L'effet de l'annulation d'écho sur la marche n'est pas mesuré.
- **Le micro reste ouvert entre les rubriques** (voyant orange de macOS), au plus 2 min après la dernière dictée. C'est voulu, mais pas encore validé avec toi.
- **La robustesse générale du second essai.** Le second essai rubrique par rubrique n'est validé que sur ces cas, une rubrique copiée seule restant plus facile pour Gemma 3. Un cas où même une rubrique seule échoue reste refusé, sans danger : rien n'est enregistré, et « Relire ma dictée comme note » est proposé.
- **Le délai du clic jusqu'à la préparation.** Il est de 2,8 à 3,1 s au premier clic (statut du compagnon et `getUserMedia`), puis de 0,25 s. Il n'a pas changé, et ne coupe rien puisque l'écoute n'est pas annoncée avant.

## Rejouer

- **P2 :** [`../diag-dictee/p2/p2-banc.sh.txt`](../diag-dictee/p2/p2-banc.sh.txt) avec `BAITARI_EVAL_DIAG_TOKENS=1`, sur `scripts/eval-local-ai/cas-reference/otite-max-dicte-{micro2,rejeu1,rejeu2}.json` et `otite-max-ecrit-contexte.json`.
- **P1 :**
  1. Construire le frontend de mesure :
     ```bash
     BAITARI_CAPTURE_SCENARIO=workflow BAITARI_CAPTURE_SIGNAL=$HOME/Library/Caches/baitari-eval/workflow-home/signal BAITARI_CAPTURE_NO_AEC=1 BAITARI_CAPTURE_SAVE_DIR=$HOME/Library/Caches/baitari-eval/workflow-home/Desktop TAURI_ENV_PLATFORM=darwin npx vite build --config scripts/eval-local-ai/vite.capture.config.ts --outDir dist-capture
     ```
  2. Construire l'app :
     ```bash
     npx tauri build --bundles app --config '{"build":{"frontendDist":"../dist-capture","beforeBuildCommand":""}}'
     ```
  3. Copier le bundle dans `~/Library/Caches/baitari-eval/mesure/`. macOS redemande l'autorisation du micro.
  4. Lancer le pilote [p1/diag-p1.sh.txt](p1/diag-p1.sh.txt), puis [p1/analyse.py.txt](p1/analyse.py.txt) pour l'analyse. La comparaison de chaque WAV au clip se fait avec `scripts/eval-local-ai/compare-wav.py`.

L'app de mesure d'avant ce correctif est gardée dans `~/Library/Caches/baitari-eval/mesure-avant/`. Les WAV envoyés restent hors du dépôt, dans le dossier scratchpad de cette session.
