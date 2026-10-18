# Rappels médicaux automatiques : bilan d’implémentation

Validation finale : 17 octobre 2026. Version de l’application : 3.3.25.

## Résultat

Le module médical complète les rappels manuels. Son stockage et son calcul sont locaux dans SQLite. Les tâches manuelles et les notifications de rendez-vous gardent leurs tables, leurs statuts et leurs opérations existantes.

- Cinq types prédéfinis : vaccin, vermifuge, contrôle annuel, soin dentaire, autre.
- Types et intervalles configurables dans Paramètres > Rappels médicaux. Les types historiques des rappels manuels restent administrables dans l’onglet Types de la page Rappels.
- Proposition après l’enregistrement d’un vaccin, après la clôture d’une consultation préventive et après la validation d’un soin préventif. Chaque proposition peut être ajustée ou refusée. Aucune création silencieuse.
- Dialogue partagé avec recherche du patient, type, intervalle, échéance et note. Validation active seulement quand les champs requis sont valides.
- Filtres Tous, Manuels, Médicaux ; vues En cours, À venir, Terminés et Rappels du jour. Les compteurs des onglets suivent le filtre.
- Patient, type, échéance, propriétaire et téléphone visibles. Neutre pour le futur, bleu pour aujourd’hui et alerte pour le retard.
- Traitement, report, annulation motivée et historique. Le traitement propose le rappel suivant à partir de la date de traitement, avec confirmation séparée.
- Liste d’appels du jour, liens téléphoniques, CSV et impression locale.
- Widget avec compteurs en retard et dus aujourd’hui, trois prochaines échéances et navigation vers le filtre médical. Disponible dans les deux vues du dashboard.
- Titres Space Grotesk, corps Geist, icônes Lucide, contrôles médicaux de 44 px. Vues claires et sombres vérifiées.

## Audit et REA préalables

L’audit et la spécification ont été écrits avant les modifications fonctionnelles :

- [Audit du module existant](reminders-audit.md)
- [Spécification et analyse REA OpenVPMS](reminders-spec.md)

Le dépôt demandé a été cloné dans `/tmp/openvpms-reminders-rea`. Le miroir monorepo utilisé pour lire les règles métier se trouve dans `/tmp/openvpms-reminders-source-20261016`. La spécification identifie les révisions et les fichiers examinés ainsi que la distinction entre observations OpenVPMS et adaptation Baitari.

## Persistance et invariants

La migration 036 est additive. Elle crée `medical_reminders` et `medical_reminder_history`, complète `reminder_types`, reprend les rappels patients existants et copie leur historique. Les tables antérieures restent conservées. Les paramètres déjà configurés sont repris ; les noms et réglages des types manuels historiques restent disponibles.

La machine à états est `en_cours -> termine` ou `en_cours -> annule`. Le retard est calculé à la lecture, selon le jour local. Les états terminaux ne se rouvrent pas. Les opérations et leur historique sont transactionnels ; un échec de confirmation ne supprime pas l’acte déjà enregistré.

`acte_source_id` empêche une double confirmation de créer deux rappels pour le même acte. Le client est résolu depuis le patient à la confirmation. L’intervalle confirmé appartient au rappel ; modifier un type ne réécrit pas les échéances existantes.

La vaccination conserve le carnet et les dates civiles. Une nouvelle vaccination clôture seulement les rappels ouverts de la même famille vaccinale et du même patient ; une simple édition n’est pas une nouvelle administration.

## Raccordement des actes

`onMedicalActRecorded(act, port?)` retourne une proposition et ne persiste rien. Le port local est utilisé par défaut ; l’injection permet de tester le contrat sans démarrer l’application.

La vaccination transmet directement le type vaccin. Pour les consultations et les soins, la correspondance repose sur des libellés préventifs explicites en français : vaccin, vermifuge, contrôle ou bilan annuel, visite annuelle, détartrage et soins dentaires. Un contrôle ordinaire ne déclenche aucune proposition. Les autres types sont disponibles dans la création médicale ou par transmission explicite au hook.

