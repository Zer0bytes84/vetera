# Bandeau « Rappel vaccinal » : vaccins en retard

Date : 18 octobre 2026. Rien n'a été commité ni poussé.

## Cause

Le bandeau du dossier patient n'affichait qu'**un seul** vaccin, choisi par `getNextDueVaccination` (`src/modules/patients/lib/vaccination-status.ts`). Cette fonction prend d'abord le prochain rappel **à venir**, et ne regarde les rappels dépassés que s'il n'y en a aucun à venir. Un typhus en retard de 15 jours était donc masqué par une rage due dans 20 jours.

## Correction

Le bandeau utilise maintenant le même classement que le carnet de santé, via une fonction partagée : la dernière injection de chaque vaccin, avec l'état de son rappel.

- **Tous les rappels en retard** apparaissent, les plus anciens d'abord, avec la mention du retard : « Typhus, coryza (RCP) · **en retard de 15 jours** (prévu le 3 oct. 2026) ».
- Puis les rappels **à prévoir dans les 30 jours**, comme avant : « Rage · 7 nov. 2026 ».
- Une injection **déjà renouvelée** n'est jamais signalée en retard : seule la plus récente de chaque vaccin porte le rappel.
- S'il y a au moins un retard, le titre devient « Rappel vaccinal en retard ». Ce libellé existait déjà dans le code ; sinon le titre reste « Rappel vaccinal à prévoir ».
- Rien d'autre ne change : même emplacement, mêmes couleurs, même clic vers l'onglet Vaccinations. Sans retard, le texte est identique à l'ancien (capture `apres/02`).

`getNextDueVaccination` et `getVaccinationStatus` ne sont pas modifiées : elles servent encore à l'aperçu patient et à la liste des vaccinations.

## Fichiers

- `src/modules/patients/health-card/health-card-data.ts` : la sélection des vaccins du carnet devient la fonction partagée `currentVaccineReminders`, avec `daysOverdue`. Le carnet ne change pas ;
- `src/modules/patients/lib/vaccination-banner.ts` (nouveau) : `vaccinationBannerEntries` et `lateLabel` ;
- `src/modules/patients/patient-detail-page.tsx` : calcul et texte du bandeau, et deux imports devenus inutiles ;
- `tests/modules/patients/vaccination-banner.test.ts` (nouveau) : 5 tests, dont le cas constaté.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 127 fichiers, 982 tests, tous verts ;
- navigateur (port 5174), sur Milo, avec des données de test : typhus dû il y a 15 jours, rage due dans 20 jours, leucose dans 275 jours, et une ancienne injection de rage déjà renouvelée. Avant : seule la rage s'affichait. Après : typhus en retard, puis rage. L'ancienne rage et la leucose ne sont pas signalées. Sans le typhus, le bandeau est identique à avant.

Données de test : 4 vaccinations préfixées `test_banniere_`, **retirées** à la fin. Milo n'a plus aucune vaccination, comme au départ.

Non vérifié : la lecture en SQLite réelle (`npm run tauri:dev`). Le bandeau lit le même dépôt de vaccinations qu'avant.

## Captures

- `avant/01-bandeau-rage-seule-typhus-absent.jpg` : seule la rage, le typhus en retard n'apparaît pas ;
- `apres/01-typhus-en-retard-et-rage-a-prevoir.jpg` : « Rappel vaccinal en retard », typhus en retard de 15 jours, puis rage ;
- `apres/02-sans-retard-inchange.jpg` : sans retard, bandeau identique à l'ancien.
