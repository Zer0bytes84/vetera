# Hospitalisation dans Clinique

## Phase 0 : état des lieux vérifié le 12 octobre 2026

Clinique possède les onglets Dossiers, Consultations et Soins dans clinical-workspace.tsx. Le module care-tasks conserve les tâches et leur historique en SQLite, leurs dates en ISO, leurs transitions atomiques et une piste Agenda issue de la même source. Il n'a pas encore de référence de séjour. Le dossier patient possède déjà une hospitalisation historique : hospitalizations et hospitalization_vitals, cage libre, états admitted/monitoring/critical/discharged/transferred/deceased, courbes et impression. Ces données doivent être conservées et rester lisibles. Le nouveau modèle doit distinguer état administratif et gravité clinique, sans transformer automatiquement les anciens états ambigus.

## Phase 1 obligatoire : analyse REA et provenance

Le dépôt demandé https://github.com/lsendel/openvpms est cloné dans /private/tmp/baitari-openvpms-rea, révision ff37da5dee8930628c4e83962e6d7bda757a650b. Il contient un parent Maven ; son README décrit les modules séparés. Les modules publics déjà clonés ont été réinspectés : openvpms-archetypes, révision 4af47847be452f6f166206bb1091c7a1ec5f9199 ; openvpms-web, révision 2cc1f90d340d00de869201844bcd0b9645734345.

REA 6.4.0 a exécuté import-reference-source sur chacun des deux arbres avant toute écriture de code Hospitalisation. Preuves complètes : /private/tmp/hospitalisation-rea-archetypes.json et /private/tmp/hospitalisation-rea-web.json. Leur autorité est historical-reference, leur inventaire partial. REA empreinte et inventorie les sources ; il ne démontre pas leur exécution. Les conclusions ci-dessous viennent de la lecture des fichiers Java/XML inventoriés. Aucun lancement Java/MySQL ni observation d'une version actuelle d'OpenVPMS n'est revendiqué.

### Cartographie observée

- Séjour/visite : archetypes patient/act.patientClinicalEvent.adl. Un patient, début, fin facultative, auteur, clinicien, lieu, motif, enregistrements et charges ; états IN_PROGRESS et COMPLETED. Ce n'est pas une table de séjour spécialisée équivalente à la demande.
- Emplacements : data/demo/nvappoint.xml, party.organisationSchedule.adl. Vue Boarding avec Dog Run, cages chiens par taille et cage chat ; paramètres de créneaux et double réservation. Les listes Main Hospital List/Branch Hospital List utilisent party.organisationWorkList. La capacité d'une liste n'est pas une preuve de capacité individuelle d'une cage.
- Tâches : workflow/act.customerTask.adl. Patient, client, type, clinicien, liste de travail, début/fin et états PENDING/CANCELLED/IN_PROGRESS/BILLED/COMPLETED. CheckInWorkflow.java crée une tâche et préserve son début pour la rattacher à la bonne visite. Un générateur de soins récurrents multi-jours n'est pas établi par ces preuves.
- Constantes : patient/act.patientWeight.adl conserve le poids ; les notes cliniques et investigations complètent la visite. Aucun schéma structuré température/FC/FR/appétit ni seuil par espèce n'est prouvé dans le périmètre lu.
- Sortie : CheckOutWorkflow.java complète la visite avec endTime et gère les conflits de mise à jour. Il propose facture et paiement ; la clôture clinique et la facturation sont des étapes distinctes.
- Facturation : act.patientClinicalEvent chargeItems, relations de charges ; data/demo/products.xml comprend des services d'hospitalisation par espèce et soins intensifs, avec prix unitaires. Le calcul automatique des journées n'est pas établi. Aucun tarif de démonstration ne sera repris.

### Modèle retenu pour Baitari

Reprendre la séparation visite/patient, ressource d'accueil, tâche et charge. Les exigences supplémentaires suivantes sont des choix Baitari, pas des comportements attribués à OpenVPMS.

## Modèle SQLite et invariants

