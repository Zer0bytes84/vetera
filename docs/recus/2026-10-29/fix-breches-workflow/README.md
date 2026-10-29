# Correction des trois brèches du workflow (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commits locaux, aucun push. Aucun changement de schéma ni d'identifiant.

**Résultat :** les trois reproductions du bilan `workflow-complet` ont été rejouées dans le test complet, et passent. Sur ce rejeu, les 14 sondes de brèches sont toutes au vert (`mesures-workflow.json`).

**Vérifications :** Vitest 1 297 verts, dont 8 nouveaux (`tests/modules/consultation-workspace/fix-breches-workflow.test.ts`). Typecheck et ESLint à zéro.

## Conditions du rejeu

- **Même méthode que `workflow-complet` :** app de mesure en build release, HOME isolé, sauvegarde de la base réelle faite en lecture seule, notes écrites dans le panneau de l'assistant (à ta demande, sans micro), et leurre sur le Bureau isolé.
- **Les états du panneau de dictée** sont joués dans la même instance, en clair puis en sombre. macOS n'a pas accordé le micro à cette build : la source du micro est donc remplacée, uniquement dans le scénario de capture, par :
  - une source qui ne répond jamais (attente) ;
  - une source qui refuse (refus) ;
  - **l'audio réel d'un enregistrement de dictée**, joué dans le panneau (voix, puis silence). L'indicateur lit ainsi un vrai signal. C'est le même compagnon de dictée qui le transcrit ensuite.
- **Ce qui n'est pas prouvé :** le chemin micro physique, avec macOS qui accorde l'autorisation. Il reste à faire, avec ton autorisation ce soir (§ 5).

## B1. Clôturer et facturer sans note

### Constat de départ, à corriger dans le bilan workflow

`handleConsultationComplete` refusait déjà la clôture sans note validée, par un toast. Mon bilan workflow n'avait mesuré que l'état du bouton (actif), pas l'effet du clic. Le défaut réel était donc dans l'interface :
- le bouton restait actif ;
- le refus n'apparaissait qu'en toast, après coup ;
- rien ne menait à la note.

J'ai aussi vérifié les autres chemins vers la facture. Glisser une carte du Flux vers « À facturer » ouvre la même clôture. Seule cette clôture passe une visite en `completed` : l'Agenda ne propose que « Confirmer ». Il n'y avait donc pas de contournement par un autre écran.

### Correction

| Fichier | Changement |
|---|---|
| `src/modules/consultation-workspace/consultation-closure.ts` (nouveau) | `closureBlocker(soap)`, la règle unique. Elle renvoie le message si la visite n'a pas de note SOAP validée, et `null` sinon. |
| `src/modules/consultation-workspace/use-consultation-session.ts` | La clôture utilise `closureBlocker`, et la session expose `closingBlocker` pour la vue. |
| `src/modules/consultation-workspace/consultation-workspace.tsx` | Transmet `closingBlocker` au poste de consultation. |
| `src/modules/clinique/components/clinique-shared.tsx` | « Clôturer et facturer » est **désactivé** tant qu'il y a un blocage. Au-dessus, le message : « Pas de note validée pour cette visite : écrivez ou dictez la note, relisez-la et validez-la avant de clôturer et facturer. » Il est suivi de deux boutons : **Écrire la note**, qui place le curseur dans Subjectif, et **Dicter la note**, qui ouvre l'assistant. La vue reçoit la règle par props : c'est la règle de lint du projet. |
| `src/modules/consultations/components/soap-panel.tsx` | Ouvre son assistant à la demande « Dicter la note » de sa propre visite. |

### Reproduction rejouée

| Étape | Avant | Après |
|---|---|---|
| Consultation ouverte, sans note | Bouton actif | Bouton désactivé, message affiché (`3b-cloture-bloquee`) |
| Clic forcé sur le bouton | Toast de refus | Rien : statut toujours `in_progress`, pas de facturation ouverte |
| Ouvrir la dictée | Bouton « Assistant » | « Dicter la note » ouvre l'assistant : c'est ce chemin qu'a pris le rejeu |
| Note validée | — | Bouton actif, message disparu. Clôture, facture `INV-2026-000018` et PDF comme avant (`6b-facture-emise`) |

