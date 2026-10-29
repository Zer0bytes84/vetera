# Lot 3 : note au dossier sans visite (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commits locaux, aucun push.

**Résultat :** depuis le dossier d'un patient, le vétérinaire écrit ou dicte une note hors visite : un appel, un conseil téléphonique ou une observation. L'assistant la structure en SOAP et le vétérinaire la valide. Elle n'est enregistrée qu'à ce moment-là. On la retrouve ensuite à trois endroits :
- dans la chronologie et dans les écrits du dossier, datée et marquée « Note hors visite » ;
- jamais dans le Flux ;
- dans la recherche, par mot et par sens.

## 1. Les quatre questions, et ce qui en a été retenu

| Question | Réponse | Retenu ? |
|---|---|---|
| (1) Ce que ferait un professionnel de premier plan | Garder la règle « rien en base sans validation », que le panneau SOAP de consultation n'applique pas puisqu'il enregistre au fil de la frappe. Dater, typer et attribuer la note. Prouver qu'aucun rendez-vous n'est créé. Tester l'oubli : une note qu'on ne retrouve pas n'existe pas. | **Retenu.** Le test de l'oubli a révélé un vrai défaut de la recherche instantanée (§ 3.3). Signalé sans y toucher : l'ordonnance sans visite crée encore un rendez-vous (§ 6). |
| (2) La matière la plus brute | Les lignes `notes`, `appointments` et `embeddings` pendant la démonstration ; le code de l'index (`documentSearchChunks`, `searchAllPatientsFastLexical`) ; le composant de l'aperçu. | **Retenu.** C'est la lecture du schéma réel qui a tranché la question du schéma (§ 2). |
| (3) Méthodes et outils | Une instance isolée sur une copie de la base ; le vrai parcours de l'interface piloté par scénario ; une vraie dictée au micro (clip joué par les haut-parleurs) ; des requêtes SQL avant et après ; des tests unitaires. | **Retenu.** |
| (4) Ce qui prouve le résultat, hors de nous deux | La base : une ligne `notes`, aucun rendez-vous en plus, une ligne `embeddings` portant le `note_id`. La palette qui retrouve la note par le sens, sans aucun mot commun. Les captures. Puis Aissa sur le terrain. | **Retenu**, sauf Aissa, qui reste à faire (§ 4). |

## 2. Le schéma : aucun changement

- **`consultation_soaps.appointment_id` est `NOT NULL UNIQUE`.** Une note SOAP sans visite n'y entre pas sans reconstruire la table. Toute la consultation suppose d'ailleurs une visite : Flux, facturation, produits, documents générés. Je ne le propose pas.
- **La table `notes` porte déjà `patient_id`** (migration de la ligne 277 de `schema.ts`), sans rendez-vous. L'index sémantique la couvre déjà : il l'invalide sur `content`, `tags` et `patient_id`, et ses déclencheurs vérifient le patient.
- **La note hors visite est donc une ligne `notes`.** Son `tags.offVisitNote` contient la nature de la note, les quatre sections SOAP, la transcription, la provenance (dictée, assistant ou saisie), puis `reviewedAt` et `reviewedBy`. Son `content` est le texte lisible, au même format que les autres écrits.
- **Pourquoi pas `clinicalDocument` :** avec ce tag, l'export PDF du dossier la rangerait parmi les « Documents générés », ce qui serait faux. Avec son propre tag, elle sort sous « Notes libres ».

**Estimation corrigée :** environ 1,5 jour au lieu de 4. Le stockage, l'index et l'assistant sans visite existaient déjà.

## 3. Ce qui a été fait, fichier par fichier

