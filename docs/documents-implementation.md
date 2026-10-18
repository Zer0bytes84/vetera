# Module Modèles de documents : livraison et reçus

Validation du 17 octobre 2026. Version de travail : 3.3.25. Aucun push, tag, release ou remplacement de téléchargement.

## Fonctionnement livré

- Paramètres > Modèles de documents et Documents > Modèles ouvrent le même gestionnaire. Création, modification, duplication, activation/désactivation, suppression confirmée des modèles inutilisés, insertion de variables au curseur et rétablissement d'un modèle fourni. La gestion est contrôlée par le rôle administrateur dans le service, avec session active vérifiée.
- Depuis une note SOAP humainement validée, Générer un document prépare une ordonnance, un certificat, un compte-rendu ou une lettre de référence. Les quatre objets de certificat sont proposés. Le destinataire et le motif d'une référence sont saisis explicitement. Les médicaments et calculs de doses sont ceux des prescriptions signées/délivrées de la même consultation, sans recalcul ni mutation de stock/facture.
- Avant confirmation, l'aperçu reste en mémoire. Relecture explicite, enregistrement du brouillon puis finalisation par un vétérinaire. La source SOAP est revérifiée dans la transaction. Le document conserve patient, consultation, SOAP, empreinte source, modèle, données fusionnées et identité clinique.
- Après finalisation, le texte, l'identité clinique et le PDF sont verrouillés. Nouvelle version crée un autre document lié, sans réécrire l'original. Annulation exige un motif et conserve l'historique auteur/date. Un document annulé n'est plus proposé à l'impression ou à l'assistant.
- Un même PDF A4 fournit l'aperçu, le fichier final, l'export et les pages d'impression. Police locale intégrée, logo et pied de page communs au cabinet. Export nommé par type, patient et date locale. L'annulation du dialogue de sauvegarde ne déclenche pas un faux succès.
- L'onglet Documents du patient affiche les nouvelles instances et pièces, avec recherche, type et dates. Les anciens écrits/pièces et leurs actions restent accessibles. L'ancien bouton d'import utilise désormais l'import local avec consultation nullable, au lieu de tenter une clé étrangère vide.
- Import PDF/JPG/PNG dans SQLite, extraction PDF locale, aperçu et téléchargement de l'original. Un scan reste consultable mais est signalé comme non extractible. La reconnaissance d'image existante reste une action explicite. Les résultats textuels courts ne sont pas confondus avec des scans.
- Le lecteur existant et la recherche locale incluent les nouveaux documents finalisés, avec portée patient, citations vérifiées et exclusion des documents annulés. Aucun document n'est copié silencieusement dans les anciennes notes. L'assistant ne modifie pas les originaux.

L'identité clinique réutilise Paramètres > Cabinet & factures. Pour reprendre un modèle modifié, générer à nouveau depuis la note validée. Pour corriger une instance finalisée, utiliser Nouvelle version.

## Phase 1 avant le code

`docs/documents-audit.md` a été écrit à 12:16, puis `docs/documents-spec.md` à 12:24, avant le premier fichier fonctionnel du chantier. L'audit décrit les modèles et API réels, y compris l'éditeur déjà présent. La spécification contient l'analyse REA : typologie, lettre/formulaire, verrouillage, versions, fusion et stockage.

Le clone demandé `lsendel/openvpms` ne fournit que le projet parent dans la révision observée. L'analyse Java/ADL complémentaire utilise le clone OpenVPMS déjà présent dans `/tmp`, avec origine, révision et preuves REA consignées dans la spécification. Les pages HTML officielles n'ont pas été accessibles. L'analyse est statique, sans exécution d'OpenVPMS. La conservation systématique d'un PDF final est une décision Baitari, pas une propriété d'OpenVPMS prétendue sans preuve.

## Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` | 0 erreur, code de sortie 0 |
| `npm run lint -- --max-warnings 0` | 0 erreur, 0 avertissement, code de sortie 0 |
| `npm test` | **851 tests passés, 107 fichiers**, aucun échec |
| `npm run test:licenses` | **13 tests passés**, aucun échec |
| Total | **864 tests passés** |
| Tests du module Documents | 83 tests, incluant les tests historiques conservés |
| `npm run build` | Réussi, code de sortie 0, sortie dans `dist/` |
| `git diff --check` | Aucun problème d'espacement dans le diff |

Le build conserve l'avertissement Vite sur des paquets de plus de 500 ko. Ce n'est pas un avertissement ESLint. Aucun changement de découpage global du bundle n'a été ajouté à ce chantier.

Les tests couvrent les rendus exacts des trois modèles du 7 octobre, migration des personnalisations/notes, variables absentes/inconnues, absence d'invention, contrôle de session/rôle, quatre générations, prescriptions et doses conservées, absence d'effet de stock/facturation, relecture et contrôle de concurrence, finalisation, protection SQLite, versions, annulation et historique, stockage navigateur, import/lecture, scans, isolation patient et recherche locale. Les tests de migration et de réinitialisation existants incluent la migration 037.

