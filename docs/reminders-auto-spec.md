# Rappels automatiques patients

## Phase 0 : existant audité

La page réelle est src/components/Tasks.tsx, et non Reminders.tsx. Elle combine tâches manuelles et notifications de rendez-vous. Les actions, affectations et filtres existants doivent rester disponibles. VaccinationDialog conserve administeredAt et nextDueAt, modifiables, dans vaccinations (administered_at/next_due_at). Les presets proposent déjà des intervalles en jours. Les notifications utilisent useNotificationCenter et les rappels de rendez-vous ont leur synchronisation propre toutes les 60 secondes.

Collision importante : la table reminders existe déjà, avec appointment_id obligatoire, états pending/sent/snoozed/dismissed et relations de rendez-vous. La remplacer détruirait un fonctionnement existant. L’extension utilisera reminder_types, patient_reminders et reminder_history ; patient_reminders est le stockage des rappels patients demandé, nommé explicitement pour préserver reminders. Aucun renommage ou déplacement des données existantes. Les tâches manuelles restent des tâches.

## Phase 1 obligatoire : provenance REA avant code

Le dépôt demandé est déjà cloné en /private/tmp/baitari-openvpms-rea (lsendel/openvpms, ff37da5dee8930628c4e83962e6d7bda757a650b). Le suffixe .Contexte du lien fourni est une erreur de texte ; le dépôt de référence est celui précédemment fourni. Le parent Maven décrit des modules séparés. REA import-reference-source a été exécuté pour cette mission sur openvpms-archetypes (4af47847be452f6f166206bb1091c7a1ec5f9199) et openvpms-web (2cc1f90d340d00de869201844bcd0b9645734345). Résultats complets : /private/tmp/reminders-rea-archetypes.json et /private/tmp/reminders-rea-web.json. Autorité historique et inventaire statique partiel ; aucune exécution Java/MySQL revendiquée. La documentation 2.2 demandée n’était pas accessible au navigateur de recherche ; les observations ci-dessous sont issues des sources inventoriées.

### Observations établies

- act.patientReminder.adl : patient, type obligatoire, produit facultatif, date de départ, échéance, auteur/clinicien, compteur de rappels envoyés, dernière émission, date de clôture et erreur. États exacts IN_PROGRESS, COMPLETED, CANCELLED, état initial IN_PROGRESS.
- entity.reminderType.adl et entityRelationship.productReminder.adl : intervalle/unités et relation produit/type, délai d’annulation, groupes. ReminderRules.calculateReminderDueDate utilise la date de départ et l’intervalle du type ; calculateProductReminderDueDate utilise la relation produit.
- ReminderRules.doMarkMatchingRemindersCompleted : lors de la sauvegarde d’un nouveau rappel en cours, les rappels persistants en cours du même patient et de type/groupe correspondant sont terminés. Aucun autre patient n’est touché. markCompleted renseigne completedDate.
- ReminderRules.shouldCancel : décès du patient ou échéance augmentée du délai d’annulation atteinte. Il s’agit d’une politique OpenVPMS, pas d’une règle implicite de Baitari.
- Le workspace reporting/reminder fournit ReminderCollector, ReminderListProcessor, ReminderPrintProcessor, ReminderExportProcessor et traitements par lots. Le traitement est distinct de l’acte clinique et du compteur d’émission.

### Choix Baitari, distincts des observations

Pas d’annulation automatique par simple retard dans cette V1. Annulation explicite avec motif obligatoire. Pas de SMS/courriel/réseau. L’enregistrement d’un nouvel acte vaccinal termine les rappels en cours correspondant au même patient et à la même famille vaccinale, puis crée le prochain rappel si une échéance est choisie. Modifier un acte existant ne doit pas être assimilé à une nouvelle administration. Un compteur d’actions ne sera pas présenté comme un compteur de messages envoyés.

## Modèle et invariants

reminder_types : id, nom, interval_months entier positif, active, code stable, timestamps. Valeurs initiales vaccination 12 mois, antiparasitaire 3 mois ; configurables, sans actes de démonstration.
patient_reminders : id, patient_id, type_id, produit/source vaccinale facultatifs, source_id unique pour idempotence, due_date date locale, origin auto/manuel, status en_cours/traite/annule, completion/cancellation_reason, auteur et timestamps. Origine conservée après report. en_retard est calculé à la lecture si en_cours et échéance antérieure au jour local, jamais stocké comme état.
reminder_history : id, reminder_id, action, ancien/nouveau état, ancienne/nouvelle échéance, motif, auteur, date. Modifications et histoire transactionnelles.

Calcul des mois calendaires avec plafonnement au dernier jour du mois (31 janvier + un mois = dernier jour de février), sans conversion UTC qui décale la date. Échéance proposée avant sauvegarde, vétérinaire libre de la modifier ou de ne pas générer de prochain rappel. Aucun changement manuel n’est écrasé silencieusement.

Migration : reprise des vaccinations ayant next_due_at dans un rappel d’origine manuel, clé de source déterministe, pas de suppression ni modification des vaccinations. Réexécution sans doublon. Préserver notifications rendez-vous et tâches manuelles.

## Interface et traitement

Extension de la page Rappels existante : rappels patients identifiés, filtres type/origine, traiter/reporter/annuler, Terminés avec historique, liste d’appels du jour avec coordonnées formatées, impression et CSV local, administration des types. Garder les fonctionnalités existantes accessibles. Rafraîchissement après commit et toutes les 60 secondes. Seul le retard a un signal fort ; états terminés/annulés neutres. Français, SF Pro, tailles et gris du design system, cibles tactiles au moins 44 px, aucun tiret cadratin.

## Vérifications à réaliser

Machine à états et motif ; échéances fin de mois/année bissextile ; retard local ; génération idempotente ; migration répétée ; auto-terminaison même patient/famille uniquement ; modification d’acte sans fausse administration ; rollback acte/rappel/historique ; cycle acte → rappel → traité → prochain ; conservation des tâches et notifications existantes. Typecheck, lint global sans avertissement, tests avec compte exact, build frontend. Captures Rappels, actions, Terminés, appels et types. Le présent document est la spécification préalable, pas une déclaration d’implémentation.

## Complément de provenance vérifié

Dans CustomerChargeActItemEditor.updateReminders, le changement de produit d’une ligne de facturation reconstruit les actes rappels à partir des relations produit/type. Chaque rappel reçoit le patient, le produit et la date de l’acte ; l’échéance est calculée depuis la relation produit, et la propriété interactive ouvre une édition préalable. ReminderCollector regroupe par contact et selon la possibilité de regroupement du type. Baitari reprend le principe acte/source et échéance proposée pour la vaccination, sans importer le moteur de facturation ou d’envoi d’OpenVPMS.

La vérification finale et les écarts de périmètre sont consignés dans reminders-auto-bilan.md.