| Fichier | Changement |
|---|---|
| `src/modules/consultations/off-visit-note.ts` (nouveau) | Le domaine. Trois natures (`OFF_VISIT_KINDS`). `buildOffVisitNote` refuse une note non validée, vide, d'une nature inconnue ou sans patient, avant toute écriture. `saveOffVisitNote` vérifie que le patient existe, puis insère la ligne `notes` dans une transaction. `readOffVisitNote` distingue ces notes des autres écrits. Aucune ligne ne touche `appointments`. |
| `src/modules/patients/components/off-visit-note-panel.tsx` (nouveau) | Le panneau. Nature de la note, quatre sections SOAP et bouton « Dicter », qui ouvre l'assistant de consultation sans visite. Aucun enregistrement automatique. « Valider et enregistrer » pour une note tapée ; la validation de l'assistant pour une note dictée. Une note déjà enregistrée s'ouvre en lecture, avec sa nature, sa date de validation et la mention « sans rendez-vous ». |
| `src/modules/patients/components/patient-header.tsx` | Bouton « Note hors visite » dans les actions du dossier. Il est l'action principale quand aucune visite n'est en cours, et secondaire à côté de « Note clinique » sinon. |
| `src/modules/patients/patient-detail-page.tsx` | Le panneau s'ouvre en tête du dossier, comme la note de consultation, et les deux ne s'ouvrent jamais ensemble. Un résultat de recherche ouvre directement sa note. |
| `src/modules/patients/components/patient-timeline.tsx` | La chronologie affiche une ligne « Note hors visite », avec sa nature, son évaluation, son plan, le statut « Validée » et l'action « Lire la note ». Icône et couleur distinctes de « Consultation ». |
| `src/modules/patients/components/patient-documents-list.tsx` | Dans « Écrits du dossier », une note hors visite s'ouvre dans le dossier, pas dans l'éditeur libre de Documents. |
| `src/modules/consultations/local-ai/embedding-index.ts` | L'indexation sémantique accepte une note validée par `offVisitNote.reviewedAt`, en plus de `clinicalDocument.reviewedAt`. Elle refuse toujours une note non validée. |
| `src/modules/consultations/local-ai/embedding-store.ts` | **Correction d'un défaut (§ 3.3).** La recherche instantanée lit les notes les plus récentes d'abord : `ORDER BY updated_at DESC`, limite portée de 100 à 1 000. |
| `src/components/CommandPalette.tsx` | Un résultat « document » demande au dossier d'ouvrir sa note. |
| `tests/modules/consultations/off-visit-note.test.ts` (nouveau) | 6 tests : refus sans validation ou d'une note vide ; ligne datée, typée et validée, sans visite ; distinction des autres écrits ; indexation seulement après validation ; aucun rendez-vous ; ordre de la recherche instantanée. |
| `scripts/eval-local-ai/capture-lot3.ts` (nouveau), `capture-scenario.ts` | Le scénario de démonstration. |

### 3.1 Le parcours

1. Dossier patient, puis **Note hors visite**. Le bouton est dans les actions du dossier, sans rien chercher.
2. Choix de la nature : « Appel du propriétaire », « Conseil téléphonique » ou « Observation ».
3. **Dicter** ouvre l'assistant, le même que pour la consultation. Il gère la dictée au micro, la structuration de la note et la relecture.
4. **Valider et enregistrer la note**, dans l'assistant, ou **Valider et enregistrer** pour une note tapée. Avant ce clic, rien n'est en base.
5. La note s'affiche en lecture. Elle est ensuite dans la chronologie et dans « Écrits du dossier », et la recherche la retrouve.

### 3.2 Distinguer honnêtement la note d'une consultation

- Titre « Note hors visite · Appel du propriétaire » et mention « sans rendez-vous ».
- Ligne de chronologie distincte : icône crayon ambre, alors qu'une consultation a un stéthoscope bleu.
- Aucune ligne `appointments`, donc rien dans le Flux, l'agenda ou la facturation.
- À l'export PDF du dossier, elle sort sous « Notes libres ».

### 3.3 Défaut trouvé en vérifiant la recherche

`searchAllPatientsFastLexical`, la recherche instantanée de la palette, lisait les notes avec `LIMIT 100`, sans ordre. SQLite les renvoyait donc dans l'ordre d'insertion. Au-delà de 100 écrits dans la clinique, **les plus récents n'étaient plus trouvés par mot**. Ils l'étaient encore par le sens, quand le modèle est installé. La recherche lit désormais les 1 000 plus récents.

## 4. Démonstration

**Conditions :**
- une instance isolée, avec son propre HOME, une sauvegarde de la base réelle faite en lecture seule et des copies des modèles installés ; la base réelle n'est pas touchée ;
- un patient de test, « Max » (chien, propriétaire fictif), créé dans la copie, sans aucun rendez-vous ;
- le scénario `capture-lot3.ts`, qui clique dans la vraie interface ;
- les mesures dans `mesures.json` et `base-apres.txt`, et les captures dans `captures/`.