## Parcours et captures vérifiés

Les composants réels ont été parcourus dans WebKit, en clair et sombre, sur un SQLite isolé avec des patients fictifs. Le scénario principal contient 20 assertions réussies, dont les quatre générations/finalisations/exports. Les parcours complémentaires vérifient filtres, nouvelle version, conservation de l'original, annulation, lecture d'un vrai PDF exporté, signalement d'un scan, import d'une image PNG, préparation de l'impression, accès depuis le SOAP et depuis les paramètres. La fenêtre compacte est contrôlée à 1024 × 768 sans débordement horizontal du registre.

Le pont natif SQLite est remplacé uniquement dans le navigateur de test par une base isolée. Le dialogue de sauvegarde natif est simulé, puis les octets PDF sont réellement écrits sur disque. Le texte du PDF réimporté est réellement extrait avec PDF.js. Les tests de réponse assistée utilisent un moteur contrôlé pour vérifier citations, nouvel essai/refus et fermeture du moteur. **L'inférence sur le modèle installé, le dialogue macOS réel et une impression sur imprimante physique ne sont pas attestés par ces reçus.** Les API locales existantes sont réutilisées ; aucune nouvelle dépendance cloud.

Les PDF produits et les captures sont regroupés dans `output/playwright/documents-2026-10-17/index.html`, avec les journaux dans `recus/` :

- Gestion des modèles, éditeur avec variables, entrée depuis le SOAP.
- Préparation et aperçu finalisé pour chacun des quatre types.
- Modèles utilisés, documents patient, nouvelle version/historique.
- Lecture PDF, scan signalé, image importée.
- Registre sombre et fenêtre compacte, accès depuis les paramètres.
- `Ordonnance_Milo_2026-10-17.pdf`, `Certificat_Milo_2026-10-17.pdf`, `Compte_rendu_Milo_2026-10-17.pdf`, `Lettre_de_reference_Milo_2026-10-17.pdf`.

## Stockage et compatibilité

Migration additive 037 : extension de `document_templates`, création de `documents`, `document_events` et `document_versions`, index et gardes d'immutabilité. Les colonnes historiques `kind/name/body` sont conservées et synchronisées avec les nouveaux champs. Les trois corps fournis sont insérés sans modifier une personnalisation présente, et leurs lignes vides sont préservées exactement. Un modèle référencé par un ancien document relu est également protégé contre la suppression.

Les notes et `consultation_documents` historiques ne sont ni supprimés ni réécrits. Les nouveaux fichiers/PDF sont conservés dans SQLite, donc inclus dans la sauvegarde native existante. Le navigateur garde son stockage local indépendant selon l'architecture déjà présente ; il n'accède pas à la base de l'application Tauri.

Limites d'import : 12 Mo, 20 pages PDF, 60 000 caractères de lecture. Les limites sont signalées, sans ignorer silencieusement des pages ou tronquer les coordonnées du destinataire. Un document finalisé conserve le PDF et les données de sa validation même si le modèle ou le cabinet changent ensuite.

## Fichier par fichier

### Noyau et persistance

| Fichier | Changement |
| --- | --- |
| `src/modules/documents/document-domain.ts` | Types des modèles/instances/imports/événements, libellés français et date locale commune. |
| `src/modules/documents/document-variables.ts` | Catalogue fermé, variables insérables, marqueur pour les données manquantes, validation du gabarit. |
| `src/modules/documents/document-migration.ts` | Migration 037, trois modèles exacts + référence, tables et verrous SQL, historique immuable. |
| `src/modules/documents/document-store.ts` | Services transactionnels testables, autorisations, génération, provenance, prescriptions, statuts, imports, versions et historique. |
| `src/modules/documents/document-service.ts` | Adaptateurs SQLite/navigateur, session et notifications de changement. |
| `src/modules/documents/hooks/use-managed-documents.ts` | Chargement, erreurs, actualisation et protection contre les réponses obsolètes. |
| `src/services/sqlite/migrations.ts` | Enregistrement de 037 après les migrations existantes. |
| `src/services/browser-store.ts` | Trois tables locales et transaction atomique dédiée au module ; conservation des tables existantes. |

### Interfaces et génération

