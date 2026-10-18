# Fiche de traitement : bilan audité le 13 octobre 2026

## Résultat actuel

Les soins sont intégrés à **Clinique → Soins**, avec affichage par patient ou par heure, retards prioritaires, recherche, filtres, validation en un tap, détail et historique. Le dossier patient ouvre les soins filtrés sur le patient ; le formulaire est pré-rempli. Le lien historique `#/soins` reste compatible et aucune entrée Soins du jour ne reste dans la sidebar.

Le même soin apparaît dans la piste ambre de l’Agenda à sa date et à son heure. Le clic ouvre son détail dans Clinique. La création et les changements de statut rafraîchissent les vues via l’événement partagé, puis à 60 secondes et au retour de focus. Le Plan SOAP validé et sauvegardé propose des tâches ajustables, sans inventer d’horaire ni de dose et sans sauvegarde automatique.

La facturation ajoutée sur demande après le brief initial crée une seule facture brouillon pour chaque soin terminé. Le tarif provient du produit lié ou reste à compléter, et peut être modifié avant émission. Aucune écriture de stock, émission ni paiement automatique. Tout passe par SQLite local ; aucune nouvelle bibliothèque ni service cloud.

## Corrections finales de l’audit

1. La reprise de facturation pouvait masquer toute la liste si une facture échouait. Deux tests ont reproduit cette régression avant correction. La liste reste maintenant visible, les autres factures continuent à être reprises et une notification indique l’échec. Les reprises restent idempotentes.
2. Les règles Premium réduisaient les cibles de validation à 36 px malgré leur classe tactile. Une règle limitée aux actions Soins rétablit 44 px, mesurés dans le navigateur. Aucun changement des autres boutons.

## Fichiers et responsabilités

| Fichier | Résultat |
| --- | --- |
| `docs/treatment-sheet-spec.md` | Analyse REA préalable, sources historiques, modèle, états, retard, hooks et évolutions approuvées. |
| `src/modules/care-tasks/domain.ts` | Modèle, transitions autorisées, retard dérivé, extraction verbatim du Plan, extension de suggestion future. |
| `src/modules/care-tasks/migration.ts` | Tables additives `care_tasks` et `care_task_history`, contraintes, index, cascade patient. |
| `src/services/sqlite/migrations.ts` | Migration 024 enregistrée dans le mécanisme existant. |
| `src/modules/care-tasks/store.ts` | Création et transitions atomiques avec auteur, historique, garde de concurrence et normalisation des horaires. |
| `src/modules/care-tasks/hooks.ts` | Hook stock isolé, abonnements et événement navigateur post-commit avec identifiant du soin. Échecs isolés. |
| `src/modules/care-tasks/service.ts` | SQLite existant, consommation par la facturation, reprise idempotente et conservation de l’affichage en cas d’échec. |
| `src/modules/care-tasks/use-care-tasks.ts` | Bornes locales du jour/de la période, rafraîchissement à 60 secondes, au focus et après écriture, protection contre les réponses obsolètes. |
| `src/modules/care-tasks/care-page.tsx` | Modes patient/heure, tri des retards, filtres, recherche, date affichée, détail, historique et actions. |
| `src/modules/care-tasks/care-page.css` | SF Pro et gris limités aux soins ; actions tactiles de 44 px maintenues en Premium. |
| `src/modules/care-tasks/care-task-form.tsx` | Formulaire réutilisé : patient recherché/pré-rempli, calendrier, type, horaire, produit et note ; aucune confirmation incomplète. |
| `src/modules/care-tasks/feedback.ts` | Messages métiers français conservés ; erreurs techniques remplacées par une consigne française, sans nom interne. |
| `src/modules/care-tasks/care-icons.tsx` et `public/licenses/lucide-care-icons.txt` | 4 tracés Lucide intégrés localement à 1 px, licences conservées ; aucune dépendance ajoutée. |
| `src/modules/care-tasks/care-time-picker.tsx` | Créneaux du module rendez-vous, ajustements à la minute, minuit et soirée. |
| `src/modules/care-tasks/plan-care-tasks.tsx` | Propositions à ajuster et à confirmer individuellement, aucune création automatique. |
| `src/modules/consultations/components/soap-panel.tsx` | Bouton disponible uniquement pour un Plan courant validé, sauvegardé et non modifié. |
| `src/modules/clinique/pages/clinical-workspace.tsx` | Onglet Soins, badge des retards actualisé même hors de la liste, filtre patient et réception des demandes de focus. |
| `src/modules/patients/patient-detail-page.tsx` | Réutilisation de la vue et pont vers les soins filtrés du patient. |
| `src/modules/care-tasks/agenda-care-schedule.tsx` | Piste Agenda dédiée lisant la même table, lien vers le détail du soin. |
| `src/modules/agenda/components/agenda-view.tsx` | Montage de cette piste dans l’Agenda existant. |
| `src/contexts/focus-provider.tsx` | Demandes de navigation `care_patient` et `care_task` dans le routeur existant. |
| `src/app/config/navigation.ts`, `view-registry.tsx` et `src/modules/shell/app-shell.tsx` | Navigation Clinique, compatibilité du lien Soins, accès rapide existant. |
| `src/services/billingService.ts` | Brouillon idempotent `care-invoice:<taskId>`, prix réel/saisie ultérieure, aucune sortie de stock à la fin du soin. |
| `src/modules/finances/lib/draft-prices.ts`, hook et vue Finances | Édition des prix d’un brouillon, conversion exacte des DA et verrouillage après émission. |
| `tests/modules/care-tasks/domain.test.ts` | 23 cas : toutes les paires d’états, auteur/motif, seuil de retard, Plan verbatim. |
| `tests/modules/care-tasks/store.test.ts` | 6 cas SQLite : création/validation, historique/hook, annulation, rollback, cascade et lecture demain/Agenda sans duplication. |
| `tests/modules/care-tasks/feedback.test.ts` | 3 cas : consignes utiles conservées, erreur SQLite masquée, rejets inconnus en français. |
| `tests/modules/care-tasks/clinical-navigation.test.tsx` | 3 tests de navigation : compteur exact, aucun badge à zéro, filtre patient et libellé accessible. |
| `tests/modules/care-tasks/service.test.ts` | 3 régressions de reprise de facturation : succès, panne/reprise suivante, isolation entre soins. |
| `tests/services/billing-service.test.ts`, `tests/services/draft-prices.test.ts` | Consommateur réel après commit, tarif, idempotence, absence de stock, reprise et édition avant émission. |
| `tests/sqlite/migration-runner.test.ts` | Migrations et idempotence du schéma. |

