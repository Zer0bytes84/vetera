# Soins du jour : spécification V1

## Analyse préalable OpenVPMS, 12 octobre 2026

Dépôt demandé cloné dans `/private/tmp/baitari-openvpms-rea`. Il contient un parent Maven, pas l'application. Son README référence des modules séparés. Modules publics étudiés : `CharltonIT/openvpms-web` (révision `2cc1f90d340d00de869201844bcd0b9645734345`) et `CharltonIT/openvpms-archetypes` (`4af47847be452f6f166206bb1091c7a1ec5f9199`). Ces sources historiques ne prouvent pas le comportement des versions actuelles d'OpenVPMS.

REA 6.4.0 : connexion MCP stdio et catalogue vérifiés. Appel MCP `trace_feature` avec `act.customerTask` : résultat `target_unavailable`, car cet outil exige une application native ouverte. Import REA `import-reference-source` effectué sur les archetypes : `HistoricalSourceGraph`, autorité `historical-reference`, inventaire `partial`, Java/XML, relations vides. Il inventorie et empreinte les sources, mais ne démontre pas à lui seul leur sémantique. Rapports conservés dans `/private/tmp/openvpms-rea-trace.json` et `/private/tmp/openvpms-rea-source-inventory.json`. L'analyse métier ci-dessous provient de la lecture explicite des fichiers, pas d'une exécution de l'application. Le lancement Java/MySQL de cette distribution historique n'a pas été réalisé.

### Modèle observé

`src/archetypes/org/openvpms/archetype/workflow/act.customerTask.adl` : client obligatoire, patient optionnel, type de tâche obligatoire, heure de début obligatoire, heure de fin optionnelle, début de consultation interne, notes, clinicien optionnel, auteur interne, liste de travail obligatoire, relation optionnelle vers rendez-vous. Aucun produit attaché directement à cette tâche. Ce modèle représente une tâche de workflow de consultation, pas un soin médicament horaire.

### États et acteurs observés

Même archetype : `PENDING`, `IN_PROGRESS`, `BILLED`, `COMPLETED`, `CANCELLED`. `TaskStatus.java` classe COMPLETED/CANCELLED comme terminaux, les trois autres comme incomplets. `worklist/TaskActEditor.java` fournit l'édition ; l'archetype contraint les valeurs mais n'exprime pas de graphe exhaustif de transitions ni de permissions par rôle.

`workflow/consult/ConsultWorkflow.java`, méthodes `createInProgressTask` et `createBilledTask` : lancement du workflow de consultation passe en IN_PROGRESS sauf si déjà IN_PROGRESS/BILLED/COMPLETED ; pour une tâche, renseigne consultStartTime. Une facture COMPLETED entraîne BILLED. `workflow/checkout/CheckOutWorkflow.java` : sortie passe la tâche en COMPLETED et renseigne endTime. Ce sont des actions du workflow utilisateur ; aucune matrice de permissions plus précise n'a été établie.

### Retard et effets

`worklist/TaskTableModel.java#getStatus` affiche pour PENDING une durée d'attente calculée entre startTime et maintenant. Aucun état OVERDUE de tâche, ni marge de tolérance, n'a été trouvé dans ce module. Ne pas présenter une règle de retard Baitari comme une règle OpenVPMS.

`src/rules/org/openvpms/archetype/rules/archetypeService.save.act.customerTask.after.drl` met à jour le rendez-vous associé après sauvegarde. Le statut BILLED suit la facture ; terminer une tâche n'est pas la preuve d'une création de charge. Aucun décrément de stock dans TaskService/TaskFactory ni dans cette règle. Les effets de facturation/stock relèvent d'autres actes et ne seront pas copiés.