| Fichier | Changement |
| --- | --- |
| `src/modules/documents/components/document-template-manager.tsx` | Administration complète, rôles, éditeur, duplication, restauration, confirmations et variables au curseur. |
| `src/modules/documents/document-module.css` | Styles du gestionnaire et de l'éditeur, responsive, états et contrôles. |
| `src/components/Parametres.tsx` | Entrée Modèles de documents et lien vers la configuration clinique existante. Les changements des rappels qui préexistaient sont conservés. |
| `src/modules/documents/components/document-composer.tsx` | Choix du type/modèle, certificat/destinataire, préparation en mémoire, relecture et confirmation. |
| `src/modules/documents/components/document-preview-dialog.tsx` | Aperçu, édition du brouillon, finalisation, nouvelle version, annulation motivée, historique, export et impression. |
| `src/modules/documents/components/document-paper-preview.tsx` | Pages de l'aperçu issues du PDF, état de chargement et annulation des lectures obsolètes. |
| `src/modules/documents/components/document-preview.css` | Disposition avec actions accessibles et zones de défilement bornées, adaptation aux petites fenêtres. |
| `src/modules/documents/lib/managed-document-pdf.ts` | PDF A4 avec police locale, identité clinique, pagination, export nommé, conversion d'image et impression du même rendu. |
| `src/modules/consultations/components/soap-panel.tsx` | Nouveau bouton Générer un document, disponible seulement sur la note validée courante ; ancien bouton Documents conservé. |
| `src/modules/documents/components/documents-workspace.tsx` | Même génération accessible depuis le contexte patient/consultation existant. |
| `src/modules/documents/hooks/use-document-templates.ts` | L'ancien générateur respecte le catalogue actif et ne ressuscite pas un modèle supprimé ; les gabarits étendus utilisent le nouveau parcours. |

### Dossier et assistant

| Fichier | Changement |
| --- | --- |
| `src/modules/documents/components/patient-document-registry.tsx` | Liste, filtres, imports, aperçu et lecteur du patient ; commande d'import partagée avec le bouton historique. |
| `src/modules/documents/lib/filter-patient-documents.ts` | Recherche/type/dates selon la date locale affichée. |
| `src/modules/documents/lib/patient-document-reading.ts` | Import/extraction locale PDF, détection des scans, contrôle de taille, adaptation des documents et reconnaissance d'image explicite. |
| `src/modules/documents/components/consultation-documents-assistant.tsx` | Nouvelles sources et entrée patient sans consultation ; maintien des sources historiques/OCR et priorité au signalement d'un scan. |
| `src/modules/patients/components/patient-documents-list.tsx` | Ajout du registre, conservation des pièces/écrits/actions historiques et raccordement de l'ancien bouton d'import. |
| `src/modules/consultations/local-ai/embedding-index.ts` | Extraits des nouveaux documents finalisés avec identifiant et portée patient. |
| `src/modules/consultations/local-ai/embedding-store.ts` | Lecture directe des sources courantes dans la recherche locale, sans recopier des notes ni reconstruire la table des index. |

### Tests et documentation

| Fichier | Vérification |
| --- | --- |
| `tests/modules/documents/legacy-document-goldens.test.ts` | Trois rendus historiques complets, comparés exactement. |
| `tests/modules/documents/managed-documents.test.ts` | Migration réelle SQLite, CRUD/usage/rôle, génération, provenance, doses, statuts, versions, annulation, imports et restauration d'un modèle. |
| `tests/modules/documents/browser-document-store.test.ts` | Persistance navigateur et atomicité, sans pont Tauri. |
| `tests/modules/documents/managed-pdf.test.ts` | A4/pagination/polices locales, nom de fichier et refus des sorties non finalisées. |
| `tests/modules/documents/patient-document-reading.test.ts` | Sources patient/PDF/images, scans, limites, filtres/dates et absence d'invention. |
| `tests/modules/documents/document-reading-integration.test.ts` | Source vers réponse citée, refus d'une dose inventée, scan sans appel au moteur, lecture seule. |
| `tests/modules/documents/template-manager-view.test.tsx` | Actions selon le rôle, modèle utilisé, chargement et reprise sur erreur. |
| `tests/modules/consultations/embedding-search.test.ts` | Recherche des nouvelles sources, isolation patient, exclusion des documents annulés/scannés. |
| `tests/sqlite/migration-runner.test.ts` | Registre et scénarios de mise à niveau jusqu'à 037. |
| `tests/services/local-data-reset.test.ts` | Réinitialisation et rollback avec les nouvelles tables/verrous, conservation de la sauvegarde préalable. |
| `tests/modules/stock/schema-upgrade.test.ts` | Attentes de version mises à jour à 037, mêmes assertions de conservation du stock. |
| `tests/modules/care-tasks/completion-rollback.test.ts` | Liste des migrations attendues étendue ; mêmes assertions de conservation des soins. |
| `tests/modules/patient-reminders/medical-migration.test.ts` | Liste des migrations attendues étendue ; mêmes assertions de non-régression des rappels. |
| `docs/documents-audit.md` | État initial documenté avant code. |
| `docs/documents-spec.md` | Analyse REA, décisions métier/techniques et protocole de validation avant code. |
| `docs/documents-implementation.md` | Ce bilan, fichiers et limites des reçus. |

Les moteurs historiques `document-templates.ts`, `save-reviewed-document.ts`, `document-pdf.ts`, `document-reading.ts`, `read-local-document.ts` et `read-document-answer.ts` restent inchangés. Le calculateur de dose, la délivrance, la facturation, les stocks et les rappels ne sont pas modifiés par ce chantier.

Les modifications des rappels présentes avant ce chantier dans l'arbre de travail ne sont pas attribuées à cette livraison et n'ont pas été réinitialisées.
