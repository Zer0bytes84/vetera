# Sprint 6 — Scheduling v2 (rooms + recurrences + reminders)

**Statut** : ✅ Complètement livré
**Build** : 0 nouvelle erreur (22 erreurs baseline préexistantes S1/S3/S5)

---

## S6.1 — Migration 008 + types + repos + i18n (fait, non commité seul)

**Schema (`MIGRATION_008_SQL`)** :
- `appointments.room` (TEXT, default `consult-1`).
- `appointment_recurrences` (id, parent_appointment_id, frequency, interval_count, days_of_week, end_date, max_occurrences, generated_count + timestamps).
- `reminders` (id, appointment_id, minutes_before, channel, status, scheduled_for, sent_at, snoozed_until, message + timestamps).
- Backfill `reminders` pour RDV futurs (offsets 15/30/60/1440).
- Indexes sur `appointment_id` + `status` + `scheduled_for`.

**Whitelist tables étendue** (25 tables) : `useSQLite.ts` + `browser-store.ts` + `EMPTY_STATE`.

**Types `db.ts`** : `Appointment.room?` + `RecurrenceFrequency` + `AppointmentRecurrence` + `ReminderChannel` + `ReminderStatus` + `Reminder`.

**Repositories** :
- `useAppointmentRecurrencesRepository` : `forAppointment` + `active` + CRUD `add/update/remove`.
- `useRemindersRepository` : `forAppointment` + `pending` + `dueNow` + `upcoming(windowMinutes)` + `markSent/snooze/dismiss` + `defaultOffsets = [15,30,60,1440]`.

**i18n 6 langues** : `scheduling.*` (rooms/room/roomDescription/recurrence.*/conflict.*) + `reminders.*` (widget + toast) + `daysOfWeek.*`.

**Fixes post-implémentation** :
- i18n FR : retiré `logout` orphelin + `},` parasite.
- schema.ts : `END;\`;` manquant + `export const MIGRATION_008_SQL = \`` manquant.
- `VetKnowledgeService.getAllMedications()` getter public ajouté (utilisé par `medication-catalog.ts`).
- Clinique.tsx : `useTranslation` import + state order (selectedPatient ligne 802, effectiveSheetPatient ligne 2225, effectiveAppointmentId `?? ""`).
- Bilan : baseline 31 → 22 (fixées 9, ajoutées 0).

---

## S6.2 — Appointment dialog : room + recurrence + conflict detection (fait)

**`Agenda.tsx`** :
- 5 salles : `consult-1` (défaut) / `consult-2` / `surgery` / `hospitalization` / `imaging` (i18n `scheduling.rooms.*`).
- Récurrence : `weekly/biweekly/monthly/yearly` (RadioGroup) + `daysOfWeek` chips (Lun-Dim) si `weekly` + `endDate` (date input optionnel) + `maxOccurrences` (number input optionnel).
- **Conflict detection salle** : warning avec message i18n `scheduling.conflict.message` interpolé `{{room}}`, `{{start}}`, `{{end}}`, `{{patient}}` (toast + formError).
- **Conflict detection vétérinaire** : pré-existante conservée.
- `saveAppointment({ ..., room: formRoom })` propagé.
- Si `recurrenceEnabled && !editingAppointmentId` : insert `appointment_recurrences` avec `intervalCount: 1` + `daysOfWeek` JSON sérialisé si weekly.
- `recurrenceEnabled` désactivé en mode édition (mutex).
- Imports : `RadioGroup`/`RadioGroupItem`/`Checkbox` + `generateId` depuis `@/services/sqlite/database`.
- Constantes : `APPOINTMENT_ROOMS` (5) + `RECURRENCE_FREQUENCIES` (4) + `DAY_OF_WEEK_LABELS` (7).

**État form reset** : `resetForm()` clear tous les nouveaux fields (room = `consult-1`, recurrence off, frequency weekly, daysOfWeek []).

---

## S6.3 — Reminders service + widget dashboard + toasts (fait)

**`src/services/reminderService.ts`** :
- `useAppointmentReminderSync()` : pour chaque RDV futur non-seedé, génère 4 reminders (15/30/60/1440 min avant) avec `seededAppointmentIds` Set pour idempotence.
- `useReminderToasts()` : polling 60 s, toast dedupé par `(id, scheduledFor)` sur 90 s, `markSent` après toast.
- Status check : `cancelled`/`no_show`/`completed` exclus.

**`src/modules/dashboard/components/reminders-widget.tsx`** :
- Card avec 5 rappels max (window 240 min) + bouton snooze +10 min + dismiss.
- Skeleton loading.
- Empty state i18n.
- Helpers `formatRelativeTime` (Maintenant / dans X min / dans X h Y / dans X j).
- Patient name resolved via `usePatientsRepository`.

**Intégration** :
- `dashboard-orbit-page.tsx` : `<RemindersWidget />` ajouté Row 4 (3 colonnes `md:grid-cols-2 lg:grid-cols-3`).
- `Clinique.tsx` : `useAppointmentReminderSync()` + `useReminderToasts()` montés en haut du composant (polling app-wide).

---

## Bilan final

| Métrique                  | Sprint 5 | Sprint 6 |
|---------------------------|---------:|---------:|
| Migrations                |        0 |     +1 (008) |
| Tables                    |       24 |     +1 (recurrences) |
| Repositories              |        8 |     +2 (recurrences, reminders) |
| Clés i18n                 |     ~280 |     +50 (scheduling, reminders) |
| Composants UI             |     ~40  |     +1 (RemindersWidget) |
| Services                  |     ~20  |     +1 (reminderService) |
| Erreurs baseline TS       |       17 |       22 (préexistantes S1/S3) |
| Erreurs ajoutées S6       |        — |        0 |

---

## Prochaines étapes (S7)

- S7.1 : `backupService` durci (encryption AES-256-GCM, retention, scheduler).
- S7.2 : Audit log (table `audit_log` + `useAuditTrail()` hook).
- S7.3 : i18n `pt-BR` + `de` refinement.
