# Modèles de documents : spécification et analyse REA

Date : 17 octobre 2026. Phase 1b, écrite après `documents-audit.md` et avant tout code fonctionnel du chantier. Périmètre : documents cliniques locaux, sans modification des soins, stocks, prescriptions, facturation ou rappels.

## Sources et limites de l'observation

Le dépôt demandé est cloné hors de Baitari : `/tmp/openvpms-documents-rea`, origine `https://github.com/lsendel/openvpms`, révision `ff37da5dee8930628c4e83962e6d7bda757a650b`. Ce dépôt contient essentiellement le POM parent d'une ancienne distribution, pas l'ensemble des modules Java. La lecture REA de ce POM est conservée sous la preuve `ev_f3d7288a6aec3da8668885c461fd3e1edb012a061793b00fef260a2ddaf93bbb`.

Le complément source est le clone déjà utilisé pour les rappels, `/tmp/openvpms-reminders-source-20261016`, origine `https://github.com/Narimm/OpenVPMS`, révision `b9323779aa29c9ff9e9a40569f4c1db7d287a84f`. Les lectures des ADL, classes Java et mappings Hibernate ont été capturées par le MCP REA `capture_process_scenario` : preuves `ev_887f1d4af9bb26a49351e1a3c0efdf95ec0c5bc8cda30920f2fdb79a034b6063` et `ev_423664b166532b6c4940df7f88ac5036684ccb23cc96867b4db2c1438e6bb533`, sortie normale 0, chemins et empreintes SHA-256 des fichiers inclus. Les extraits bruts sont conservés ; certaines images cumulatives du terminal ont été omises par la limite de sortie du captureur. Aucune application Java ni base OpenVPMS n'a été exécutée. Il s'agit d'une analyse statique de cette révision, pas d'une certification de la version 2.1 actuelle.

Les trois pages officielles fournies (`documentation/csh/2.1/concepts/documents`, `patient-letters-versus-patient-forms`, `book/export/html/10038`) n'ont pas été accessibles par le lecteur web lors de l'audit. Les affirmations ci-dessous reposent sur le code source vérifié. Les décisions propres à Baitari sont distinguées des observations.

## R : ressources du modèle métier OpenVPMS

Les chemins abrégés suivants sont relatifs au clone complémentaire : `A` = `openvpms-archetypes/src/archetypes/org/openvpms/archetype`, `C` = `openvpms-web/openvpms-web-component/src/main/java/org/openvpms/web/component`, `W` = `openvpms-web/openvpms-web-workspaces/src/main/java/org/openvpms/web/workspace`.

### Typologie

`A/document/entity.documentTemplate.adl:24-78` associe chaque modèle à un acte métier, et non à une simple extension de fichier.

| Type | Acte cible | Emplacement et usage observés |
| --- | --- | --- |
| Patient Letter | `act.patientDocumentLetter` | Dossier documentaire du patient, courrier généré conservé avec le patient. `W/patient/mr/PatientDocumentQuery.java:37-42`. |
| Patient Form | `act.patientDocumentForm` | Même dossier, référence au modèle pour génération à l'impression. |
| Patient Medication Label | `act.patientMedication` | Étiquette de médicament depuis la médication/délivrance, `PatientMedicationActLayoutStrategy.java:115-136`. |
| Patient Visit | `act.patientClinicalEvent` | Impression de visite/historique, `W/patient/history/PatientHistoryCRUDWindow.java:402-417`. |
| Customer Letter | `act.customerDocumentLetter` | Courrier associé au client, espace `W/customer/document/CustomerDocumentWorkspace.java:41-52`. |
| Autres | Formulaires client/fournisseur, ordonnance, facture, rapports | Types distincts explicitement listés dans l'ADL. Hors périmètre de cette V1 Baitari. |

### Lettre et formulaire

La lettre patient possède les nœuds `documentTemplate`, `document` et `versions` (`A/patient/act.patientDocumentLetter.adl:41-57`). Le formulaire possède `documentTemplate`, mais aucun nœud `document` ni `versions` (`act.patientDocumentForm.adl:39-61`). `C/im/doc/DocumentActPrinter.java:74-79` imprime le document conservé quand il existe, sinon génère depuis le modèle. `DocumentActDownloader.java:206-235` applique la même distinction. `DocumentActEditor.java:283-310` génère une instance quand l'acte possède un éditeur de document.

