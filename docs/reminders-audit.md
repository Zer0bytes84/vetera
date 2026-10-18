# Audit du module Rappels existant

Date : 16 octobre 2026

## Périmètre audité

L’application possède trois mécanismes distincts qui partagent le mot « rappel » sans partager leur stockage.

1. Les rappels manuels de l’équipe sont des lignes de `tasks` avec `is_reminder = 1`. Ils alimentent les vues À traiter, À venir et Terminés de `src/components/Tasks.tsx`.
2. Les notifications de rendez-vous sont des lignes de `reminders`, liées à `appointments`, avec des échéances calculées à 15, 30, 60 et 1 440 minutes. Elles servent aux notifications locales et ne constituent pas des rappels médicaux.
3. Une première implémentation isolée de rappels patients existe dans `src/modules/patient-reminders`. Elle ajoute `patient_reminders`, `reminder_types` et `reminder_history`, et elle est déjà affichée au sein de la page Rappels.

Les deux premiers mécanismes sont fonctionnels et restent inchangés. Le chantier médical doit faire évoluer uniquement le troisième mécanisme et ses points d’intégration.

## Ressources et tables actuelles

### Rappels manuels

Table `tasks` :

- identité et contenu : `id`, `title`, `description` ;
- état : `todo`, `in_progress`, `done` ;
- priorité : `low`, `medium`, `high` ;
- planification : `due_date`, `start_time`, `end_time` ;
- rattachements : `assigned_to`, `patient_id` ;
- marqueur : `is_reminder` ;
- type optionnel ajouté par la migration 027 : `reminder_type_id`.

La vue filtre ces tâches selon l’utilisateur ou l’équipe, puis calcule la vue à partir de la date et du statut. La création rapide enregistre une tâche et ne dépend pas du futur stockage médical.

### Notifications de rendez-vous

Table `reminders` :

- lien obligatoire vers `appointment_id` ;
- canal `in_app`, `email` ou `sms` ;
- état `pending`, `sent`, `snoozed` ou `dismissed` ;
- `minutes_before`, `scheduled_for`, `sent_at`, `snoozed_until` et `message`.

`src/services/reminderService.ts` synchronise les notifications de rendez-vous à venir et les affiche par toast local. Ce mécanisme n’est pas un registre médical et ne doit pas être réutilisé pour les échéances vaccinales.

### Première base de rappels patients

Migration 026 :

- `reminder_types(id, code, name, interval_months, active, created_at, updated_at)` ;
- `patient_reminders(id, patient_id, type_id, product_id, source_id, family_key, due_date, origin, status, completed_at, cancellation_reason, author_id, created_at, updated_at)` ;
- `reminder_history` pour les transitions et reports.

États : `en_cours`, `traite`, `annule`. Le retard est déjà calculé à la lecture par comparaison de `due_date` avec le jour local.

Types initialisés : Vaccination à 12 mois et Antiparasitaire à 3 mois. La page permet déjà de modifier un type, filtrer l’origine, traiter, reporter, annuler, consulter l’historique, imprimer et exporter la liste d’appels.

## Événements et flux actuels

- Création manuelle : `Tasks.tsx` écrit dans `tasks`.
- Rendez-vous : `useAppointmentReminderSync` écrit dans `reminders` et `useReminderToasts` signale les notifications arrivées à échéance.
- Vaccination : `VaccinationDialog` appelle `patientRemindersService.saveVaccination` dans Tauri.
- `saveVaccination` enregistre l’acte et, si une prochaine date existe, crée immédiatement un rappel patient dans la même transaction.
- Une nouvelle vaccination termine automatiquement les rappels ouverts du même patient et de la même famille vaccinale.
- Les mutations émettent `baitari:patient-reminders-changed`; le hook recharge aussi au focus et toutes les 60 secondes.

## Agents et responsabilités actuels

- Vétérinaire : crée les tâches manuelles, enregistre l’acte et traite les échéances.
- Équipe : consulte la file commune et la liste d’appels.
- Administrateur : configure les types de rappels.
- Application locale : calcule les dates, persiste dans SQLite et rafraîchit les vues.

## Écarts avec le nouveau brief

1. La vaccination crée actuellement le rappel dès l’enregistrement. Le brief impose une proposition explicite, confirmable, modifiable ou refusée.
2. Les noms et états de la première base diffèrent du contrat demandé (`patient_reminders`, `traite`) alors que le brief demande `medical_reminders` et `termine`.
3. La première base ne couvre fonctionnellement que la vaccination, malgré un type antiparasitaire initialisé.
4. Les types prédéfinis contrôle annuel, soin dentaire et autre manquent.
5. Le traitement ne propose pas encore le rappel suivant.
6. Le filtre global Tous, manuels et médicaux n’est pas présenté comme un contrôle principal.
7. Le widget de tableau de bord demandé n’est pas raccordé aux rappels médicaux.
8. Les coordonnées sont visibles dans la liste d’appels, mais le numéro n’est pas encore une action tactile directe.
9. L’interface du module médical utilise encore une feuille CSS SF Pro locale, contraire au système actuel Space Grotesk et Geist.

## Décision de migration

La phase fonctionnelle fera évoluer la première base médicale sans modifier `tasks` ni `reminders`. Une migration additive créera `medical_reminders`, copiera les rappels patients existants de façon idempotente, conservera l’historique et laissera la table antérieure lisible pour compatibilité. Les écritures applicatives basculeront ensuite sur `medical_reminders`. Aucun rappel manuel ne sera converti, supprimé ou réécrit.