## Audit de chaque exigence

| Exigence | Preuve actuelle |
| --- | --- |
| Analyse REA avant implémentation | Document initial du 12 octobre, clone demandé hors projet, rapports REA et révisions exactes vérifiés lors de cet audit. Limites historiques explicitement conservées. |
| Patient, acte, heure, exécutant, produit, notes | Schéma, formulaire unique, détail et lectures SQLite des tests. |
| États autorisés/interdits | 16 paires d’états testées, motif et auteur obligatoires, états terminaux non modifiables. |
| Retard sans tolérance, non persisté | Comparaison stricte `< maintenant`, tests a_faire/en_cours/fait/annule et heure exactement égale. Le retard reste visible après commencement si l’heure est dépassée. |
| Auteur/date de chaque transition | Création et transition avec historique dans la même transaction ; scénario navigateur relisant trois entrées signées après commencer puis valider. |
| Retards prioritaires, filtres, recherche, deux modes | Scénario navigateur actuel, captures patient/heure/retard et inspection du tri. |
| Validation en un tap, tactile | Contrôle post-commit, état fait en base, aucune double émission ; hauteur mesurée 44 px en Premium. |
| Annulation motivée | Refus sans motif dans le domaine et le store, bouton inactif sans motif et motif rendu dans le détail. |
| Rafraîchissement local partagé | Intervalle `60_000`, focus/visibilité et événement commun après création/transitions ; création visible dans la vue et dans l’Agenda au test. |
| Création manuelle fiable | Recherche patient, date demain et créneau 12:30 ajusté à la minute, confirmation inactive avant complétude, date/heure relues en SQLite sans duplication. |
| Plan SOAP validé | Garde `isSoapReviewed(payload) && !dirty` ; composant actuel testé : aucun soin avant confirmation, Plan intact, aucune heure imposée, demain 14:00 enregistré après confirmation. |
| Stock et événement | Hook vide par défaut, après commit, payload taskId/patientId/act/scheduledAt/completedAt/executorId/productId ; erreurs d’intégration isolées. |
| Suggestion IA et récurrence réservées | Interface `CareSuggestionProvider` et colonne `recurrence` nullable ; aucune inférence automatique ni récurrence UI. |
| Clinique, dossier patient et Agenda | Onglet sans entrée sidebar dupliquée, dossier filtré et pré-rempli, même soin demain visible dans Agenda et ouvert par identifiant. |
| Facturation demandée ultérieurement | Consommateur réel testé, brouillon idempotent, tarif éditable avant émission, reprise sur lecture et soins conservés si échec. |
| Données préservées | Migration additive ; base de production en lecture seulement pour le patient/Plan de référence. Tous les soins de vérification sont dans SQLite isolé. |
| Design, français et périmètre | Captures clair/sombre, textes français, règles locales et actions 44 px. Aucun tiret cadratin dans les nouveaux textes. |

