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

---

# Sprint 7 — Hardening (S7.1 fait)

## S7.1 — Backup service durci (AES-256-GCM + retention + scheduler) — ✅

**Nouveaux fichiers** :
- `src/services/backupCrypto.ts` (264 lignes) — AES-256-GCM + PBKDF2 (WebCrypto natif, 0 dépendance).
- `src/services/backupScheduler.ts` (160 lignes) — setTimeout-based scheduler (off/daily/weekly) + bootstrap catch-up.

**Container layout** (big-endian, 40-byte header + payload) :
```
[8 bytes]  magic "BAITDB\0\0"
[2 bytes]  version 0x0001
[2 bytes]  flags (bit 0 = encrypted)
[16 bytes] PBKDF2 salt
[12 bytes] AES-GCM IV
[N bytes]  ciphertext (auth tag inclus)
[32 bytes] SHA-256 of plaintext
```

**Crypto** :
- KDF : PBKDF2-HMAC-SHA256, **120 000 itérations**, salt 16 octets aléatoires.
- Cipher : AES-256-GCM, IV 12 octets aléatoires, auth tag 16 octets.
- Intégrité : SHA-256 du plaintext stocké en fin de container, vérifié en constant-time.

**Rétention** : MAX_BACKUPS = 5, MAX_BACKUP_AGE_DAYS = 60, prune automatique à chaque `createBackup` (count + age).

**Scheduler** :
- `loadSchedulerSettings()` / `saveSchedulerSettings()` persistées dans `app_settings["backup_scheduler"]`.
- `startScheduler({ frequency, passphrase })` + `stopScheduler()` + `getSchedulerStatus()`.
- `bootstrapScheduler()` monté dans `AuthContext` : catch-up auto au boot si l'intervalle est écoulé.
- `setTimeout` chain (pas `setInterval`) pour ne pas se déclencher en parallèle.

**API publique étendue** :
- `createBackup(reason?, passphrase?)` → écrit `.bdb` (chiffré) ou `.db` (plaintext container).
- `restoreBackup(filename, passphrase?)` → déchiffre, vérifie SHA-256, vérifie magic SQLite.
- `exportDatabase(passphrase?)` → même logique, écrit dans le path choisi par l'utilisateur.
- `importDatabase(passphrase?)` / `importDatabaseFromFile(file, passphrase?)` → détecte encryption via magic bytes.

**i18n** : nouvelle section `backup.*` (FR + EN) avec 16 clés (scheduler + encryption + error messages).

**Build** : 0 nouvelle erreur TS (19 baseline inchangée).

## S7.4 — Time picker ergonomique (sous-tâche S7) — ✅

**Problème** : `<Input type="time">` natif peu pratique (saisie exacte obligatoire), 12 quick times 30min peu lisibles.

**`AppointmentTimePicker` (Agenda.tsx)** — composant dédié avec :
- **Centre** : `<Input type="time">` tabulaire centré, font-semibold, 24 chars width, validation regex `/^([0-1]?\d|2[0-3]):[0-5]\d$/`.
- **Stepper ±1h** (flèches Hugeicons ArrowLeft/Right).
- **Stepper ±15min / ±5min** (boutons ghost).
- **Fin live** : `endLabel = minutesToTime(valueMinutes + durationMinutes)` affichée en dessous, mise à jour en temps réel.
- **3 sections groupées** : "Matin" (06:00-12:00) / "Après-midi" (12:00-18:00) / "Soir" (18:00-22:00) avec chips 30min depuis `QUICK_TIMES` étendu (20 créneaux : 08:00 → 19:00).
- **`tabular-nums`** sur tous les chiffres pour alignement vertical.
- **`size="xs"`** + `variant={active ? "default" : "outline"}` pour chip actif clair.
- **Helpers** : `timeToMinutes` / `minutesToTime` / `addMinutesToTime` / `STEP_MINUTES = 5`.

**Wiring** : `<AppointmentTimePicker durationMinutes={duration} onChange={setFormTime} value={formTime} />` remplace l'ancien input + quick times block.

**i18n** : `appointment.time.endsAt` ajouté (FR+EN).

**Build** : 0 nouvelle erreur TS (19 baseline).

## S7.2 — Audit log + widget activité — ✅

**Migration 009** : table `audit_log` (id, action, entity, entity_id, user_id, user_display_name, payload JSON, metadata JSON, created_at) + 4 index (created_at DESC, entity+entity_id, user_id, action).

**Types** : `AuditAction` (10 valeurs : create/update/delete/restore/login/logout/export/import/backup/restore_backup) + `AuditEntity` (11 valeurs : patient/appointment/consultation/prescription/hospitalization/anesthesia/billing/user/reminder/backup/session) + `AuditLogEntry`.

**Whitelist** : `audit_log` ajouté à `ALLOWED_TABLES` (useSQLite) + `BrowserTableName`/`EMPTY_STATE` (browser-store).

**Repository** : `useAuditLogRepository()` avec `recent(limit)` (tri DESC + slice) + `forEntity(entity, entityId)` + `log({ action, entity, entityId?, payload?, metadata? })` qui sérialise payload/metadata en JSON.

**Service public** : `src/services/auditService.ts` — `useAudit()` lit `currentUser` via `useAuth()` et appelle `repo.log` avec `userId`/`userDisplayName` snapshot. Catch les erreurs en `console.warn` (n'écrase jamais l'action métier).

**Widget dashboard** : `ActivityWidget` (6 dernières actions, iconographie par action, label i18n `auditLog.actions.*` / `auditLog.entities.*`, temps relatif `useNowTick(60_000)`). Mounted Row 5 dashboard, à côté de `NextAppointmentsFeed` (lg:col-span-2).

**Hook helper** : `src/hooks/useNowTick.ts` — `setInterval` qui tick une Date pour les libellés "il y a X min" sans péter React 19 purity.

**i18n** : section `auditLog` (FR + EN) — `title`, `empty`, `actions.*` (10), `entities.*` (11), `by`, `unknownUser`. Sous-titre widget via `auditLog.subtitle` avec defaultValue FR.

**Build** : 0 nouvelle erreur TS (19 baseline).