La file de propositions est montée dans le shell pour survivre au rafraîchissement de la liste et à la disparition d’un rappel traité. Les mutations diffusent l’événement médical existant afin de recharger les listes et le widget.

## Résumé fichier par fichier

| Fichier | Changement |
|---|---|
| `src/modules/patient-reminders/medical-reminders-migration.ts` | Migration additive, cinq types, reprise des réglages et historiques, contraintes et index. |
| `src/services/sqlite/migrations.ts` | Inscription de la migration 036. |
| `src/modules/patient-reminders/domain.ts` | États, dates civiles, intervalles calendaires et reconnaissance déterministe des actes préventifs. |
| `src/modules/patient-reminders/store.ts` | Lecture du nouveau stockage, propositions sans écriture, confirmation idempotente, traitement, report, annulation, historique, types et carnet vaccinal. |
| `src/modules/patient-reminders/on-medical-act-recorded.ts` | Hook isolé, documenté et injectable. |
| `src/modules/patient-reminders/medical-act-events.ts` | Événements locaux d’acte enregistré et de proposition suivante. |
| `src/modules/patient-reminders/medical-act-reminder-prompt.tsx` | File de propositions et consommation des événements de soins validés. |
| `src/modules/patient-reminders/medical-reminder-dialog.tsx` | Dialogue partagé de création et de confirmation avec champs validés et recherche du patient. |
| `src/modules/patient-reminders/patient-reminders-panel.tsx` | Affichage des coordonnées, états, actions, historique, liste d’appels et gestion des types. Réutilisation du CSV et du document imprimable existants. |
| `src/modules/patient-reminders/patient-reminders.css` | Style du module, lisibilité claire/sombre, densité responsive, traits fins et cibles tactiles. |
| `src/components/Tasks.tsx` | Filtre de source, synthèse prioritaire, création médicale et adaptation du panneau médical. Conservation des opérations manuelles et de leur administration des types. |
| `src/components/Parametres.tsx` | Entrée Rappels médicaux et configuration des types. |
| `src/modules/patients/components/vaccination-dialog.tsx` | Enregistrement de l’acte avant proposition, confirmation séparée, date locale et conservation du carnet lors des éditions. |
| `src/modules/clinique/hooks/use-clinique-page-model.tsx` | Annonce d’un acte préventif après la clôture réussie de la consultation. |
| `src/modules/shell/app-shell.tsx` | Montage de la file de propositions, sans modification du header ou de la navigation existante. |
| `src/modules/patient-reminders/medical-reminders-widget.tsx` | Compteurs, trois prochaines échéances, chargement, erreur et navigation. |
| `src/modules/dashboard/components/premium-analytics.tsx` | Emplacement du widget partagé entre les deux vues. |
| `src/modules/dashboard/pages/dashboard-page.tsx` | Raccordement du widget et de sa navigation vers les rappels médicaux. |
| `tests/modules/patient-reminders/domain.test.ts` | Fins de mois, bissextiles, dates invalides, minuit local, états et correspondance des actes. |
| `tests/modules/patient-reminders/store.test.ts` | Acte vers proposition, absence de création silencieuse, confirmation, doublons, isolement patients/familles, erreurs transactionnelles, renouvellement et non-régression des tâches manuelles. |
| `tests/modules/patient-reminders/medical-migration.test.ts` | Reprise des données et réglages, conservation des rappels manuels, second démarrage et reprise après interruption. |
| `tests/modules/patient-reminders/tasks-view.test.tsx` | Affichage cohérent des échéances, formulaire manuel, signalement des erreurs et conservation de l’administration des types historiques. |
| `tests/sqlite/migration-runner.test.ts` | Attentes du registre et du numéro de schéma mises à jour pour 036. |
| `tests/modules/care-tasks/completion-rollback.test.ts` | Attente de la migration 036 ; assertions de conservation des soins et historiques maintenues. |
| `tests/modules/stock/schema-upgrade.test.ts` | Attente de 036 ; assertions sur les quantités et historiques de stock maintenues. |
| `tests/services/local-data-reset.test.ts` | Réinitialisation vérifiée avec les 36 migrations. |
| `docs/reminders-audit.md` | Audit préalable des trois mécanismes de rappels existants. |
| `docs/reminders-spec.md` | REA de la référence et contrat fonctionnel local. |
| `docs/reminders-implementation.md` | Bilan, inventaire des changements et reçus de validation. |

