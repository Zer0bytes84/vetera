# Sprint 3 — Prescriptions & calculateur de doses

## Statut
✅ **S3 livré et commité** (8 sous-étapes)

## Périmètre
- Calculateur de doses vétérinaires tolérant (mg/kg, mg/tot, mL/kg, UI/kg, cp/kg, intervalles `10-20`, virgule décimale FR).
- Builder d'ordonnances complet (diagnostic, items, instructions générales, posologie par espèce).
- Impression A4 native (CSS print, sérigraphie Lora/Georgia, masquage du reste de l'app).
- Liste par consultation + liste par patient (intégrée à la fiche patient).

## Étapes livrées
| # | Étape | Livrable |
|---|-------|----------|
| 3.1 | Migration SQLite 006 + types + repository | `prescriptions`, `prescription_items`, `Prescription`, `PrescriptionItem`, `PrescriptionStatus`, `usePrescriptionsRepository`, `usePrescriptionItemsRepository`, i18n `prescriptions.*` FR+EN |
| 3.2 | `lib/dose-calculator.ts` | `parsePosology`, `computeDose`, `formatComputedDose`, `formatNumber` |
| 3.3 | `lib/medication-catalog.ts` | Wrapper 25 médocs `vetKnowledgeService`, `listMedications`, `searchMedications`, `getMedicationById`, `patientSpeciesToCatalogKey`, `SpeciesKey` |
| 3.4 | `MedicationPicker` + `DoseCalculatorCard` | Popover+Command (recherche fuzzy), carte live dose mg + volume mL |
| 3.5 | `PrescriptionBuilder` + `PrescriptionSheet` | Builder 2-col (lg), 6 status badge header, Sheet `sm:max-w-4xl` |
| 3.6 | `PrescriptionPreview` + `PrescriptionPrintLayout` | Dialog preview, A4 layout sérigraphie, CSS `@media print` dans `index.css` |
| 3.7 | `PrescriptionList` | Cards par consultation, print via Preview, fix `useMemo` (React Compiler rule) |
| 3.8 | Wiring Clinique + PatientDetailPage | Bouton "Ordonnance" header, Sheet rendu, "Ordonnances" tab sur fiche patient |

## Décisions clés
- **2 tables** (prescriptions + prescription_items) : la prescription est le document signé, les items snapshot les doses pour relecture.
- **Snapshot dose** : `computedDoseMg`/`computedVolumeMl` stockés sur l'item, recalculables à la volée.
- **Calculateur tolérant** : regex permissif (virgule décimale FR, tirets Unicode, espaces).
- **Sheet `sm:max-w-4xl`** (896px) : builder 2-colonnes respire.
- **A4 print** : `@page A4 18mm 16mm`, classe `.prescription-print` ciblée par media print, `visibility: hidden/visible` (préserve backgrounds).
- **Médicaments hors catalogue** : `medication_id` nullable, `medication_name` snapshot pour custom.
- **Pas de jsPDF** : `window.print()` natif, déjà utilisé ailleurs pour PDFs factures.
- **React Compiler `preserve-manual-memoization`** : retiré `useMemo` sur `prescriptions` (dep inferred faux).

## Validation
- `npx tsc --noEmit` : clean
- `npx eslint src/modules/prescriptions` : clean
- `npx eslint src/modules/patients/patient-detail-page.tsx src/components/Clinique.tsx` : 3 erreurs baseline préexistantes (hors périmètre S3)

## Fichiers principaux
- `src/services/sqlite/schema.ts` : MIGRATION_006
- `src/services/sqlite/database.ts` : bloc `if (lastVersion < "006")`
- `src/types/db.ts` : `Prescription`, `PrescriptionItem`, `PrescriptionStatus`, `PrescriptionDosageUnit`
- `src/hooks/useSQLite.ts` : ALLOWED_TABLES étendu
- `src/services/browser-store.ts` : `BrowserTableName` + `EMPTY_STATE` étendus
- `src/data/repositories/index.ts` : `usePrescriptionsRepository`, `usePrescriptionItemsRepository`
- `src/i18n/config.ts` : namespace `prescriptions.*` FR+EN
- `src/modules/prescriptions/` : 8 fichiers (index, 2 libs, 6 components)
- `src/components/Clinique.tsx` : wiring button + Sheet render
- `src/modules/patients/patient-detail-page.tsx` : tab "Ordonnances"

## Prochaine étape : S4
Hospitalisation (24h constantes T°/FC/FR/SpO2) + feuille d'anesthésie (induction/maintenance/réveil, drug log), design medical chart.
