# Audit du module documentaire existant

Date : 17 octobre 2026. Phase 1a du chantier Modèles de documents. Ce document est écrit avant les modifications fonctionnelles du chantier.

## Périmètre et sources

Audit du code du dépôt courant, sans accès à une base clinique réelle. Les livraisons précédentes sont présentes dans `src/modules/documents/`, `src/modules/consultations/` et `src/modules/prescriptions/`. Les changements des rappels médicaux déjà présents dans l’arbre de travail ne font pas partie de ce chantier.

## Les trois modèles livrés

`src/modules/documents/lib/document-templates.ts` définit `DEFAULT_DOCUMENT_TEMPLATES`, datés du 7 octobre 2026 :

| Identifiant | Type | Contenu injecté |
|---|---|---|
| `document-prescription` | Ordonnance de consultation | Identité du patient et du propriétaire, date, vétérinaire, section P exacte. Médicaments, dose, voie, fréquence et signature restent à compléter explicitement. |
| `document-certificate` | Certificat de consultation | Identités, date, vétérinaire, sections O et A exactes. Objet, portée et signature restent à compléter. Aucune attestation automatique de bonne santé. |
| `document-report` | Compte-rendu de consultation | Identités, date, vétérinaire et quatre sections S/O/A/P exactes. |

La génération est une substitution déterministe, sans appel au modèle IA. Les champs actuellement reconnus sont `patient.nom`, `patient.espece`, `patient.race`, `proprietaire.nom`, `consultation.date`, `veterinaire.nom` et `soap.s/o/a/p`. Le corps est du texte brut. `documentToHtml` échappe les caractères HTML puis produit des paragraphes et des sauts de ligne. Le PDF est produit localement avec jsPDF, en A4, police Helvetica, pagination et pied de page fixe.

Les valeurs absentes restent actuellement vides. Une variable inconnue ou mal fermée est rejetée par `validateTemplate`. Ces deux comportements font déjà l’objet de tests. Les conserver dans l’API historique est nécessaire ; le moteur étendu devra fournir le marqueur visible demandé sans réécrire les textes des trois modèles d’origine.

## Administration réellement présente

L’existant n’est pas dépourvu de CRUD :

- `components/document-template-manager.tsx` permet déjà à un administrateur de créer, modifier et supprimer un modèle personnalisé ; supprimer la surcharge d’un modèle fourni restaure son contenu d’origine.
- Les variables existantes sont déjà insérables par boutons. Le nom, le type et le corps sont éditables.
- `hooks/use-document-templates.ts` fusionne les trois constantes avec les surcharges persistées par `useSQLite("document_templates")`.
- L’entrée se trouve dans Documents > Modèles. Elle doit rester utilisable, même si une entrée est ajoutée dans les paramètres.

Limites : pas d’activation/désactivation, pas de duplication dédiée, pas de verrou de suppression d’un modèle utilisé, pas d’auteur du modèle, pas d’en-tête clinique lié, trois types seulement. Le contrôle administrateur de cette interface doit être renforcé dans le nouveau service de persistance.

## Stockage et traçabilité

La table `document_templates` existe depuis la migration 019 dans `src/services/sqlite/schema.ts`. Colonnes : `id`, `kind`, `name`, `body`, `created_at`, `updated_at`. La contrainte `kind` accepte seulement `prescription`, `certificate`, `report`. Il ne faut ni recréer cette table par-dessus les données, ni remplacer la migration déjà appliquée. L’extension doit préserver les colonnes, identifiants, surcharges et modèles personnalisés existants.

`lib/save-reviewed-document.ts` enregistre un document relu dans la table existante `notes`, avec contenu HTML, patient, utilisateur et métadonnées `tags.clinicalDocument` : consultation, auteur/date de relecture, modèle et corps source, empreinte du SOAP ou pages du document lu. Il n’existe pas encore de registre métier dédié aux instances documentaires, de statut documentaire indépendant, d’historique de transitions ni de PDF d’impression figé.

Les pièces importées utilisent `consultation_documents` : patient, consultation, propriétaire, nom, type MIME, taille, description, auteur, dates et contenu local en `data_url`. Le nouveau registre devra conserver ces pièces et les notes déjà validées, avec une correspondance d’origine, sans modifier leurs tables.

## Parcours de génération et validation SOAP