## Résultats du 13 octobre 2026

- `npm run typecheck` : **0 erreur**.
- `npm run lint -- --max-warnings 0` : **0 erreur, 0 avertissement**.
- `npm test` : **581 tests réussis dans 77 fichiers**.
- Vérification ciblée soins/facturation/prix : **46 tests réussis dans 5 fichiers**, dont les 3 nouvelles régressions.
- `npm run build` : **réussi**. Les avertissements de taille de certains bundles et de regroupement existants restent non bloquants.
- Scénarios navigateur actuels utilisant les vrais composants React et le store contre SQLite isolé : création, retards, commencement/validation/historique, Agenda, navigation dossier, pré-remplissage et propositions du Plan réussis ; **0 erreur JavaScript**.

Captures et rapports actualisés : `/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/care-rea-renewal/`. Les captures précédentes restent dans `care-objective-audit/`. Vues patient, heure, retard, détail, sombre, création demain, Agenda et formulaire patient. `checks.json` décrit le parcours ; `plan/checks.json` décrit les propositions et leur confirmation.

## Limites et essai manuel

OpenVPMS n’a pas été lancé. Ses modules publics historiques présentent des tâches de workflow, pas une fiche de soins horaire équivalente. L’analyse ne leur attribue ni matrice de permissions exhaustive, ni règle de retard, ni décrément de stock non démontrés. Les règles des soins Baitari sont celles du brief utilisateur.

La vérification visuelle automatisée porte sur les composants actuels dans un navigateur avec SQLite de test ; elle ne prétend pas être une capture native de Tauri. Aucun rebuild release macOS n’a été lancé à cette itération.

Pour essayer dans l’application : ouvrir Clinique → Soins, planifier un soin pour demain, vérifier l’Agenda de demain, ouvrir le soin et le valider. Dans Finances, ouvrir son brouillon et modifier le tarif avant émission. Depuis un dossier patient, ouvrir ses soins filtrés. Depuis un Plan SOAP validé et sauvegardé, générer les tâches, ajuster une proposition et confirmer son patient, sa date et son heure.


## Reprise du brief : compléments vérifiés

L’analyse REA complémentaire est écrite dans la spécification avant les modifications de cette reprise. Elle couvre désormais aussi les prescriptions, les médicaments et les effets de stock des éléments de charge ; l’archive source a été inspectée par MCP REA avec empreinte et limitations conservées dans `care-rea-renewal/evidence.json`.

Le badge de navigation manquant est ajouté sur l’onglet Soins, conformément au regroupement Clinique demandé après le brief initial. Le test navigateur avec horloge contrôlée prouve un rafraîchissement après 60 secondes depuis Consultations, puis une baisse 2 → 1 → badge masqué après validation, sans rechargement. Le filtre patient et l’absence de badge à l’heure exacte sont testés séparément. Rapport : `counter-checks.json`.

Les icônes propres au module étaient héritées du wrapper général à 1,5 px. Les tracés [Lucide officiels](https://github.com/lucide-icons/lucide/tree/main/icons) CalendarDays, Clock, ChevronDown et Clipboard sont maintenant inclus en SVG locaux à 1 px, sans installer de bibliothèque. Les trois icônes du formulaire ont été mesurées à 1 px dans le navigateur ; l’Agenda réutilise le même composant Clipboard. Les autres icônes et composants de l’application restent inchangés.

La base réelle a été ouverte uniquement en lecture : schéma care_tasks présent, deux soins au statut fait, cinq entrées d’historique. Les colonnes ajoutées par l’hospitalisation (`stay_id`, `care_plan_id`, `occurrence_key`) ont été conservées. La connexion native SQLite est limitée à une connexion et les opérations frontend restent sérialisées. Les créations, transitions et contrôles de dates de cette reprise ont tous utilisé SQLite isolé.

Résultats courants : typecheck 0, lint 0/0, 581 tests dans 77 fichiers, build frontend réussi. Les 3 nouveaux tests de navigation s’ajoutent aux tests de soins/facturation existants. Le parcours Plan a été revérifié sur les composants actuels : verbatim, horaire non imposé et confirmation avant écriture.

L’échec SQL injecté dans le formulaire réel affichait initialement le nom de table et le code technique. La présentation des erreurs a été corrigée dans les deux interfaces de soins : consignes métiers françaises conservées, détails techniques masqués. Le même scénario prouve maintenant le message français et l’absence de création partielle. Rapport : `care-rea-renewal/error-checks.json`. Il s’agit d’une panne volontaire du scénario isolé, pas d’une panne de la base de production.
