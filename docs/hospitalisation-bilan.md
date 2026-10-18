# Livraison Hospitalisation

## État des lieux

Clinique, patients, soins, Agenda, tâches de rappel et facturation existaient déjà. Les anciennes hospitalisations et constantes restent lisibles ; aucune conversion automatique d’un ancien état ambigu n’a été faite. Hospitalisation est intégré à Clinique, à côté de Soins, sans entrée de sidebar ni route principale supplémentaire.

## Analyse préalable obligatoire

L’analyse REA des sources OpenVPMS a précédé la spécification et le code. Voir hospitalisation-spec.md pour les dépôts, révisions, empreintes et sources étudiées. Les inventaires REA sont partiels et statiques : aucune exécution Java/MySQL n’est revendiquée. Les comportements supplémentaires Baitari y sont distingués de ceux effectivement observés dans OpenVPMS.

## Preuves par exigence

| Exigence | Éléments vérifiés |
| --- | --- |
| Séjours et transitions | domain.ts, store.ts, tests domain/store ; auteur requis, motif d’annulation, sortie datée et résumée |
| Un seul séjour actif par patient | Index SQLite partiel, rollback et test d’admissions concurrentes |
| Emplacements | Cages/boxes/chenils, occupation unique, activation/désactivation protégées et transferts motivés |
| Occupation actualisée | Invalidation après commit, retour de fenêtre/visibilité et rafraîchissement périodique |
| Plans multi-jours | Horaires calendaires locaux, tâches care_tasks liées au séjour/plan, clés uniques, tests changement d’heure |
| Modification de plan | Conservation des réalisés/en cours/passés, annulation tracée des futurs à faire, nouveaux horaires futurs et rollback |
| Constantes | Six champs, relevés attribués et datés, courbes des quatre mesures numériques, repères sourcés chien/chat/lapin |
| Tournée | Cartes de soins existantes, relevé rapide, test à 1024 × 768, cibles du module ≥ 44 px, pas de débordement horizontal |
| Agenda | Admissions/sorties dérivées des séjours, clic vers Clinique/Hospitalisation, soins inchangés dans care_tasks |
| Facturation | Journées calendaires, tarif réel choisi, brouillon dans billingService, référence unique, aucun paiement ni émission automatique |
| Dossier patient | PatientStays ajouté au-dessus du registre historique préservé |
| Rappels | Tâche patient de contrôle après sortie, création/historique atomiques, date validée et doublons empêchés |
| SQLite | Migration 025 : stays, locations, care_plans, vital_signs, stay_history et références care_tasks |
| Design | SF Pro native dans le module, tailles prescrites, couleurs/bordures existantes, icône officielle Lucide à trait 1 avec licence conservée |

## Résumé fichier par fichier

Les fichiers du module sont dans src/modules/hospitalizations/stays/.

| Fichier | Rôle |
| --- | --- |
| domain.ts | Machine à états, journées et génération d’horaires locaux |
| migration.ts | Tables, références, index d’unicité et triggers d’occupation |
| store.ts | Opérations SQLite transactionnelles, historique, constantes, plans, transferts et contrôle de sortie |
| service.ts | Adaptateur vers la base locale existante |
| use-stays.ts | Chargement et rafraîchissement des séjours/emplacements |
| stays-page.tsx | Sous-vues Séjours, Occupation, Tournée et Emplacements |
| stay-forms.tsx | Admission avec recherche patient et création d’emplacement |
| stay-location-controls.tsx | Activation/désactivation et transfert avec motif |
| stay-detail.tsx | Suivi du séjour, sortie, constantes, plans, contrôle et facture |
| stay-records.tsx | Liste des plans/tâches et historique attribué |
| care-plan-form.tsx | Création/modification de plans avec aperçu des occurrences |
| vitals-form.tsx | Saisie des constantes et observations |
| vitals-curves.tsx | Courbes des mesures présentes, sans valeurs fictives |
| vital-alerts.ts | Repères au repos par espèce, sources et alertes contextuelles |
| stay-rounds.tsx | Tournée avec réutilisation de CarePage et relevé rapide |
| agenda-stays.tsx | Événements d’admission/sortie dans Agenda |
| patient-stays.tsx | Historique des séjours dans le dossier patient |
| billing.ts | Proposition des journées et prévention des doubles brouillons |
| stay-billing.tsx | Tarif choisi, total et validation explicite du brouillon |
| stay-follow-up.tsx | Planification explicite du contrôle dans Rappels |
| hospitalisation.css | Police native et cibles tactiles du module |
| clipboard-icon.tsx | Source officielle Lucide Clipboard, stroke 1 |
| lucide-license.txt | Notices de licence de l’icône, également distribuées dans public/licenses/lucide-hospitalisation.txt |
| src/modules/clinique/pages/clinical-workspace.tsx | Onglet Hospitalisation et navigation par focus |
| src/contexts/focus-provider.tsx | Entité stay pour navigation contextuelle |
| src/modules/agenda/components/agenda-view.tsx | Montage des admissions/sorties |
| src/modules/patients/patient-detail-page.tsx | Montage de l’historique patient |
| src/services/sqlite/migrations.ts | Enregistrement de la migration 025 |
| tests/sqlite/migration-runner.test.ts | Version et séquence de migration actualisées |
| tests/modules/hospitalizations/domain.test.ts | Transitions, journées, bornes et changement d’heure |
| tests/modules/hospitalizations/migration.test.ts | Contraintes SQLite et occupation |
| tests/modules/hospitalizations/store.test.ts | Cycle séjour, tâches, transfert, contrôle, concurrence, idempotence et rollback |
| tests/modules/hospitalizations/vital-alerts.test.ts | Absence de mesure, repères par espèce et remplacement de repères |
| tests/modules/hospitalizations/billing.test.ts | Journées, garde-fous et référence unique |
| tests/services/billing-service.test.ts | Cycle admission/sortie/rappel/brouillon dans la base complète migrée |
| docs/hospitalisation-spec.md | Analyse préalable et spécification métier |

## Captures et limites des vérifications

Les cinq vues et une capture tablette sont dans :
/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/hospitalisation-app/

Fichiers : liste-sejours-test-isole.png, detail-test-isole.png, tournee-test-isole.png, occupation-test-isole.png, emplacements-test-isole.png, tournee-tablette-test-isole.png. Les quatre vues vides sont également capturées. verification.json confirme l’absence d’erreur JavaScript et d’écriture en production.

Captures obtenues dans Chrome avec la coque réelle de l’application et une base SQLite en mémoire. Le patient provient de données locales existantes ; le séjour et les tâches sont explicitement des tests isolés. Ce n’est pas une validation clinique ni un test natif macOS. Aucun séjour fictif n’a été persisté dans la base de l’utilisateur. Les tests de concurrence portent sur le sérialiseur local, pas sur plusieurs processus indépendants. Les repères physiologiques sont des repères au repos, pas des diagnostics. Un build release Tauri n’a pas été lancé ; le gate demandé est le build frontend.

## Contrôles finaux du 12 octobre 2026

- Typecheck : 0 erreur.
- Lint global : 0 erreur, 0 avertissement.
- Suite complète : 539 tests réussis dans 66 fichiers.
- Build frontend : réussi ; notices Lucide présentes dans dist/licenses et identiques aux sources. Vite conserve ses avertissements de taille de bundles et d’imports mixtes.
- Cinq vues capturées dans la coque Clinique, plus Tournée tablette à 1024 × 768. Aucune erreur JavaScript ; aucune écriture de test dans la base de production.
- Validation native macOS non effectuée dans cette passe ; aucun build release Tauri lancé.
