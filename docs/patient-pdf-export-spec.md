# Export PDF du dossier patient : analyse REA et spécification

Date : 17 octobre 2026. **Phase 1 écrite avant tout code de cet export.** Version de départ : Baitari 3.3.26. Périmètre strictement additif, sans migration SQLite, modification de données cliniques, envoi réseau, push, tag ou release.

## 1. Sources, méthode et limites

Le dépôt demandé est déjà cloné hors du projet dans `/tmp/openvpms-documents-rea` : origine `https://github.com/lsendel/openvpms.git`, révision `ff37da5dee8930628c4e83962e6d7bda757a650b`, arbre propre. Son POM parent et son README ne contiennent pas les modules applicatifs complets (`pom.xml:25-27`, `README.md:11-22`). Le complément source est explicitement distinct : `/tmp/openvpms-reminders-source-20261016`, origine `https://github.com/Narimm/OpenVPMS.git`, révision `b9323779aa29c9ff9e9a40569f4c1db7d287a84f`, arbre propre, POM 2.1-SNAPSHOT.

Le skill reverse-engineer-anything guide une lecture statique ciblée du code et des modèles JRXML. Aucun serveur Java, moteur de rapport ni base OpenVPMS n’a été exécuté. La capture MCP REA de lectures en Python, avec origines, révisions, empreintes SHA-256 et extraits numérotés, porte la preuve **`ev_b502559a759d32767a17aaf043a2fbb793fcbf9b7f62f68385f944f5d14633cf`** ; processus terminé normalement, code 0. Les extraits complets de cette capture sont conservés dans `/tmp/baitari-patient-pdf-openvpms-evidence.json`. La limite de transport a omis des images cumulatives de terminal ; elle ne constitue pas une observation d’exécution d’OpenVPMS. Les autres références ci-dessous sont les observations de source du même clone, pas des preuves d’un rendu lancé.

