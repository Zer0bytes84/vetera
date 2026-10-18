# Carnet de santé du patient : bilan

Date : 18 octobre 2026. Rien n'a été commité ni poussé.

## Ce qui change pour le vétérinaire

Dans le dossier patient, un bouton **« Carnet de santé »** s'ajoute à droite de « Exporter en PDF ». Il ouvre un aperçu d'**une page A4**, puis propose **Imprimer** ou **Enregistrer le PDF** (nom de fichier `Carnet_de_sante_<Nom>_<date>.pdf`). Les autres boutons restent à leur place et rien d'autre ne change.

La page se lit de haut en bas, du plus important au détail :

1. **En-tête** : « Carnet de santé », date d'édition, et à droite le nom, le téléphone, l'e-mail et le logo du cabinet repris des réglages de facture, s'ils existent.
2. **Identité** : photo (sinon l'initiale), nom, espèce, race, sexe (castré ou stérilisée), puis quatre repères : âge, date de naissance, poids actuel, identification (puce ou tatouage). Le propriétaire et son téléphone figurent en dessous.
3. **« À signaler »**, en rouge, avant tout le reste : allergies, vaccins en retard (avec la date du rappel dû) et affections chroniques. Sans rien de tout cela, un bandeau vert indique « Rien à signaler : aucune allergie, affection chronique ni vaccin en retard dans le dossier ».
4. Quatre **cartes** sur deux colonnes, dans l'esprit d'Apple Santé :
   - **Vaccinations** : dernière injection de chaque vaccin, avec une pastille pour le rappel : rouge « En retard », orange « À prévoir » (dans les 30 jours), verte « Rappel », grise « Pas de rappel prévu ». Les plus urgents viennent en premier.
   - **Traitements en cours** : lignes des ordonnances signées ou délivrées dont la durée n'est pas écoulée (même règle que le contrôle de sécurité), avec dose, fréquence, durée, date de début et date de fin calculée, ou « au long cours ».
   - **Poids** : valeur actuelle en grand, écart avec la pesée précédente, courbe des 24 dernières pesées.
   - **Antécédents** : chirurgies, urgences et hospitalisations d'abord, puis consultations terminées. Les rendez-vous annulés, non honorés ou à venir et les visites de vaccination sont exclus.
5. **Pied de page** : date, source (« à partir du dossier médical tenu par… ») et la mention qu'il ne remplace pas l'avis du vétérinaire.

**Une page, toujours** : chaque rubrique a un maximum de lignes (8 alertes, 5 vaccins, 4 traitements, 6 antécédents). Ce qui dépasse est annoncé (« Et 3 autre(s)… ») et les textes trop longs sont coupés par « … ». Un test vérifie qu'un dossier très chargé tient au-dessus du pied de page.

## Données réelles uniquement

- Tout vient du dossier : patient, propriétaire, pesées, vaccinations, ordonnances, rendez-vous, hospitalisations. Les seules valeurs calculées sont l'âge, l'état des rappels, la date de fin d'un traitement et l'écart de poids.
- Une donnée absente reste absente : « Non renseigné », « Aucune pesée enregistrée », « Aucune vaccination enregistrée », etc.
- La photo n'est reprise que si elle est stockée localement (image PNG ou JPEG embarquée). Aucune adresse distante n'est chargée. Les polices sont locales.
- Le carnet est établi à l'ouverture de l'aperçu et ne change pas pendant la relecture.

## Fichiers

Nouveaux, dans `src/modules/patients/health-card/` :

- `health-card-data.ts` : assemblage pur (alertes, vaccins, traitements, poids, antécédents, âge) ;
- `health-card-pdf.ts` : mise en page jsPDF d'une page ;
- `health-card-dialog.tsx` : aperçu, impression, enregistrement.

Tests : `tests/modules/patients/health-card-data.test.ts` (9) et `health-card-pdf.test.ts` (3).

Modifiés, ajouts uniquement :

- `patient-header.tsx` : propriété facultative `onHealthCard` et le bouton ;
- `patient-detail-page.tsx` : état d'ouverture et chargement différé de la fenêtre ;
- `export/patient-record-save.ts` : `savePatientRecordPdf` accepte en option le titre de la fenêtre d'enregistrement. Sans option, le comportement de l'export du dossier est identique.

L'aperçu, l'impression et l'enregistrement réutilisent ceux de l'export PDF du dossier (`PatientRecordPreview`, `printPatientRecordPdf`, `savePatientRecordPdf`), y compris la vérification de session avant écriture.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 126 fichiers, 977 tests, tous verts (12 nouveaux) ;
- un test du modèle a révélé un vrai piège, corrigé : une date seule (« 2026-10-18 ») lue en UTC faisait passer un rappel dû aujourd'hui « en retard » en Amérique. Les dates seules sont désormais lues comme des jours locaux ;
- navigateur (`npx vite`, port 5174), sur Milo (`demo_patient_02`) : carnet avec les données de démo, puis avec des données de test (6 pesées, 3 vaccins dont un en retard, une ordonnance signée de 2 lignes, une chirurgie). Aucune erreur dans la console.

**Données de test** : 13 lignes préfixées `test_carnet_`, ajoutées dans le stockage local du navigateur pour les captures 03 et 04, puis **retirées**. Les compteurs sont revenus à l'état initial (0 pesée, 0 vaccin, 0 ordonnance, 8 rendez-vous). Les captures 05 à 07 sont des rendus pleine résolution du même code PDF, avec des données d'exemple écrites dans le test.

**Non vérifié** : le clic sur « Enregistrer le PDF » et « Imprimer » (téléchargement et fenêtre système), ainsi que la lecture en SQLite réelle, qui demande `npm run tauri:dev`. Ces deux actions passent par les fonctions déjà utilisées par l'export du dossier.

## Captures

Avant (`avant/`) :

1. `01-entete-dossier-milo.jpg` : en-tête du dossier, sans carnet.

Après (`apres/`) :

1. `01-entete-bouton-carnet.jpg` : bouton « Carnet de santé » ajouté après « Exporter en PDF » ;
2. `02-apercu-milo-donnees-de-demo.jpg` : carnet de Milo avec les seules données de démo (allergie, un contrôle) ;
3. `03-apercu-milo-donnees-de-test.jpg` : avec données de test, vaccin en retard dans « À signaler » ;
4. `04-apercu-milo-bas-de-page.jpg` : traitements, antécédents, pied de page ;
5. `05-page-complete-pleine-resolution.png` : la page entière, pleine résolution ;
6. `06-dossier-tres-charge-tient-sur-une-page.png` : cas extrême, tout tient sur une page ;
7. `07-dossier-vide.png` : dossier vide, « Rien à signaler » et rubriques vides.

## Remarqué en passant, non modifié

- Le bandeau du dossier « Rappel vaccinal à prévoir » annonçait le rappel de la rage (dans 20 jours) mais pas le typhus, dont le rappel était **dépassé** depuis 15 jours (capture 03, données de test). Le carnet, lui, le classe « En retard ». À vérifier dans le widget du dossier.
- Les rappels médicaux de la table `medical_reminders` (disponibles seulement sous Tauri) ne sont pas repris : le carnet s'appuie sur la date de rappel saisie avec chaque vaccination.