Sources : [parent](https://github.com/lsendel/openvpms), [archetypes](https://github.com/CharltonIT/openvpms-archetypes), [web](https://github.com/CharltonIT/openvpms-web).

## Modèle Baitari demandé

Table additive care_tasks : id, patient_id FK patients, label, type (medicament/perfusion/controle/sortie/autre), heure_prevue ISO datetime, statut stocké (a_faire/en_cours/fait/annule), execute_par, produit_id optionnel réservé à B4, note, motif_annulation, recurrence optionnelle, created_at, updated_at, completed_at. Historique séparé lié à la tâche : états avant/après, date, auteur et motif. Aucun changement des tables existantes.

Retard dérivé à la lecture si heure_prevue < maintenant et état stocké a_faire/en_cours. Aucune tolérance, aucun job et aucun statut de retard persisté. L'instant prévu exactement égal à maintenant n'est pas en retard. Rafraîchissement de la vue et des compteurs toutes les 60 secondes. Le retard est une projection temporelle, pas une action humaine à attribuer artificiellement à un utilisateur.

Transitions : a_faire vers en_cours ou fait (validation en un tap), en_cours vers fait ; a_faire/en_cours vers annule avec motif non vide. Retard vers fait par la même transition du statut stocké. États terminaux non modifiables. Écritures de transition et historique atomiques ; auteur courant obligatoire. Validation concurrente protégée pour éviter double événement.

## Vue et création

Patients ayant des tâches du jour uniquement. Modes patient et heure, retards d'abord, filtres tous/à faire/en retard/terminés, recherche patient, panneau détail avec historique et actions. Création manuelle avec patient, libellé, type, horaire, produit optionnel et note. Une occurrence en V1.

Plan SOAP validé : extraction déterministe de phrases, préremplissage à ajuster et confirmer. Ne pas inventer d'horaire ni de dose, ne pas créer automatiquement. Point d'extension IA distinct, sans appel de modèle en V1.

## Hooks

Après transaction réussie, `onCareTaskCompleted(task)` isolé et événement `careTaskCompleted` avec patient, acte, horaire prévu et réel, exécutant, produit. Aucun changement de stock. La facturation, ajoutée sur demande après la V1 initiale, est décrite ci-dessous. Les échecs éventuels d'intégration ne doivent pas faire croire que l'écriture SQLite a échoué.

## Design et preuves attendues

SF Pro regular/medium, tailles 12/13/14/16/18/24 maximum, gris du brief, pictogrammes à trait 1, boutons tactiles au moins 44px. Alertes de retard distinctes et lisibles, pas de bleu systématique. Inspiration consultée : [Doctors Management](https://dribbble.com/shots/27358789-Healthcare-dashboard-design-Doctors-Management), hiérarchie calme et lisibilité de planning, sans copie.

Tests exhaustifs transitions, seuil temporel, génération verbatim, hooks, création/validation relues dans SQLite réel. Vérifier typecheck, lint sans avertissement, suite entière, build frontend, captures patient/heure/retard/détail. Aucune fonctionnalité n'est déclarée terminée avant ces preuves.

## Contrat d’implémentation du service

`store.ts` utilise le sérialiseur et les transactions IMMEDIATE existantes. Création et historique sont atomiques. Une transition relit la tâche dans la transaction, vérifie auteur/motif et états permis, protège l’UPDATE par état précédent, puis inscrit l’historique. La seconde validation d’une tâche terminée est refusée, donc aucun deuxième événement.

`hooks.ts` expose `registerCareCompletionHook`, `onCareTaskCompleted`, `subscribeCareTaskCompleted` et l’événement navigateur `careTaskCompleted`. Le hook stock est vide par défaut. Le payload comporte taskId, patientId, act (libellé verbatim), scheduledAt, completedAt, executorId, productId. Tout est exécuté après commit. Chaque erreur d’intégration est isolée ; elle ne remonte pas comme un échec de sauvegarde.

`use-care-tasks.ts` relit les soins du jour à l’ouverture, toutes les 60 secondes, au retour de focus et après événement de modification. Le jour est délimité en heure locale, puis converti en ISO UTC pour les comparaisons SQLite.


## Évolutions approuvées après la V1 et audit du 13 octobre 2026

Ces demandes ultérieures remplacent les restrictions de navigation et de facturation du brief initial :

- Les soins appartiennent à **Clinique → Soins**, à côté de Dossiers et Consultations. Aucune entrée autonome Soins du jour dans la sidebar. Le lien historique `#/soins` ouvre cet onglet ; le dossier patient peut le filtrer sur son patient.
- L’Agenda affiche les mêmes enregistrements `care_tasks` dans une piste dédiée, ambre avec une icône distincte. Lecture par jour ou semaine, et jour sélectionné en vue mois. Le clic demande le soin par identifiant à Clinique, sans créer de rendez-vous ni de copie.
- Le formulaire unique utilise la recherche patient, le calendrier existant et les créneaux/ajustements à la minute réutilisés des rendez-vous. Date et heure locales sont normalisées en ISO UTC par le store. La confirmation est inactive si un champ obligatoire manque ; après création la liste bascule sur la date créée.
- L’événement post-commit est consommé par la facturation. Une seule facture **brouillon** `care-invoice:<taskId>` et une ligne par soin effectué. Tarif réel du produit associé lorsqu’il existe, sinon tarif à compléter ; prix éditable avant émission. Aucune émission automatique, aucun paiement automatique, aucun mouvement de stock.
- Les soins effectués sans facture sont repris à la prochaine lecture. L’échec d’une facture est isolé : tous les soins restent visibles, les autres reprises continuent et une notification française indique l’échec. La prochaine actualisation retente ; une facture déjà créée ne peut pas être dupliquée.
- Les actions de validation gardent une cible de 44 px, y compris en Premium qui compacte normalement les boutons de l’application.

Le hook stock reste un point d’extension vide et la suggestion automatique par un modèle reste hors V1. La récurrence demeure un champ réservé. Le bilan courant, les limites et les preuves sont dans `docs/treatment-sheet-implementation.md`.


## Complément REA et clinique, reprise du 13 octobre 2026

Avant toute modification de cette reprise, les 17 fichiers source ciblés ont été réunis dans `/private/tmp/openvpms-care-reference-2026-10-13.zip`, sans ajouter OpenVPMS au projet. Les fichiers proviennent des clones et révisions historiques indiqués plus haut, sans modification. Un manifeste conserve leurs chemins et SHA-256. Les appels MCP REA `open_binary` puis `inspect_artifact` ont inspecté cette archive : SHA-256 `98b508c51ac5406b54a880caa6a583ca4a6b6314fdf8aa6afb582f16de5bbfe8`, preuve `ev_5d64470a55f335db7d06704ec41755ddc5041b0cfc8f13a7f8ca79989bdf16e7`, inventaire complet dans les sous-étapes de cette archive. Ce n’est pas une preuve d’exécution : REA observe les octets de notre archive de référence, pas un produit OpenVPMS déployé, et ne déduit pas la sémantique Java. Rapport durable : `/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/care-rea-renewal/evidence.json`.

### Modèles cliniques complémentaires observés dans les sources

- `act.patientMedication.adl` : patient et produit obligatoires, date de délivrance obligatoire, échéance facultative, quantité, instructions, lot, clinicien et auteur. Relations facultatives vers prescription, élément de facture et événement/problème clinique. Il s’agit d’une délivrance, pas d’une tâche horaire avec états à faire/en cours/fait.
- `act.patientPrescription.adl` : patient, produit, prescripteur, auteur, date, échéance, quantité, renouvellements et instructions ; délivrances reliées séparément. `PrescriptionRules.canDispense` exige une échéance au moins égale à aujourd’hui et des renouvellements restants. `cancel` passe l’échéance à hier et sauvegarde seulement si la prescription peut encore être délivrée. Aucune de ces règles ne correspond au retard horaire d’un soin.
- `ChargeItemEventLinker` relie délivrances, investigations et documents de facture aux événements du patient. `ChargeStockUpdater.update(FinancialAct)` met à jour le stock à la sauvegarde d’un élément de charge. Ces effets appartiennent aux actes de facturation/délivrance ; ils ne prouvent aucun mouvement de stock à la fin de `act.customerTask`.

### Déclencheurs et acteurs explicitement observés

| Déclencheur OpenVPMS | Condition/effet attesté | Source |
| --- | --- | --- |
| Création d’une tâche | Statut initial PENDING | `act.customerTask.adl` |
| Démarrage du workflow de consultation | Passe en IN_PROGRESS si l’état n’est pas IN_PROGRESS, BILLED ou COMPLETED ; renseigne le début de consultation de la tâche | `ConsultWorkflow.createInProgressTask` |
| Fin du workflow de facturation de consultation | Passe la tâche en BILLED si la facture est COMPLETED | `ConsultWorkflow.createBilledTask` |
| Workflow utilisateur de sortie | Passe en COMPLETED et renseigne l’heure de fin pour une tâche | `CheckOutWorkflow` |
| Édition manuelle du statut | COMPLETED/CANCELLED fixent l’heure de fin à maintenant ; les autres la remettent à vide ; IN_PROGRESS fixe le début de consultation | `TaskActEditor.onStatusChanged` |
| Sauvegarde d’une tâche | Met à jour le rendez-vous associé | `archetypeService.save.act.customerTask.after.drl` |

Les autorités de démonstration `Task Create`, `Task Save`, `Task Remove` portent sur create/save/remove de `act.customerTask` et sont rattachées au `Base Role` dans `roles.xml`. Elles prouvent ces autorités historiques, pas les permissions d’une installation actuelle. Les workflows sont déclenchés par leurs actions utilisateur ; aucune matrice d’interdiction de toutes les transitions n’est définie dans l’archetype ou l’éditeur étudié. Les règles strictes de Baitari restent donc explicitement celles du brief et de ses tests.

### Navigation demandée, adaptée aux décisions ultérieures

Le compteur des tâches du jour en retard doit être visible sur **l’onglet Soins de Clinique**, y compris avant d’ouvrir la liste. Il est dérivé des mêmes données et actualisé à 60 secondes ; il respecte le filtre patient s’il existe. Il ne rétablit pas l’entrée sidebar supprimée sur demande. Le badge n’apparaît que pour un retard réel et sa description accessible précise le nombre de soins en retard.


Les icônes propres aux Soins sont désormais les tracés SVG Lucide CalendarDays, Clock, ChevronDown et Clipboard, inclus localement dans `care-icons.tsx` avec un trait de 1 px. Les licences ISC/MIT sont conservées dans `public/licenses/lucide-care-icons.txt` ; aucune bibliothèque n’est installée et aucune ressource distante n’est demandée à l’utilisation.
