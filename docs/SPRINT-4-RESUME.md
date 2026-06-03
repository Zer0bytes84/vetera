# Sprint 4 — Hospitalisation & Anesthésie

**Statut** : ✅ Complètement livré et commité
**Commits** : `fb53827` (hospitalisation) + `b6d1986` (anesthésie)
**Build** : aucune nouvelle erreur (17 erreurs baseline préexistantes S1/S3)

---

## S4.1 — Migration 007 + types + repos + i18n
- 5 nouvelles tables SQLite : `hospitalizations`, `hospitalization_vitals`, `anesthesia_sheets`, `anesthesia_drug_log`, `anesthesia_monitoring`
- 5 hooks repository S4 (auto-génération `id`/`createdAt`/`updatedAt` via `generateId()`)
- Whitelist `useSQLite` + `EMPTY_STATE` + `BrowserTableName` étendus
- Namespaces i18n FR+EN : `modules.hospitalizations.*`, `modules.anesthesia.*`
- Types S4 dans `db.ts` : `Hospitalization`, `HospitalizationVital`, `AnesthesiaSheet`, `AnesthesiaDrugLogEntry`, `AnesthesiaMonitoringEntry` + 4 status enums + 4 phase/route enums

## S4.2 — Module hospitalisation (commité `fb53827`)
**9 composants** : status-badge, list, dialog, detail, vitals-entry-dialog, vitals-chart (SVG inline), print-layout (A4), sheet, format.

- Liste cards avec gradient sky header, 5 filters pills, durée tickée via `useNowTick` (60s)
- Detail séjour : header gradient, vital cells tonalisées (T°/FC/FR/SpO2/PAS/PAD/douleur), chart 4 lignes SVG, selector statut
- Dialog création `max-w-2xl` : `flushSync` pour reset (`handleCancel`/`handleSubmit`)
- Vitals entry : constantes T°/FC/FR/SpO2/PAS/PAD/poids/glycémie/TRC/muqueuses/mental
- A4 print layout : `@page A4`, `visibility:hidden/visible`, patient + constantes table
- Drawer latéral `sm:max-w-3xl` pour Clinique
- i18n FR+EN : `vitals.subtitle/empty/emptyDescription/save`, `fields.changeStatus`, top-level `print`
- `formatDuration`/`formatTimeAgo` (FR) + `painScoreTone` + `vitalIsCritical` (heuristique mammalienne)

**Wiring** :
- Clinique : bouton "Hospitaliser" (Hospital) à côté d'"Ordonnance"
- Patient detail : tab "Hospitalisations" (FR+EN) + `HospitalizationList`

**Field name fixes** (alignement schéma réel) :
- `weight` (n'existe pas) supprimé
- `birthDate` → `dateOfBirth`
- `respiratoryRateBpm`, `spo2Percent`, `bloodPressureSys`/`Dia`, `weightKg`, `bloodGlucoseMmolL`, `capillaryRefillTimeS`, `mucousMembranes`
- Unions `MucousMembrane`/`MentalState` réduites aux 4 valeurs existantes
- `patientId` retiré de `HospitalizationVital` (n'existe pas dans le schéma)

## S4.3 — Module anesthésie (commité `b6d1986`)
**8 composants** : status-badge, list, sheet-dialog, drug-log-entry-dialog, monitoring-entry-dialog, detail, sheet, format.

- Liste cards gradient violet, 5 filters (active/planned/completed/cancelled/all), cards ASA + emergency + durée
- Dialog création : procedure/ASA 1-5/urgence/poids/premed/induction/agent/maintenance/monitoring/complications
- Drug log entry : drug/dose/route/phase/notes
- Monitoring entry : FC/FR/SpO2/ETCO2/PAM/T°/Iso/O2/phase/notes
- Detail : 4 phases (premed/induction/maintenance/recovery) + drug log timeline + monitoring table 10 colonnes + bouton "Imprimer"
- Drawer latéral `sm:max-w-3xl` pour Clinique
- `formatDuration` importé depuis `@/modules/hospitalizations/lib/format` (helper partagé, pas duplication)
- `computeAnesthesiaDurationMinutes` pour la durée tickée

## S4.4 — Wiring Clinique + fiche patient
- Clinique : bouton "Anesthésie" (Syringe) à côté d'"Ordonnance"/"Hospitaliser"
- Patient detail : tab "Anesthésies" (FR+EN) + `AnesthesiaList`
- Props `onOpenHospitalization`/`onOpenAnesthesia` ajoutés à `ConsultationSessionDialog`

## Patterns techniques
- **`flushSync` pour setState dans useEffect init** : `flushSync(() => { setX(value); })` puis chainer les autres setState (React 19 `set-state-in-effect` rule)
- **`useNowTick(intervalMs=60_000)`** hook interne pour éviter `Date.now()` en render (React 19 `purity` rule)
- **`repo.add()` auto-génère id/createdAt/updatedAt** : on passe `Omit<T, "id" | "createdAt" | "updatedAt">`
- **A4 print réutilisable** : `@page A4`, `body * visibility:hidden` + `.xxx-print-page * visibility:visible` + `position:absolute`
- **Schéma réel > types fictifs** : alignment strict sur DDL migration 007

## Prochaines étapes (S5-S8)
- **S5** : command palette ⌘K (Raycast/Linear style)
- **S6** : scheduling amélioré (récurrents, conflits salle, rappels)
- **S7** : backupService durci + audit log
- **S8** : packaging Tauri macOS notarisé