| Étape | Capture | Ce qui est mesuré |
|---|---|---|
| 1. Dossier de Max | `1-dossier` | Bouton « Note hors visite » en action principale. Base avant : 52 rendez-vous, dont 0 pour Max ; 0 note ; 0 ligne d'index. |
| 2. Nouvelle note | `2-note-vide` | Nature « Appel du propriétaire », quatre sections vides, mention « Rien n'est enregistré avant votre validation ». |
| 3. Dictée | `3-dictee` | Un enregistrement vocal de 23 s (`appel-texte-du-clip.txt`), transcrit par le **même compagnon et le même modèle que l'app** (`whisper-cli`, large-v3-turbo q8). Résultat dans `appel-transcription-whisper.txt`. Il est dicté rubrique par rubrique dans l'assistant : Motif, Évaluation et Plan. |
| 4. Relecture | `4-relecture` | L'assistant a produit une note en 10,5 s, que son **garde-fou de fidélité a refusée** : « La réponse de l'assistant ne reprend pas fidèlement les observations dictées ». Il propose alors de relire la dictée elle-même comme note, ce qui a été fait. **Base à ce moment : 0 note** : rien n'est écrit avant la validation. |
| 5. Validation | `5-note-validee` | « Valider et enregistrer la note ». La base contient alors **1 ligne `notes`** (« Note hors visite · Appel du propriétaire », datée du 29/10 à 13:18, origine `dictee`) et **toujours 52 rendez-vous, dont 0 pour Max**. |
| 6. Dossier | `6-chronologie` | Ligne « Note hors visite · Appel du propriétaire », statut « Validée », action « Lire la note ». |
| 7. Flux | `7-flux` | Max n'apparaît pas dans le Flux. |
| 8. Recherche par mot | `8-recherche-mot` | « gastrite » : la note de Max est trouvée, avec le mot surligné (correspondance `text`, score 0,388). |
| 9. Recherche par le sens | `9-recherche-sens` | « il rejette sa nourriture, estomac irrité », sans aucun mot commun avec la note : elle sort **en tête** (correspondance `semantic`, score 0,475), devant une consultation de Rifka. |
| Index | `base-apres.txt` | 2 lignes `embeddings` avec `note_id` = la note, `source_type = document`, une par génération d'index. |

### Ce que la démonstration ne prouve pas

- **La capture par le micro.** Le binaire debug n'a jamais reçu l'autorisation macOS du micro : le dialogue système attendait, et je ne l'ai pas validé à ta place. La reconnaissance vocale est donc réelle, avec le même compagnon, le même modèle et le même enregistrement, mais le son n'est pas passé par le micro. Le parcours de l'app après la transcription est, lui, exactement celui de la dictée.
- **Une note reformulée par l'assistant.** Avec le générateur actuel, sur cette dictée, le garde-fou de fidélité de l'assistant refuse sa proposition : c'est le même code que pour une note de consultation. Le parcours qu'il propose alors (relire sa propre dictée comme note, puis la valider) a été suivi. Le comportement du générateur n'est pas dans le périmètre de ce lot.
- **Le terrain.** Il reste à faire valider le parcours par Aissa.

## 5. L'aperçu du dossier en panneau coulissant (diagnostic seulement, rien n'a été modifié)

### Ce qu'il montre

`patient-peek-view.tsx` est un panneau de 620 px, modal sauf dans la liste des patients. Il contient :
- l'identité, les alertes cliniques et le contact du propriétaire ;
- trois onglets qui lui sont propres : **Synthèse** (dernière visite terminée, prochaine prise en charge, dernier poids, date de naissance), **Visites** (rendez-vous et leur statut) et **Suivi préventif** (vaccins, pesées, prochain rappel) ;
- un seul bouton, « Ouvrir le dossier détaillé ».

### Ce qu'il cache

- **Le contenu clinique.** Il ne montre aucune note SOAP, ni l'évaluation ni le plan, seulement des statuts de rendez-vous. Il ne montre pas non plus les notes hors visite, les ordonnances, les hospitalisations, les anesthésies, les documents ni les tâches.
- **Toute action.** Pas de note clinique, de planification, de soins ou de carnet.