Conséquence déduite de ces branches : un modèle de formulaire modifié influence l'impression suivante ; une lettre conserve son fichier généré et n'est régénérée que par une action explicite. Baitari reprend cette séparation : **modèle réutilisable** et **document patient figé**. Les quatre sorties cliniques V1 se comportent comme des lettres. Aucun formulaire dynamique supplémentaire n'est introduit, aucune modification de modèle ne réécrit un document existant.

### Champs de fusion

`openvpms-reports/.../AbstractExpressionEvaluator.java:124-141,205-207` distingue chemins de nœuds, champs additionnels et expressions JXPath entre crochets. `IMObjectExpressionEvaluator.java:90-94` résout le contexte métier. Le rapport de test `Test Invoice.jrxml:19-25` utilise notamment `customer.entity.name`, `author.entity.name` et `startTime`. `C/im/report/ReportContextFactory.java:65-81` fournit patient, client, clinique, clinicien, visite, rendez-vous et utilisateur. `OpenOfficeIMReport.java:439-451` remplit les champs utilisateur du modèle ; `DocumentGenerator.java:219-229,289-301` collecte aussi des paramètres explicites.

Baitari utilise un registre fermé de variables françaises `{{patient.nom}}`, `{{client.telephone}}`, etc. Il n'exécute aucune expression, aucun script et aucune instruction issue d'un modèle. Les valeurs absentes ou inconnues deviennent `[à compléter]`. Le texte clinique est toujours celui de la source validée, jamais une complétion IA.

### Stockage

Le modèle référence son fichier source (`A/document/act.documentTemplate.adl:24-33`), la lettre référence son fichier généré (`DocumentGenerator.java:259-268`). `openvpms-framework/.../DocumentDOImpl.hbm.xml:21-54` conserve métadonnées et octets en SQL, colonne `contents` longblob. `DocumentActPrinter.java:106-115` et `DocumentActDownloader.java:206-235` convertissent vers le format demandé si nécessaire.

Le code ne prouve pas un stockage systématique de trois copies persistantes, dont le PDF d'impression. La conservation d'un PDF final dans Baitari est donc une **décision Baitari**, utile pour réimprimer exactement le même document, pas une caractéristique OpenVPMS affirmée sans preuve.

## E : événements et invariants

Les ADL des lettres et formulaires définissent `IN_PROGRESS`, `COMPLETED`, `POSTED`, affichés In Progress, Completed, Finalised. `C/im/edit/ActActions.java:144-155,251-252` interdit édition et suppression au statut POSTED. `DocumentActActions.java:53-61` interdit aussi Refresh lorsque l'acte est verrouillé ; Refresh exige un modèle et un document. La présence des trois statuts ne prouve pas un passage obligatoire par chacun : `ActActions.java:166-179` permet la finalisation d'un acte non finalisé/non annulé.

Le versioning dépend de la capacité `versions`, détectée par `DocumentRules.java:70-72`. `:100-119` conserve l'ancien document avant remplacement ; `DocumentCRUDWindow.java:308-323` propose de conserver la version précédente lors de Refresh, choix actif par défaut. Les formulaires n'ont pas cette collection. Les boutons New/Edit/Delete sont hérités du CRUD, Print/Refresh/édition externe figurent dans `DocumentCRUDWindow.java:112-125`.

### Adaptation Baitari