## Reçus de validation

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur, code de sortie 0. |
| `npm run lint -- --max-warnings=0` | 0 erreur, 0 avertissement, code de sortie 0. |
| `npm test` | 783 tests réussis, 100 fichiers réussis, aucun échec. |
| `npm run test:licenses` | 13 tests réussis, aucun échec ni test ignoré. |
| Total des tests automatisés | **796 tests réussis**. |
| Parcours Playwright | **36 contrôles réussis**, dont le refus et la confirmation d’une proposition après vaccination, le renouvellement après traitement et le déclenchement après un soin vermifuge réellement enregistré dans la base de test. |
| `npm run build` | Build frontend réussi dans `dist/`. |
| `git diff --check` | Propre. |

Les vérifications de non-régression incluent la conservation exacte des lignes de tâches après les opérations médicales, le formulaire rapide, l’affichage des rappels manuels à traiter, les réglages historiques et la conservation lors des migrations. La suite existante des soins, stocks, factures et réinitialisations reste verte.

À 1024 px : document de 1024 px, panneau de 760 px et contenu de 760 px. Aucun débordement horizontal. Les actions médicales, les champs de confirmation, les boutons et la fermeture du dialogue mesurent au moins 44 px.

Vite conserve son avertissement de taille pour certains bundles supérieurs à 500 ko. Il ne s’agit pas d’une erreur de build ou de lint. Le périmètre n’inclut pas la restructuration de ces dépendances.

## Captures et preuve des parcours

Les captures utilisent les composants réels avec des données fictives dans une SQLite en mémoire. L’authentification et l’accès natif à SQLite sont remplacés dans le banc de test Chrome. Aucune base clinique réelle n’a été utilisée. Le test d’impression contrôle le document généré et l’appel d’impression, sans imprimante physique. Ce chantier n’inclut pas de pilotage manuel du WebView Tauri ni de génération d’un installateur macOS.

- [Vue Rappels avec filtre](../output/playwright/reminders-medical-filter.png)
- [Rappel médical en retard](../output/playwright/reminder-overdue.png)
- [Proposition après enregistrement vaccinal](../output/playwright/reminder-proposal-from-vaccination.png)
- [Vue d’ensemble avec les rappels manuels](../output/playwright/reminders-with-filter.png)
- [Rappels du jour](../output/playwright/reminders-calls-today.png)
- [Thème sombre](../output/playwright/reminders-dark.png)
- [Thème sombre à 1024 px](../output/playwright/reminders-dark-1024.png)
- [Widget du dashboard](../output/playwright/medical-reminders-dashboard.png)
- [Types dans les paramètres](../output/playwright/reminders-types-settings.png)
- [CSV généré](../output/playwright/rappels-du-jour.csv)
- [Résultats détaillés des 36 contrôles](../output/playwright/medical-reminders-verification.json)

## Outillage et livraison

Les contrôles de design ont conduit à réutiliser la police du projet et les tokens de taille et de rayon. Aucun ignore de détecteur n’a été ajouté. Le contexte Impeccable signale que son fichier `.impeccable/design.json` doit être rafraîchi séparément par `/impeccable document`. Une version Impeccable 4.6.0 est disponible via `npx impeccable update` ; aucune mise à jour d’outillage n’a été effectuée dans ce périmètre.