### En quoi il gêne le travail

- **C'est la porte d'entrée par défaut.** `app-shell.tsx:484` passe `onNavigateToPatient: openPatientPeek` à toutes les vues : tableau de bord, Soins, Clinique, notifications, liste des patients. S'y ajoutent les clics directs sur le nom dans l'Agenda (`AgendaListView.tsx:254`) et sur une carte du Flux (`flow-board-page.tsx:289`). Aller au dossier coûte donc toujours deux clics. Seule la palette va directement au dossier : le comportement est incohérent.
- **Une troisième structure du dossier.** Ses onglets (Synthèse, Visites, Suivi préventif) ne sont pas ceux du dossier validé par Aissa (Synthèse, Chronologie, Ordonnances, Hospitalisations, Anesthésies, Vaccinations, Poids, Documents). Le même mot, « Synthèse », n'y désigne pas le même contenu.
- **Il couvre l'écran de travail.** En mode modal, avec un voile, il cache le tableau du Flux ou l'agenda qu'on était en train de lire.
- **Il ne répond pas à la question du poste.** « Qu'a-t-on conclu la dernière fois ? » demande quand même d'ouvrir le dossier.

### Proposition

1. **Supprimer le panneau comme porte d'entrée.** `onNavigateToPatient` ouvre le dossier lui-même (`handleNavigateToPatient`), partout, comme la palette. Le dossier garde un retour vers la vue d'origine (« ← Flux », « ← Agenda »), pour ne pas perdre sa place.
2. **Là où un coup d'œil sans quitter l'écran a un vrai sens** (une carte du Flux, une ligne de l'Agenda), le remplacer par une **carte de survol non modale** d'environ 320 px. Elle s'ouvre au survol ou au focus clavier et ne montre que ce qui sert au poste :
   - allergies et alertes ;
   - téléphone du propriétaire ;
   - dernière conclusion, avec l'évaluation et le plan de la dernière note, de consultation ou hors visite ;
   - prochain rappel ;
   - un bouton « Ouvrir le dossier ».

   Elle reprend les libellés du dossier validé, et réutilise le contenu de sa Synthèse (`PatientOverview`), pour qu'il n'existe plus qu'une seule structure.
3. **Liste des patients :** le parcours au clavier qui fait suivre l'aperçu au curseur (flèches, puis Espace) est le seul usage où le panneau a un vrai sens, pour trier une liste. Deux choix possibles : le remplacer par la même carte de survol, ou par une colonne de détail fixe à droite de la liste. **À trancher avec Aissa.**

Coût estimé : environ 1 jour pour 1 et 2, sans toucher au schéma. Rien n'est appliqué avant ta validation.

## 6. Hors périmètre, signalé

- **L'ordonnance sans visite crée toujours un rendez-vous** (« Nouvelle session de consultation créée pour l'ordonnance », `patient-detail-page.tsx`, onglet Ordonnances). C'est exactement la « visite fantôme » que ce lot évite pour les notes. Je n'y ai pas touché.
- **Une note hors visite ouverte depuis la page Documents** (éditeur libre) peut y être modifiée sans nouvelle validation. Le parcours du dossier l'ouvre en lecture, mais la page Documents reste un éditeur générique. Le même cas existe déjà pour les documents générés.
- **Une note hors visite se lit, mais ne se modifie pas depuis le dossier.** Pour la compléter, il faut écrire une nouvelle note. C'est un choix de cette version, à revoir avec Aissa.
- **Dans la palette, le résultat s'intitule « Document clinique ».** C'est le libellé de tout écrit du dossier dans la recherche. Le clic ouvre bien la note dans le dossier, mais il faudrait un libellé « Note hors visite ». C'est une petite modification, à faire avec la refonte de l'aperçu ou séparément.

## 7. Vérifications

- **Vitest :** 1 289 verts, dont 6 nouveaux. Typecheck et ESLint à zéro.
- **Schéma :** aucune migration et aucune colonne nouvelle. L'identifiant de l'app n'a pas changé.
- **Rien de supprimé ni de déplacé :** « Note clinique », « Rédiger » dans Documents, le panneau SOAP de consultation et l'aperçu en panneau coulissant sont inchangés.
- **Commits :** locaux, aucun push.