| Événement | Garde | Résultat local |
| --- | --- | --- |
| Préparer depuis SOAP | Consultation liée au patient et SOAP courant humainement validé | Aperçu en mémoire, aucune écriture silencieuse. |
| Confirmer la préparation | Relecture explicite, source recontrôlée dans la transaction | Instance brouillon, snapshots du modèle, de la clinique et de la source, événement auteur/date. |
| Modifier | Brouillon seulement, contrôle de concurrence | Nouveau texte enregistré, événement ; aucun changement au modèle ou au SOAP. |
| Finaliser | Brouillon, confirmation humaine, source SOAP toujours validée et identique | Contenu et PDF figés, auteur/date. |
| Corriger un finalisé | Action Nouvelle version | Nouvelle instance brouillon liée à l'original ; original conservé. |
| Annuler | Brouillon ou finalisé, motif non vide | Annulé conservé avec auteur/date/motif ; pas d'impression officielle. |
| Imprimer/exporter | Finalisé uniquement | Même rendu PDF local, nom lisible type/patient/date. |
| Modifier un modèle | Administrateur, modèle valide | Seules les préparations futures utilisent la modification. |
| Supprimer un modèle | Administrateur, confirmation, aucune utilisation | Suppression ; sinon désactivation seulement. |
| Importer | Patient existant, PDF/JPEG/PNG validé, taille limitée | Pièce conservée en SQLite, texte PDF extrait localement ou scan explicitement signalé. |

Il n'existe pas de retour finalisé vers brouillon sur la même instance. L'action Modifier d'un aperçu ne concerne que le brouillon ; après finalisation, elle devient Nouvelle version. Les règles sont imposées par le service et SQLite, pas seulement par les boutons.

## A : acteurs et responsabilités

| Acteur | Droits et responsabilité |
| --- | --- |
| Administrateur | Gère les modèles et l'identité clinique commune. Ne contourne pas le verrou des documents finalisés. |
| Vétérinaire authentifié | Prépare, relit, ajuste, finalise, imprime et annule avec motif les documents de ses dossiers. Auteur de chaque transition conservé. |
| Assistant local | Lit les sources du patient, cite le document/page, signale absence de texte et limites ; ne modifie ni modèle, ni document, ni SOAP. |
| Moteur déterministe | Fusion de données explicites et reprise de doses déjà calculées/enregistrées ; aucune décision clinique. |

## Architecture additive Baitari

### Modèles et compatibilité

La migration suivante, 037, étend `document_templates` sans remplacer sa table ni sa contrainte historique `kind`. Les colonnes françaises demandées (`nom`, `type_document`, `corps_modele`, `en_tete_id`, `actif`, `created_by`) s'ajoutent aux colonnes historiques. `kind` reste un alias de compatibilité à trois valeurs ; le type étendu autorise la référence. Le service maintient les alias en cohérence. Les modèles personnalisés sont conservés. Les trois modèles du 7 octobre sont insérés seulement s'ils n'existent pas, avec leurs identifiants et corps exacts. Une lettre de référence fournie complète le catalogue. Les API historiques de rendu et leurs tests exacts restent inchangés ; le nouveau moteur étendu accepte également les anciens noms de variables.

Les modèles de certificat restent neutres : le choix vaccination/stérilisation/bonne santé/vermifugation est une information de rédaction, jamais la preuve qu'un acte a eu lieu. Une donnée absente reste à compléter. Le nouveau contexte propose `prescription.medicaments` pour les médicaments effectivement enregistrés de la même consultation, signés ou délivrés, avec posologie, dose/volume calculés conservés, voie, fréquence, durée et instructions. Les prescriptions brouillon/annulées ou d'un autre patient sont exclues. Sans ligne structurée, le plan SOAP exact reste disponible, aucune dose n'est déduite. Aucune mutation de stock, délivrance, facture ou prescription n'est déclenchée.

### Instances, historique et fichiers

Nouvelle table `documents` : identifiant, patient, consultation nullable, modèle nullable, type, titre, contenu, statut, motif d'annulation, import nullable, dates et auteur. Colonnes complémentaires : note SOAP et empreinte source, snapshot de modèle, snapshot clinique, contexte de génération, fichier importé (nom/MIME/octets locaux), texte extrait et état de lecture, PDF final, document précédent nullable. Les pièces sont stockées dans SQLite pour rester couvertes par la sauvegarde locale existante. Aucun dossier cloud, URL distante ni synchronisation externe.