**Résultat :** passe. Sondes `facture-sans-note` et `cloture-bloquee-apres-note` au vert.

## B2. États du panneau de dictée

### (a) Autorisation du micro : plus d'état sans issue

| Fichier | Changement |
|---|---|
| `src/modules/consultations/local-ai/audio-capture.ts` | `prepareMicrophone` n'attend plus indéfiniment. L'attente se termine à la réponse de macOS, à « Annuler » (le signal d'abandon), ou au bout de **30 s**, avec un message. Un micro accordé trop tard est refermé aussitôt. Les messages de refus et d'absence de réponse disent comment autoriser : « Réglages Système → Confidentialité et sécurité → Microphone, autorisez Baitari, puis cliquez à nouveau sur Dicter. » |
| `src/modules/consultations/components/dictation-states.tsx` (nouveau) | `MicrophonePermissionWait`. Pendant l'attente : « Autorisation du microphone… », « Si macOS vous le demande, cliquez sur Autoriser. », et toujours un bouton **Annuler**. Au bout de 5 s, l'aide complète s'affiche. |
| `src/modules/consultations/components/local-consultation-assistant.tsx` | Affiche cet état à la place de l'indicateur générique d'activité. |

**Reproduction rejouée** (`mesures-etats-dictee.json`) :

| État | Capture | Mesure |
|---|---|---|
| Attente | `light-attente-micro` | Bouton « Annuler » présent |
| Attente au-delà de 5 s | `light-attente-micro-aide` | L'aide « Aucune fenêtre ne s'affiche ? Ouvrez Réglages Système… » est affichée |
| Pas de réponse en 30 s | `light-micro-sans-reponse` | Message « Baitari n'a pas reçu l'autorisation du micro… », et « Dicter » de nouveau disponible |
| « Annuler » pendant l'attente | `light-attente-annulee` | L'attente disparaît, et « Dicter » est disponible |
| Refus | `light-micro-refuse` | « L'accès au micro est refusé. Ouvrez Réglages Système… » |

**Résultat :** passe. Aucun état sans issue.

### (b) Animation d'enregistrement au niveau réel du micro

**La forme :** cinq barres verticales arrondies, dans la couleur d'enregistrement (`--destructive`, définie dans les deux thèmes), d'une hauteur de 28 px. Elles remplacent le point clignotant du bandeau « Écoute en cours ».
- **Quand on parle :** les barres montent avec la voix, plus haut au centre, avec un léger balancement pour qu'une voix soutenue ne paraisse pas figée.
- **En silence :** elles retombent à 5 px et respirent lentement (opacité), ce qui distingue d'un coup d'œil « ça enregistre » de « ça m'entend ».
- **Ce n'est pas un orbe à la Siri,** mais une forme sobre, du même langage que les badges de statut.

**Comment c'est fait :**

| Fichier | Changement |
|---|---|
| `audio-capture.ts` | `createLevelMeter(audio, stream)` : un analyseur à part sur le même flux micro, qui n'enregistre rien. `levelFromRms` convertit le signal : environ −55 dBFS (pièce calme) donne 0, et environ −15 dBFS (voix proche) donne 1. |
| `use-local-consultation-ai.ts` | Le compteur est créé avec la capture, libéré à l'arrêt ou à l'annulation, et exposé par `readLevel()`. |
| `dictation-states.tsx` et `.css` | `DictationLevelMeter`. L'animation passe par `requestAnimationFrame`, qui écrit des variables CSS : **aucun rendu React par image**, donc le panneau ne ralentit pas. La montée est rapide et la descente lente, pour que les barres ne clignotent pas entre deux mots. Avec « réduire les animations », la respiration s'arrête mais le niveau reste affiché, puisque c'est une information. |

**Reproduction rejouée** (hauteurs des cinq barres, en pixels) :

| Thème | Avec voix | En silence |
|---|---|---|
| Clair (`light-ecoute-voix`, `light-ecoute-silence`) | 14, 16, 25, 22, 13 | 5, 5, 5, 5, 5, en respiration |
| Sombre (`dark-ecoute-voix`, `dark-ecoute-silence`) | 14, 22, 23, 17, 15 | 5, 5, 5, 5, 5, en respiration |

Après « Arrêter », l'audio joué est transcrit : « Le propriétaire remarque que Max gémit lorsqu'il se gratte l'oreille. » (`light-transcription`).

**Résultat :** passe dans les deux thèmes. Le niveau réagit à la voix réelle de l'enregistrement et retombe dans le silence.

## B3. La Chronologie contredit la Synthèse

### Correction

`src/modules/patients/components/patient-timeline.tsx` :
- `consultationSummary(rdv, note)` lit **la note SOAP de la visite**, par la même source que la Synthèse (`soapsRepo.forAppointment`). Le résumé est l'évaluation, ou à défaut le motif, puis l'examen, puis le plan. Le détail est le plan.
- Une note qui n'est pas encore validée est signalée « Note non validée ».
- Les anciennes visites gardent leurs champs de compte rendu.
- « Compte rendu non renseigné » ne s'affiche plus que **sans aucune note**.
- Le résumé est limité à 3 lignes et le plan à 2. Sinon, un plan complet faisait une ligne de chronologie de 20 lignes. La note entière reste accessible par « Note clinique ».

### Reproduction rejouée

| Onglet | Avant | Après |
|---|---|---|
| Synthèse (`7d-dossier-synthese`) | Évaluation « Otite externe droite… » | Inchangée |
| Chronologie (`7e-dossier-chronologie`) | « Compte rendu non renseigné » | « Otite externe droite… Malassezia », puis « Plan · 1. Soins au cabinet… », statut « Terminé » |

**Résultat :** passe. Sonde `note-absente-chronologie` : Synthèse vrai, Chronologie vrai, « non renseigné » absent.

## 4. Le reste du test complet, rejoué

Les autres sondes restent au vert. Les statuts sont cohérents entre la base, le Flux, l'Agenda et le dossier. Le nom du PDF est stable : `Facture-INV-2026-000018-0ln513i.pdf`. Le leurre est intact. La note est retrouvée par mot et par le sens, attribuée à Max, et rien ne fuit vers le dossier de Rifka.

La sonde « Ouvrir sur une visite facturée » reste **non concluante**, comme dans le bilan workflow. L'Agenda revient en vue mois, et le menu de la ligne n'est pas atteint. Ce comportement a été démontré par la session Agenda Ouvrir.

## 5. Pour le test au micro de ce soir

L'app de mesure a été reconstruite pour ce rejeu, et macOS demandera donc à nouveau l'autorisation du micro.
1. Autorise « Baitari » dans Réglages Système → Confidentialité et sécurité → Microphone. C'est la copie dans `~/Library/Caches/baitari-eval/mesure`.
2. Ensuite, je relancerai `workflow.sh` sans `ECRIT=1`.

Si tu ne l'autorises pas, le panneau affiche désormais l'attente avec « Annuler », puis le message d'aide : ce n'est plus un état bloquant.

## 6. Fichiers

- `captures/` : le test complet (`1a` à `8d`, dont `3b-cloture-bloquee`) et les états de dictée (`light-…`, `dark-…`).
- `mesures-workflow.json` : les 14 sondes, toutes au vert.
- `mesures-etats-dictee.json` : les états du panneau et les hauteurs des barres.
- `journal.txt`, `base-apres.txt`, `bureau-apres.txt`.
- **Scénarios :**
  - `scripts/eval-local-ai/capture-workflow.ts` : sondes B1 et B3 ajoutées ;
  - `capture-etats-dictee.ts` (nouveau) ;
  - `capture-scenario.ts` : enchaînement des deux.

## 7. Test au vrai micro (29/10 au soir, après ton autorisation)

Même test complet, sans `ECRIT=1`. Les quatre rubriques du cas de référence sont jouées par les haut-parleurs, et le micro du Mac les écoute. Les preuves sont dans `micro-reel/`.

### micro1 : B2a vérifié en conditions réelles

L'autorisation que tu avais donnée ne couvrait pas cette copie de l'app de test. Elle est signée « ad hoc », avec une identité propre à ce build (`vetera-818aa3d9…`), et macOS la considère comme une autre app. Au bout de 30 s, le panneau ne reste pas bloqué : il s'arrête sur « Baitari n'a pas reçu l'autorisation du micro… » et rend « Dicter » disponible (`micro1-echec-4-dictee`). **C'est la correction B2a, observée avec le vrai micro.**

### micro2 : tu as cliqué « Autoriser »

| Étape | Résultat |
|---|---|
| 1 à 3, puis clôture bloquée sans note | Passe (`micro2-3b-cloture-bloquee`) |
| 4. Dictée au micro, quatre rubriques | **Passe.** Le micro écoute, et chaque rubrique est transcrite (`micro2-mesures.json`, champ `dictated`). |
| 5. Note générée par l'assistant | **Échec, arrêt ici.** Après 28,9 s, l'assistant rejette sa propre réponse : « La réponse de l'assistant n'est pas un JSON SOAP valide ». Le panneau propose « Relire ma dictée comme note » ou de corriger une rubrique (`micro2-echec-5-note`). |
| 6. Facture et PDF | Non jouée. Ce chemin est passé au rejeu en notes écrites (§ 1 à 4). |

**Ce que l'échec de l'étape 5 n'est pas :** une des trois brèches. C'est la sortie du générateur local, qui n'est pas dans le périmètre de cette session. Avec les mêmes rubriques saisies au clavier, la génération passait en 15 s. Ici, le texte transcrit diffère, et le générateur produit une réponse illisible. Le garde-fou refuse cette réponse, ne l'enregistre pas, et laisse une issue.

### Observation : le début des premières rubriques est perdu

Comparaison des textes joués (`rubrique-N-texte-joue.txt`) avec les transcriptions :

| Rubrique | Début joué | Début transcrit |
|---|---|---|
| R1 | « Le propriétaire remarque que Max gémit lorsqu'il se gratte l'oreille droite. Légère baisse… » | « Légère baisse… ». **La première phrase manque, soit environ 4 s.** |
| R2 | « Température 38.5 °C, normale. Fréquence cardiaque… » | « Normal. Fréquence cardiaque… ». **« Température 38.5 °C » manque, soit environ 2 s.** |
| R3 | « Otite externe droite… » | « Autite externe droite… » : tout est là, avec une erreur de reconnaissance sur le premier mot. |
| R4 | « Soins au cabinet… » | « Soin au cabinet… » : tout est là. |

- **Ce qui est sûr :** dans ce montage, les premières secondes des deux premières rubriques ne sont pas dans la transcription.
- **Ce qui ne l'est pas :** la cause. Il peut s'agir d'un démarrage de la capture plus tardif que l'affichage « Écoute en cours », ou d'un retard du haut-parleur ou du micro de ce Mac au réveil du périphérique audio.
- **Pourquoi ça compte :** un vétérinaire qui commence à parler dès le clic perdrait ses premiers mots. **À vérifier dans une session dédiée.** Rien n'a été corrigé ici, puisque c'est hors des trois brèches.

### Autres écarts de reconnaissance (pour mémoire)

- « mes appétits conservés » au lieu de « mais appétit conservé » ;
- « malassozia » au lieu de « Malassezia » ;
- « Collier Elisabeth » au lieu de « Collier élisabéthain » ;
- « installation des gouttes » au lieu de « instillation ».