`consultation-documents-assistant.tsx` est ouvert par le bouton Documents de `soap-panel.tsx`, ainsi que par Documents > Assistant documents via `documents-workspace.tsx`. Il possède les modes Créer et Lire, un choix de modèle, un texte ajustable et une attestation de relecture. La génération prépare seulement un brouillon en mémoire. L’enregistrement est explicite. L’export PDF est permis après enregistrement relu.

`isSoapReviewed` vérifie une validation humaine correspondant exactement aux quatre sections courantes, l’absence de brouillon IA et au moins une section non vide. Toute modification invalide la revue. `saveReviewedDocument` relit le patient de la consultation et la note SOAP dans la transaction SQLite avant l’insertion : un changement intervenu après la préparation bloque l’enregistrement. Ce verrou doit être réutilisé, y compris dans le nouveau parcours d’aperçu.

Le titre et le texte sont limités et validés. Une modification du titre ou du texte annule la case de relecture. Il n’y a pas de création silencieuse, de réécriture automatique de la note SOAP ou de posologie inventée.

## Lecture locale et prescriptions

Le volet Lire existe déjà : choix d’une pièce du dossier ou d’une note, ouverture d’un fichier local, extraction PDF.js, reconnaissance locale des images/pages scannées et interrogation du modèle local. Les résultats sont des citations avec numéros de page, vérifiées contre le texte source par `document-reading.ts`. Les limites portent sur 12 Mo, 20 pages et 60 000 caractères. Les ressources OCR sont embarquées ; leur installation et les limites de lecture sont documentées dans `docs/local-documents-assistant.md`.

La reconnaissance existante des scans doit rester accessible. Le nouveau parcours de lecture des pièces importées devra distinguer le texte extrait d’un PDF et la reconnaissance d’image, signaler explicitement un scan sans texte extractible et ne jamais présenter une lecture OCR incertaine comme un résultat clinique établi. L’assistant reste en lecture seule ; préparer une note de lecture conserve sa confirmation humaine existante.

Le calcul de dose se trouve dans `src/modules/prescriptions/lib/dose-calculator.ts`. Le générateur historique n’en exécute aucun : il copie exactement le plan validé. Le nouveau document peut reprendre des lignes de prescription réellement enregistrées et leurs calculs déterministes, mais ne doit ni déduire un médicament depuis le seul poids ni créer une posologie manquante.

## Écarts avec le module demandé

1. Ajouter le quatrième type Lettre de référence et les variantes de certificats sans transformer des observations en attestation inventée.
2. Étendre l’administration existante avec duplication, actif/inactif, auteur, interdiction de supprimer un modèle utilisé et variables élargies lisibles.
3. Ajouter un registre d’instances avec patient, consultation, note source, modèle et version/snapshots, statuts et historique immuable.
4. Ajouter un aperçu fidèle A4 avec en-tête/pied clinique commun, finalisation, impression et export du PDF finalisé ; correction par nouvelle instance liée.
5. Enrichir l’onglet patient avec documents générés et pièces importées, recherche, filtres et lecture. Conserver les notes, pièces et entrées existantes.
6. Exposer les nouvelles instances et pièces à la lecture assistée avec sources identifiables, signalement des scans et absence de modification automatique.

## Non-régression à vérifier

`tests/modules/documents/documents.test.ts` couvre les trois rendus, la conservation exacte d’une dose déjà saisie, le refus de source non validée/modifiée, l’échappement HTML, les citations et limites de lecture. `document-persistence.test.ts` utilise SQLite réel en mémoire pour la transaction de sauvegarde et le refus d’une note modifiée. Les tests de détection de scans et d’OCR embarqué complètent ce socle.

Avant d’étendre les rendus, figer des attentes exactes des trois modèles historiques avec des données fictives. Puis vérifier la migration des personnalisations, la conservation des notes/pièces existantes, les nouveaux statuts et les nouvelles sorties. Aucun accès au réseau n’est nécessaire à la génération, au stockage, à l’impression ou à l’export.

## Conclusion de l’audit

La base existante est fonctionnelle et réutilisable : éditeur, variables, génération déterministe, validation transactionnelle, PDF et lecture locale. Le chantier consiste à ajouter un cycle documentaire et à administrer ces ressources plus complètement. La spécification REA doit définir l’extension additive avant tout code.
