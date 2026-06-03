# Sprint 5 — Command Palette ⌘K

**Statut** : ✅ Complètement livré et commité
**Commits** : `9ca8cd2` (palette upgrade) + `c5bcac0` (medical wiring)
**Build** : aucune nouvelle erreur (17 erreurs baseline préexistantes S1/S3)

---

## S5.1 — Upgrade CommandPalette (Raycast/Linear style) — `9ca8cd2`

**Features** :
- **Patient search** : fuzzy match par nom/espèce/race, 5 résultats max, tonalité emerald
- **Appointment search** : titre/type/notes + filtre "à venir ou 24h passées", 5 résultats max, tonalité sky
- **Récents persistants** : localStorage `vetera:palette-recents` (5 max, dédupliqués)
- **6 actions rapides** : nouveau patient/RDV/consultation/ordonnance/hospitalisation/anesthésie avec kbd hints
- **Footer clavier** : ↑↓ naviguer, ↵ sélectionner, esc fermer, brand "bAItari ⌘K"
- **Empty state** : "Aucun résultat trouvé" + hint d'aide
- **i18n** : 30 clés FR+EN dans `commandPalette.*`
- **Date format** : `date-fns` avec locale dynamique par langue (fr/en/ar/es/pt/de)

**Catégories** :
- Pilotage (dashboard/agenda/tâches)
- Parcours patient (patients/clinique/notes)
- Exploitation (stock/finances/équipe)
- Configuration (paramètres)

**Wiring** : `CommandPalette` reçoit `onNavigateToPatient` depuis `AppShell` (router app).

## S5.2 — QuickPatientPicker + wiring médical — `c5bcac0`

**Nouveau composant** `QuickPatientPicker.tsx` :
- Dialog search-as-you-type (20 résultats max, normalisé NFD pour accents)
- Avatars emerald + nom espèce race
- Footer kbd hints
- i18n via `quickPatientPicker.*`

**Wiring Clinique** :
- 3 event listeners : `vetera:open-prescription`, `vetera:open-hospitalization`, `vetera:open-anesthesia`
- Auto-bypass : si consultation active OU patient sélectionné, ouvre directement le sheet
- Sinon, surface le QuickPatientPicker
- Sheets conditionnels sur `effectiveSheetPatient` (active OU palette)
- `palettePatient` reset à la fermeture du sheet

## Patterns techniques
- **localStorage recents** : dédupliqué par id, max 5, ordered par timestamp desc
- **Fuzzy search** : normalisation NFD + suppression des diacritiques (`é` → `e`)
- **Date locale** : `date-fns` avec import dynamique par langue i18n
- **Event bus pattern** : `CustomEvent` dispatched après navigation + 120ms setTimeout (mêmes patterns que `vetera:new-patient`/`vetera:new-appointment`)

## Prochaines étapes (S6-S8)
- **S6** : scheduling amélioré (récurrents, conflits salle, rappels)
- **S7** : backupService durci + audit log
- **S8** : packaging Tauri macOS notarisé
