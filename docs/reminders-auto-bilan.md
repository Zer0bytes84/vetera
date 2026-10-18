# Rappels automatiques patients : bilan

L’existant a été conservé : tâches manuelles, rappels de rendez-vous, table vaccinations et notifications. La page Rappels est étendue, pas remplacée. L’analyse REA et la spécification ont précédé le code ; voir reminders-auto-spec.md pour les références et les distinctions entre règles OpenVPMS et choix Baitari.

## Fonctionnement livré

- Un nouvel acte vaccinal et son rappel sont enregistrés dans une même transaction SQLite. Date proposée selon l’intervalle configuré, modifiable avant confirmation, origine auto ou manuel conservée.
- Le nouvel acte termine les rappels en cours du même patient et de la même famille vaccinale. Une modification du même acte ne constitue pas une nouvelle administration.
- Traitement manuel, report avec motif et annulation avec motif ; états terminaux non réouverts. Retard calculé sur le jour local.
- Types administrables : nom, intervalle en mois, activation. Initialisation vaccination 12 mois et antiparasitaire 3 mois. Cette V1 automatise la vaccination, pas l’enregistrement d’autres actes.
- Filtres type/origine, Terminés et historique, appels échus du jour, impression et CSV locaux. Rafraîchissement après sauvegarde, au focus et toutes les 60 secondes.
- Migration idempotente des échéances vaccinales existantes en origine manuel.

La table reminders existante est réservée aux rendez-vous et reste inchangée. Le nouveau stockage porte donc le nom patient_reminders, avec reminder_types et reminder_history. La suppression explicite d’un patient supprime ses rappels et leur historique par cascade.

## Fichiers

| Fichier | Changement |
|---|---|
| src/modules/patient-reminders/domain.ts | États, transitions, retard et mois calendaires |
| src/modules/patient-reminders/migration.ts | Tables, contraintes, index et import idempotent |
| src/modules/patient-reminders/store.ts | Transactions acte/rappel/historique et administration |
| src/modules/patient-reminders/service.ts | Adaptateur vers la persistance SQLite existante |
| src/modules/patient-reminders/use-patient-reminders.ts | Chargement et rafraîchissement |
| src/modules/patient-reminders/export.ts | CSV sécurisé et document imprimable |
| src/modules/patient-reminders/patient-reminders-panel.tsx | Onglets, filtres, actions, historique et types |
| src/modules/patient-reminders/patient-reminders.css | Style Baitari et contrôles tactiles |
| src/components/Tasks.tsx | Ajout du panneau et identification des compteurs existants |
| src/modules/patients/components/vaccination-dialog.tsx | Proposition configurable et sauvegarde native atomique |
| src/services/sqlite/migrations.ts | Enregistrement migration 026 |
| tests/sqlite/migration-runner.test.ts | Attentes du registre mises à jour |
| tests/modules/patient-reminders/domain.test.ts | Calendrier, retard, transitions |
| tests/modules/patient-reminders/migration.test.ts | Import répété, conservation et cascade |
| tests/modules/patient-reminders/store.test.ts | Cycle complet, rollback, séparation patients/familles et éditions |
| tests/modules/patient-reminders/export.test.ts | Échappement CSV et HTML |
| docs/reminders-auto-spec.md | Audit préalable et modèle extrait avec REA |
| docs/reminders-auto-bilan.md | Résultats et limites de vérification |

## Résultats finaux

- Typecheck : aucune erreur.
- ESLint global : aucune erreur ni avertissement.
- Vitest : **553 tests réussis, 70 fichiers réussis** ; dont 14 tests dédiés au nouveau module.
- Build frontend : réussi. Vite signale des bundles dépassant 500 kB, avertissement de taille distinct du lint.
- Test visuel AppShell : cinq captures, aucune erreur JavaScript. Report, annulation, modification d’intervalle, téléchargement CSV et ouverture de l’impression vérifiés depuis les boutons réels. Le défaut de soumission du formulaire des types découvert pendant ce test a été corrigé.

Les tests visuels utilisent Chrome et une SQLite en mémoire isolée avec un patient existant et des vaccinations de test. Aucune écriture de production. Ils ne constituent pas un test manuel dans le WebView Tauri ; l’impression vérifie l’ouverture du document, pas une imprimante physique. Les transactions natives utilisent le service SQLite existant et sont testées avec une vraie SQLite isolée.

## Captures

Dossier absolu : /Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/reminders-auto/

- rappels.png : page étendue et tâches existantes
- actions.png : formulaire de report
- termines.png : traitement et historique
- appels.png : liste d’appels
- types.png : administration des types
- verification.json : compte rendu du test visuel isolé