Source publique primaire du dépôt demandé : [lsendel/openvpms](https://github.com/lsendel/openvpms). Les modèles de rapport sont également répertoriés dans [l’archive officielle OpenVPMS](https://svn.openvpms.org/openvpms/projects/openvpms/tags/2.0/openvpms-release/src/reports/Patient/Medical%20Records/Letter/). Cette archive d’une autre version confirme la présence des ressources, pas leur comportement actuel.

Abréviations de chemins relatifs au clone complémentaire : `W` = `openvpms-web/openvpms-web-workspaces/src/main/java/org/openvpms/web/workspace`, `C` = `openvpms-web/openvpms-web-component/src/main/java/org/openvpms/web/component`, `R` = `openvpms-release/src/reports`.

## 2. R : ressources et périmètre observés dans OpenVPMS

### Historique imprimé

Le parcours étudié est Patients > Medical Records > Summary > Print. Le modèle Medical Records est associé à `act.patientClinicalEvent` (`R/documents-A4.xml:112-115`). `W/patient/history/PatientHistoryCRUDWindow.java:249-274,402-417` transmet les visites de la requête courante, puis leurs actes enfants filtrés, à un rapport téléchargeable pour aperçu. Ce parcours n’assemble pas automatiquement tous les modules du dossier patient.

| Contenu observé | Preuve dans `R/Patient/Medical Records/A4/Medical Records.jrxml` |
| --- | --- |
| Visite : dates, motif, clinicien, statut, titre | lignes 279-377 |
| Note clinique et addendum : date, type, texte | 378-419 |
| Investigation : date, type, description, statut | 420-461 |
| Autres actes : date, type, description | 462-506 |
| Ligne de facturation : produit et quantité | 507-549 |
| Médication : description, étiquette et lot présent | 550-582 |
| Lettre/formulaire/version : modèle et description | 583-644 |

Les enfants autorisés incluent aussi problème, poids, pièce jointe et image (`openvpms-archetypes/src/archetypes/org/openvpms/archetype/patient/actRelationship.patientClinicalEventItem.adl:38-70`). Les versions documentaires sont incluses par `PatientHistoryQuery.java:92-96,187-195`.

Les visites suivent le tri de la requête, préférence `historySort`, par défaut décroissant (`PatientHistoryQuery.java:206-210,278-280`). À l’intérieur d’une visite, le parcours d’impression force un ordre croissant et place les addenda après leur acte parent (`PatientHistoryCRUDWindow.java:402-417`, `PatientHistoryFilter.java:110-115`).

### Mise en page observée

- A4, 595 × 842 points, marges 28 points, largeur utile 539 ; DejaVu Sans, base 10 points (`Medical Records.jrxml:4,22`). Variantes A5 et Letter présentes.
- Première page : sous-rapport d’en-tête clinique configurable, titre Medical Records, date/heure d’impression, Page 1 of N, patient et propriétaire avec identifiants/descriptions (`:71-230`). Le sous-rapport standard contient logo, nom, adresse, téléphone/fax, email, site et identifiant de société (`R/Letterhead/A4/Letterhead.jrxml:53-120`).
- Pages suivantes : titre, Page X of N et filet horizontal (`Medical Records.jrxml:232-274`). Ce modèle ne répète pas explicitement le nom du patient sur ces pages.
- Corps en colonnes alignées date/type/contenu, textes extensibles ; aucune bande d’en-tête de colonnes (`:275-277,380-391`). Pied de page : simple filet (`:649-658`).

### Pièces jointes et facturation

Les pièces apparaissent comme entrées d’historique avec métadonnées/descriptions. Le JRXML inspecté ne dessine pas les pages PDF/images originales ; ses paramètres sont `IsEmail` et `dataSource` (`:23-27`). Le parcours `C/im/report/Reporter.java:136-145` produit un seul rapport, sans concaténation de fichiers. **Aucune option de fusion intégrale des pièces n’a été trouvée dans ce parcours précis.** Ce constat ne couvre pas toutes les versions ni tous les modèles personnalisés.

Include Charges est une option explicite, activée par défaut selon préférence (`PatientHistoryQuery.java:108-109,228-229`) ; une charge déjà représentée par une médication est dédupliquée (`PatientHistoryFilter.java:213-230`). L’inclusion de factures complètes n’est pas établie.

## 3. E : filtres, génération et nommage OpenVPMS

- L’impression reprend les dates de début des visites, le type d’acte et la recherche textuelle courants (`PatientHistoryCRUDWindow.java:402-413`, `PatientHistoryQuery.java:219-237,257-268`). Toutes les dates est disponible et initialisé à vrai (`C/im/query/DateRange.java:55-58,108-127`). Les bornes sont début inclus et lendemain de fin exclu (`QueryHelper.java:243-256`).
- Le filtre de type de produit est appliqué au tableau, mais n’est pas transmis par `createPrinter` dans le parcours inspecté (`PatientHistoryBrowser.java:74-77`, `PatientHistoryCRUDWindow.java:402-417`). Ne pas le présenter comme une garantie du PDF.
- Le format par défaut est PDF, nom initial nom du rapport + extension, donc `Medical Records.pdf` (`openvpms-reports/src/java/org/openvpms/report/jasper/AbstractJasperIMReport.java:240-242,569-601`). Une expression de modèle peut personnaliser le nom avec le premier acte en contexte (`TemplatedReporter.java:237-254`, `FileNameFormatter.java:94-145`). Elle reçoit patient/client et `$file`, nettoie les caractères interdits, avec repli sur le nom de base. **Aucune convention obligatoire patient/date n’est démontrée.**

## 4. A : adaptation métier Baitari

Le vétérinaire choisit le périmètre, relit le PDF et choisit sa destination. Le moteur local assemble uniquement les données enregistrées du patient sélectionné. L’assistant IA n’intervient ni dans la génération, ni dans la réécriture, ni dans le nommage. Aucun document source n’est modifié ou marqué traité par un export.

Les différences suivantes sont des **décisions Baitari demandées par le brief**, pas des propriétés prétendues d’OpenVPMS : page de garde dédiée, identité patient répétée sur chaque page, sélection explicite des sections, rappels médicaux, mentions légales, nom patient/date et fusion des pièces originales en annexe. Les factures, le stock et de nouvelles sections cliniques ne sont pas ajoutés au périmètre.

## 5. Contrat fonctionnel Baitari

### Entrée et dialogue

Ajouter Exporter en PDF, icône Lucide Download trait 1, aux actions de `PatientHeader`, sans déplacer Note clinique, Planifier un rendez-vous, Modifier ni les accès aux soins. Dialogue Premium : titre, Tout l’historique ou plage De/À, cases des cinq sections cochées par défaut, option d’annexes activée par défaut, Générer et Annuler. Dates complètes et ordonnées obligatoires si la plage est choisie. Au moins une section ou les annexes doit être choisie.

Sections : Identité du patient ; Consultations ; Documents générés ; Rappels médicaux ; Notes libres. Les sections sans contenu dans le périmètre choisi sont omises du PDF. Un périmètre sans aucune donnée exportable est signalé avant l’aperçu, sans faux PDF complet.

### Assemblage et traçabilité

| Section | Sources existantes et règles |
| --- | --- |
| Identité | Patient, propriétaire et pesées réels. Nom, espèce, race, naissance/âge calculé si connu, dernier poids enregistré, contacts présents. Profil actuel au moment de l’export, sans prétendre reconstruire une identité historique. |
| Consultations | Rendez-vous du patient en ordre décroissant de `startTime`, motifs/diagnostics/traitements présents, SOAP du même patient et de la même consultation. Seulement les quatre champs cliniques enregistrés, jamais transcription ou `aiDraft`. Le statut de validation est explicite pour un SOAP non validé ; aucun contenu n’est complété. Médicaments signés/délivrés avec valeurs de dose/volume persistées, sans recalcul ni délivrance. |
| Documents générés | Instances finalisées uniquement, toutes versions conservées et identifiées ; documents brouillon/annulés exclus pour respecter le workflow livré. Inclure aussi les anciens écrits relus `notes.tags.clinicalDocument`, sans les compter une seconde fois comme notes libres. Les PDF finalisés d’origine restent inchangés. |
| Rappels médicaux | `medical_reminders` du patient, types configurés, échéances, statut en cours/terminé et dates présentes. Les rappels annulés ne deviennent pas des rappels effectués. Aucun appel, report ou génération déclenché. |
| Notes libres | Fonctionnalité existante : notes liées au patient, titre, texte HTML converti fidèlement en texte lisible et auteur/date présents. Toute l’équipe du dossier, pas seulement l’auteur connecté. `patient.generalNotes` est inclus si présent, sans date inventée. |
| Annexes | Originaux PDF/JPEG/PNG des deux registres existants, chacun filtré par patient et période. Les documents générés relèvent de leur case dédiée ; l’option Annexes pilote seulement les pièces importées. Images proportionnelles, jamais recadrées. |

La période est inclusive en jours de la clinique : date de consultation pour les visites et prescriptions associées ; date de création des documents/pièces/notes ; échéance pour les rappels. Les dates sans heure restent des jours civils ; ne pas décaler une date YYYY-MM-DD par conversion UTC. L’identité et les notes générales sans horodatage décrivent le profil actuel. Les anciens jours de pesée stockés à minuit UTC gardent leur préfixe civil, conformément à l’affichage existant.

Authentification fraîche vérifiée avant assemblage et avant enregistrement. Toutes les relations sont bornées au patient : une prescription ou pièce d’un autre patient n’entre jamais par une jointure de consultation seule. Les lectures réutilisent les dépôts/services existants ; le moteur PDF reçoit un instantané immuable, sans dépendre de React. Une source sélectionnée qui échoue ne devient pas silencieusement une liste vide. Dans un environnement où les rappels natifs ne sont pas disponibles, cette indisponibilité est annoncée, jamais assimilée à zéro rappel.

### Mise en page et PDF final

1. Garde A4 : nom du patient, espèce/race et propriétaire présents, date d’export, période choisie, logo et identité clinique configurés.
2. En-tête sur toutes les pages : nom du patient, clinique et Page X / N. Sections titrées et filets fins ; tableaux avec en-têtes répétés, cellules repliées à la ligne, lignes longues scindées proprement.
3. Consultations récentes en premier, suivies des documents, rappels, notes et annexes. Une liste/index identifie les pièces et leurs dates.
4. Pied sur toutes les pages : mentions légales configurées, date de génération, Document généré par Baitari. Ne pas inventer de mentions absentes.
5. Marges réservées en haut et en bas, également autour des pages sources des annexes ; aucun bandeau ne recouvre leur contenu.

Réutiliser jsPDF et les polices locales du générateur existant pour le dossier. Ajouter un assembleur PDF local léger si nécessaire pour les pages originales ; PDF.js reste le lecteur local pour l’aperçu. Les pages PDF sont proportionnellement tenues dans la zone utile A4. Les annotations/formulaires visibles sont aplatis localement si une insertion vectorielle ne les conserve pas ; leurs fichiers originaux ne changent pas. Une pièce corrompue/protégée/non prise en charge produit une erreur identifiant la pièce, jamais une omission. Aucune URL distante de logo, police, moteur PDF ou pièce n’est chargée.

Génération asynchrone annulable. Progression visible pendant toute la préparation ; au-delà de **20 pages**, indication détaillée et restitution régulière de la boucle d’événements. Pas de plafond arbitraire hérité des limites d’import ou de lecture IA. Aperçu paginé à la demande, sans rasteriser tout le dossier en mémoire à l’ouverture.

### Enregistrement et nommage

Les octets relus dans l’aperçu sont exactement ceux enregistrés ou imprimés. Imprimer et Enregistrer le PDF depuis l’aperçu, retour aux options et fermeture conservant les sources intactes. Le dialogue natif Enregistrer sous propose le dernier dossier utilisé avec succès, sinon le Bureau. Une annulation n’affiche aucun succès ; une erreur garde l’aperçu pour réessai. Confirmation avec le chemin réellement choisi. Le navigateur utilise son téléchargement local lorsqu’il est utilisé avec des sources disponibles.

Noms : `Dossier_Mocha_2026-10-17.pdf` ou `Dossier_Mocha_2026-01-01_2026-10-17.pdf`. Les accents lisibles sont conservés ; espaces normalisés en `_`, caractères de chemin/de contrôle interdits supprimés, nom vide remplacé par `Patient`. Dates civiles, sans effet de fuseau UTC. Aucun nom technique dans l’interface.

## 6. Validation et reçus à produire

- Tests purs : nommage accentué/espaces/caractères interdits, période invalide/inclusive, sections vides omises, tri décroissant, séparation notes/documents, statut des sources, isolation patient.
- Intégration SQLite isolée : patient riche, plusieurs visites, SOAP, médicaments à doses persistées, documents historiques/nouveaux, rappels et pièces ; aucune mutation des lignes sources.
- Vrais PDF : extraction du texte et vérification des valeurs, des en-têtes/pieds/page totals, des tableaux sur plusieurs pages, fusion d’un PDF portrait/paysage, image sans recadrage, annotations, annexe illisible avec erreur, dossier de plus de 20 pages, annulation/progression.
- Sauvegarde : destination choisie, Bureau/dernier dossier, mêmes octets que l’aperçu, annulation sans écriture ni succès, échec avec réessai. Aucun appel réseau sortant pendant génération/sauvegarde.
- Non-régression : modèles et exports individuels existants inchangés, tests historiques conservés, typecheck 0, lint 0/0, tous les tests et build frontend.
- Captures réelles : options claires/sombres et fenêtre compacte, garde, section de consultations/tableau et annexe du PDF produit ; exemple multipage et journaux regroupés dans un dossier de reçus. Distinguer les contrôles simulés du navigateur des opérations natives réellement exercées.

Questions OpenVPMS répondues sur les sources : périmètre et ordre, mise en page, options de dates/charges, nom de base et personnalisation. Limites restantes : rendu effectivement lancé, césure sur notes extrêmes, modèles personnalisés et versions ultérieures. Elles ne sont pas utilisées comme garanties pour Baitari.