- stays : patient_id, location_id facultatif, admitted_at, planned_discharge_at, discharged_at, status, reason, discharge_summary, cancellation_reason, author_id, timestamps, legacy_hospitalization_id unique facultatif. États admis -> en_cours -> sortie_prevue -> sorti ; annule depuis chaque état non terminal avec motif. Historique obligatoire. Index unique partiel sur patient actif. Occupation unique par emplacement actif, vérifiée transactionnellement.
- locations : nom unique, type cage/box/chenil, espèce compatible facultative, actif, notes, timestamps. Aucun emplacement fictif préchargé. Désactivation interdite si occupé.
- care_plans : stay_id, libellé, type de soin existant, produit facultatif, note, dates début/fin, heures locales explicites, actif, auteur et timestamps. Les horaires sont définis humainement, sans dose calculée.
- vital_signs : stay_id, recorded_at, température, FC, FR, poids, état général, appétit, note, auteur, timestamps. Valeurs absentes nulles. Les plages de surveillance par espèce devront être sourcées et présentées comme repères configurables, jamais comme diagnostic.
- stay_history : stay_id, événement, ancien/nouvel état, auteur, motif, date ; transferts d'emplacement tracés.
- care_tasks : extension nullable stay_id et care_plan_id, clé d'occurrence unique pour idempotence. Réutiliser le store et l'historique existants. Aucun deuxième registre de tâches.

## Comportements et intégrations

Admission et changement d'emplacement atomiques : pas de patient actif en double ni de cage active en double, y compris appels concurrents. Annulation et sortie annulent explicitement les occurrences futures non exécutées, sans supprimer les soins terminés ni leurs auteurs. Sortie exige date et résumé ; contrôle de sortie facultatif explicitement planifié dans Rappels.

Les plans génèrent leurs occurrences par jours calendaires locaux et heures choisies, pas par additions de 24 heures ; test de changement d'heure obligatoire. Une modification conserve les tâches exécutées et remplace seulement les occurrences futures. Répéter la génération ne duplique rien.

Agenda affiche admissions et sorties prévues comme événements dérivés des stays, sans créer de rendez-vous dupliqués ; clic vers Hospitalisation. Les soins restent lus dans care_tasks. Le dossier patient expose l'historique nouveau et ancien sans perte.

Journées : minimum une journée pour un séjour non annulé, puis nombre de dates calendaires locales occupées, sortie exclue si exactement minuit. Afficher la règle avant validation. Tarif choisi parmi produits/services réels, aucune valeur fictive. Produire une proposition de facturation validée humainement, idempotente, sans facturer une seconde fois le même séjour. Préserver les restrictions produit de facturation existantes.

## Interface

Hospitalisation est un onglet de Clinique à côté de Soins, sans entrée principale. Sous-vues Séjours, Occupation, Tournée et Emplacements ; détail de séjour avec soins, constantes et historique. Tournée tactile : cibles minimum 44 px, patient et emplacement visibles, saisie rapide des constantes et accès aux cartes de soins existantes.

SF Pro regular/medium ; tailles 12/13/14/16/18/24 ; gris #7F7F7F/#5D5D5D/#292929 ; bordures #F2F2F2 ; Lucide stroke 1 ; français ; aucun tiret cadratin. Pas de données de démonstration persistées.

## Vérifications et critères de livraison

Tests : transitions autorisées/interdites, motifs, unicité patient/emplacement concurrente, transferts, génération multi-jours idempotente, changement d'heure, calcul journées/minuit, annulation des seules tâches futures, admission -> constantes -> soins -> sortie -> rappel -> proposition de facture ; conservation des hospitalisations historiques. Rafraîchissement Agenda/occupation après commit.

Gates finaux : typecheck 0 erreur, lint 0 erreur et 0 avertissement, suite complète avec compte exact, build frontend, captures liste/détail/tournée/occupation/emplacements. Rapport fichier par fichier. Cette spécification n'est pas une preuve de leur implémentation ; la phase 2 ne commence qu'après sa rédaction.

## Avancement vérifié : contrôle à la sortie

Le détail d’un séjour sorti permet de choisir une date et de créer explicitement une tâche dans la table tasks existante, visible dans Rappels. La tâche reprend le patient et le résumé de sortie. Son identifiant déterministe stay-follow-up:<séjour> empêche les doublons, y compris sous contrainte SQLite. La création et son événement stay_history sont transactionnels. Une date inexistante ou antérieure à la sortie est refusée ; aucune tâche n’est créée avant confirmation de sortie. La modification ultérieure se fait dans Rappels. L’interface publie l’invalidation de tasks après commit.

Vérification : test SQLite admission -> sortie -> contrôle, date invalide, date antérieure, liaison patient, description, unicité et historique. Suite complète : 529 tests / 65 fichiers ; typecheck et lint ciblé Hospitalisation sans erreur ni avertissement. Build frontend réussi, avec les avertissements Vite existants sur les imports et tailles de bundles. Ces résultats ne prouvent pas encore la facturation ni les cinq captures visuelles, qui restent à terminer.

## Avancement : proposition de facturation des journées

Un séjour sorti présente une proposition de facture. Le vétérinaire choisit explicitement un tarif actif du catalogue, voit le nombre de journées et le total, puis crée un brouillon. Le tarif est une photographie en centimes ; la ligne représente une prestation journalière, sans consommation de stock. Le patient et son propriétaire sont vérifiés et le séjour est relu avant création. Le service billingService existant conserve les règles de facturation et son audit. Aucune émission ni aucun paiement automatique.