`document_events` conserve chaque transition avec auteur/date/motif. `document_versions` réserve la structure pour les versions fines ; V1 utilise surtout un nouveau document lié pour une correction. Des gardes SQLite empêchent l'altération du contenu d'un finalisé et la suppression d'une instance tracée. Les vérifications de service contrôlent utilisateur, patient, consultation et source au sein de la transaction sérialisée. Ne pas imbriquer une lecture de file DB dans une transaction déjà ouverte.

Les anciens `notes.tags.clinicalDocument` et `consultation_documents` restent accessibles dans la liste patient et le lecteur existants ; aucune table ni pièce ancienne n'est supprimée. Le nouvel onglet enrichit la liste, sans remplacer les actions Écrits du dossier ou l'ancien assistant.

L'identité clinique réutilise `invoiceSettingsService` (`invoice_settings_v1`) : nom, adresse, téléphone, email, logo et mentions/pied de page déjà configurables dans Cabinet & factures. Un snapshot est associé au document ; une modification ultérieure de la clinique ne change pas un PDF finalisé.

### Fusion, aperçu et PDF

Registre de variables groupé par patient/client/clinique/consultation/clinicien/SOAP/prescription/certificat/destinataire, avec libellés français insérables en un clic. Aucun `eval`, HTML issu des données échappé. Valeurs manquantes visibles. Limites de longueur, MIME et taille contrôlées avant persistance.

Un seul générateur de mise en page produit les pages A4 prévisualisées et le PDF, à partir du même snapshot clinique et du texte relu. Le PDF final est conservé pour les exports/réimpressions ultérieurs. L'export passe par `save-pdf.ts` (dialogue natif Tauri, téléchargement navigateur) ; l'impression utilise le système local. Un annuler de dialogue de sauvegarde n'est pas annoncé comme un succès.

### Lecture locale

Le lecteur existant reste disponible, y compris sa reconnaissance locale des images. Le nouveau registre expose le texte des documents générés et des PDF à texte extractible. PDF.js et ses ressources sont locales. Un PDF scanné est marqué sans texte extractible et l'assistant le signale, sans réponse inventée ; la reconnaissance existante reste une action explicite distincte. Les images sont prévisualisables et leur lecture OCR est annoncée comme telle. Les extraits restent des données non fiables, jamais des instructions pour le modèle. Une question est limitée aux documents du patient sélectionné, avec citations vérifiées contre le texte et les pages. L'index de recherche locale inclut les nouvelles sources accessibles, sans copier les instances dans les notes historiques.

### Intégration visuelle

Documents > Modèles garde son entrée. Une entrée équivalente dans les paramètres peut ouvrir le même gestionnaire. Depuis le SOAP, Générer un document ouvre le nouveau parcours, en conservant Documents et ses modes historiques. Le dossier patient conserve son onglet Documents enrichi : recherche, type, dates, pièces, statuts, auteur, actions explicites. Mise en page Premium actuelle, séparateurs fins, bandes structurantes contenues, espaces cohérents, boutons tactiles, Space Grotesk/Geist et Lucide trait 1. Aucun changement de thème, de mascotte ou de navigation métier.

## Plan de validation et reçus

1. Tests exacts des trois rendus historiques avant/après ; migration sur base vide et sur base personnalisée, données existantes préservées.
2. Fusion de variables, inconnues/absentes, échappement et absence d'invention ; prescription réelle et snapshots, aucun effet sur le stock.
3. Services sur SQLite isolé : création humaine, source valide et inchangée, auteur/patient, brouillon/finalisation/immutabilité/nouvelle version/annulation ; suppression de modèle utilisé refusée.
4. Lecture document généré et PDF texte ; scan proprement signalé, sources/citations et isolation patient ; non-régression OCR et assistant historiques.
5. Parcours UI sur données fictives : gestion/édition/duplication/inactivation, insertion de variables, quatre générations, aperçu, correction, import/liste/filtres, export PDF réellement ouvert et vérifié.
6. Typecheck sans erreur, lint sans erreur ni avertissement, tous les tests avec comptes exacts, build frontend. Captures des écrans et des quatre types, exemple PDF, bilan fichier par fichier. Aucun push/tag/release.