Aucun push, tag ou release effectué.

## Correctifs du formulaire du 17 octobre 2026

- `src/modules/patient-reminders/domain.ts` : dédoublonnage des choix par libellé et équivalence historique, priorité aux types actuels pour la création, conservation du type déjà sélectionné pour la modification. Aucun type stocké n’est supprimé.
- `src/components/Tasks.tsx` : application du dédoublonnage aux formulaires de création et de modification ; cloche intégrée au libellé « Nouveau rappel ».
- `src/design-system/premium-workspace.css` : suppression de la colonne isolée de la cloche et alignement du libellé, sans changer les autres contrôles.
- `tests/modules/patient-reminders/domain.test.ts` : quatre tests de régression supplémentaires pour les doublons, les identifiants historiques, les types désactivés déjà sélectionnés et les types personnalisés.

Nouvelle validation : typecheck sans erreur, lint sans erreur ni avertissement, **787 tests applicatifs + 13 tests activation = 800 tests réussis**, build frontend réussi. L’avertissement Vite sur la taille de certains bundles reste présent.

**13 contrôles d’interface supplémentaires réussis** sur une SQLite isolée : choix uniques, création avec le type actuel, modification sans migration de l’identifiant historique, conservation des sept types stockés et alignement sans débordement à 768, 1024 et 1440 px dans les thèmes clair et sombre.

[Avant](../output/playwright/reminder-form-before.png) · [Après](../output/playwright/reminder-form-after.png)

## Harmonisation UI de Rappels du 17 octobre 2026

- `src/modules/patient-reminders/patient-reminders.css` : hauteur commune de 44 px pour « Rappel médical » et « Mes rappels » ; flèches sans bordure ni ombre propres, contenues dans les champs ; actions de carte de 120 × 44 px en fenêtre large, réorganisation en deux colonnes à petite largeur. Les règles sont limitées au module Rappels.
- `src/modules/patient-reminders/medical-reminder-dialog.tsx` : réutilisation du calendrier partagé avec des jours de 44 px, affichage français, conservation du calcul calendaire et de la date civile sélectionnée, interdiction des dates antérieures à l’acte.
- `src/modules/patient-reminders/patient-reminders-panel.tsx` : groupe commun pour la mise en page des quatre actions, sans changement des opérations de traitement, report, annulation ou historique.

Validation : typecheck 0 erreur, lint 0 erreur et 0 avertissement, **800 tests réussis** (787 applicatifs et 13 activation), build frontend réussi. **27 contrôles UI réussis** sur SQLite isolée : thèmes clair et sombre, largeurs 768/1024/1440 px, sélection patient/type, modification de l’échéance dans le calendrier et vérification de sa sauvegarde exacte, refus des dates antérieures à l’acte, conservation des rappels manuels. Aucun push, tag ou release.

Captures après correction :

- [Page et actions](../output/playwright/reminders-page-ui-after-light.png)
- [Modal et sélecteurs intégrés](../output/playwright/reminders-modal-ui-after-light.png)
- [Calendrier agrandi](../output/playwright/reminders-calendar-ui-after-light.png)
- [Calendrier sombre](../output/playwright/reminders-calendar-ui-after-dark.png)
- [Fenêtre réduite en sombre](../output/playwright/reminders-page-ui-after-dark-768.png)
- [Reçus détaillés](../output/playwright/reminders-ui-polish-verification.json)

Ajustement de taille demandé ensuite : calendrier réduit à 310 × 364 px avec des jours de 40 px, au lieu de 363 × 388 px avec des jours de 44 px. Les autres champs et boutons restent à 44 px. Sélection vérifiée en clair et en sombre ; typecheck, lint, 800 tests et build frontend validés. [Calendrier compact](../output/playwright/reminders-calendar-compact-light.png).