L’identifiant de facture stay-invoice:<séjour> est déterministe : les appels répétés réutilisent le document existant, et la contrainte SQLite protège les demandes concurrentes. Si un autre appel a créé la facture entre lecture et insertion, le document engagé est relu. La restriction web demeure visible. Les journées comptent les dates locales occupées, avec minimum une journée et exclusion d’une sortie à minuit.

Tests unitaires : tarif réel, patient/propriétaire, séjour clos, tarif archivé, auteur requis, réutilisation et création concurrente. Test d’intégration dans la base complète migrée : admission -> sortie -> contrôle Rappels -> facture brouillon unique, quantité journalière et total attendus, un seul audit de création et aucun paiement.

## Vérification visuelle et suivi du séjour

Les cinq sous-vues ont été rendues et capturées le 12 octobre dans un navigateur Chrome, avec les composants réels et une base SQLite en mémoire. Les états vides correspondent à la base locale actuelle (aucun séjour ni emplacement). Les captures remplies sont explicitement nommées test-isole : elles utilisent un patient existant et un séjour de contrôle non persisté en production. Elles ne constituent pas une preuve de données cliniques réelles ni d’un test natif Tauri.

Captures : /Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/hospitalisation/. Liste, détail, tournée, occupation et emplacements, sans erreur JavaScript ; verification.json précise la nature isolée des données. Le détail affiche les soins du séjour avec accès au suivi existant, ainsi que l’historique daté et attribué. Les résultats de lecture sont typés.

Gates de cette passe : typecheck réussi, lint global réussi sans sortie d’erreur ou avertissement, 534 tests / 66 fichiers réussis, build frontend réussi. L’audit final reste ouvert : vérification native et tactile, modification des plans futurs, gestion des emplacements dans l’interface et tests des changements d’heure/concurrence restent à renforcer avant déclaration complète.

## Gestion des emplacements et robustesse des horaires

La vue Emplacements permet d’activer et de désactiver une ressource. La désactivation d’une ressource occupée est refusée par le store et par le trigger SQLite. Le détail du séjour permet un transfert avec motif vers un emplacement actif et libre ; l’occupation et l’historique sont mis à jour après commit. Le formulaire d’admission propose uniquement les emplacements libres connus, et SQLite reste l’arbitre en cas de concurrence.

Tests supplémentaires : transfert vers ressource occupée ou inactive refusé, libération puis désactivation de l’ancienne ressource, admission concurrente sérialisée (une seule réussite, aucune trace partielle), horaires 08:00 conservés au passage aux journées de 23/25 heures, refus de 02:30 lors du passage à l’heure d’été en America/Toronto. Les tests de concurrence utilisent une file transactionnelle sur SQLite en mémoire, comme le sérialiseur du service local ; ils ne prétendent pas couvrir plusieurs processus natifs indépendants.

## Modification des plans de soins

Le détail présente désormais les plans du séjour et permet de modifier un plan actif. Le formulaire est prérempli. La modification atomique annule seulement les occurrences futures à faire, garde les anciennes tâches et leurs historiques, préserve les tâches réalisées, en cours et passées, puis génère les nouvelles occurrences futures. Les clés des occurrences remplacées sont libérées sans suppression des anciennes tâches. Les occurrences déjà exécutées ou démarrées gardent leur clé et ne sont pas recréées. Une modification identique est sans effet. Une valeur invalide déclenche le rollback complet.

La régénération complète uniquement les occurrences futures manquantes : elle ne fabrique jamais rétroactivement des tâches pour un nouvel horaire passé. Le test SQLite couvre modification, conservation auteur/libellé/statut, trace des annulations, répétition identique, régénération sans doublon et rollback. Résultat de la suite complète : 539 tests / 66 fichiers réussis.

## Audit final de livraison

Les mentions de travaux restants dans les comptes rendus intermédiaires ci-dessus sont remplacées par le bilan hospitalisation-bilan.md. Les plans futurs, emplacements, changements d’heure, concurrence locale et Tournée tactile ont désormais été vérifiés. Contrôles finaux : typecheck 0 erreur, lint global 0 erreur et 0 avertissement, 539 tests / 66 fichiers réussis, build frontend réussi. Captures des cinq vues dans hospitalisation-app, avec une capture tablette. Les tests visuels utilisent la coque réelle dans Chrome et SQLite isolé ; ils ne prouvent pas une exécution native macOS. Le résumé fichier par fichier et les limites sont conservés dans le bilan.
