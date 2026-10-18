# Modèles d'ordonnances : bilan

Date : 18 octobre 2026. Rien n'a été commité ni poussé.

## Ce qui change pour le vétérinaire

Dans le panneau Ordonnance (dossier patient, onglet Ordonnances, « Nouvelle ordonnance ») :

1. **Enregistrer comme modèle** : un bouton sous les lignes de l'ordonnance (et le bouton « Modèles » de l'en-tête) ouvre la fenêtre « Modèles d'ordonnance ». On nomme le modèle (« Otite standard », « Gastro-entérite », « Post-chirurgie »…). Sont conservés : médicaments, posologies par kg, unité, concentration, fréquences, durées, forme, voie, quantité, instructions, précautions, ainsi que le diagnostic et les instructions générales. Les doses calculées (mg, mL) ne sont **jamais figées**. Si le nom existe déjà (casse et accents ignorés), le bouton devient « Remplacer » et un message l'annonce.
2. **Appliquer un modèle** : sur une ordonnance vide, une rangée « Partir d'un modèle » apparaît sous « Ajouter un médicament ». Un clic ajoute tous les médicaments. Les doses sont recalculées avec le poids saisi dans l'ordonnance ; s'il est vide, la dernière pesée du dossier est reprise (et le message le dit) ; sans pesée, le message demande de renseigner le poids. Le diagnostic et les instructions générales du modèle ne remplissent que des champs vides : rien de ce que le vétérinaire a tapé n'est écrasé. Depuis la fenêtre « Modèles », « Appliquer » ajoute aussi un modèle à une ordonnance déjà commencée, à la suite des lignes existantes.
3. **Gestion** : la fenêtre « Modèles » liste les modèles par ordre alphabétique, avec Appliquer, Renommer (édition en place, nom présélectionné, Entrée pour valider, Échap pour annuler) et Supprimer (confirmation en place). Un renommage vers un nom déjà pris est refusé.
4. **Sécurité** : le contrôle de sécurité existant est appliqué **au moment de l'application**, pour le patient courant. Chaque modèle affiche avant le clic un badge rouge « N alertes » (interactions avec l'ordonnance en cours et les traitements actifs, contre-indications avec allergies et affections chroniques). Après application, le bandeau et les badges habituels s'affichent, et la notification indique « Modèle … appliqué : N alertes de sécurité à vérifier ». Comme pour la saisie manuelle, l'alerte informe sans bloquer.

## Stockage

Local, comme le reste : un seul enregistrement JSON dans la table `app_settings`, clé `prescription_templates_v1` (SQLite sous Tauri, stockage navigateur sinon), via `getSetting` / `setSetting` existants. Aucune migration, aucune nouvelle table. Si l'enregistrement est illisible, la fenêtre l'indique et **aucune écriture n'est tentée**, pour ne jamais écraser des modèles qu'on n'a pas pu lire.

## Fichiers

Nouveaux :

- `src/modules/prescriptions/lib/prescription-templates.ts` : logique pure (enregistrement, remplacement, renommage, suppression, tri, lecture tolérante, instanciation, `checkTemplateSafety`) ;
- `src/modules/prescriptions/lib/prescription-template-store.ts` : lecture et écriture locales ;
- `src/modules/prescriptions/components/prescription-templates.tsx` : hook `usePrescriptionTemplates`, liste rapide, fenêtre de gestion ;
- `src/modules/prescriptions/components/prescription-templates.css` : styles Classique et Premium, tailles de texte 12, 13 et 14 px ;
- `tests/modules/prescriptions/prescription-templates.test.ts` : 12 tests.

Modifié : `src/modules/prescriptions/components/prescription-builder.tsx`, ajouts uniquement : un bouton « Modèles » ajouté dans l'en-tête avant « Aperçu », un pied facultatif sur l'état vide, un bouton « Enregistrer comme modèle » sous le sélecteur de médicaments, la fenêtre des modèles, et la fonction d'application. Enregistrement du brouillon, signature, aperçu, calcul de dose, réorganisation des lignes et contrôle de sécurité sont inchangés ; aucun bouton existant n'est déplacé ni retiré.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint src/modules/prescriptions tests/modules/prescriptions` : 0 problème ;
- `npx vitest run` : 124 fichiers, 965 tests, tous verts (dont les 12 nouveaux et `tests/type-scale.test.ts`) ;
- navigateur (`npx vite`, port 5174) sur Simba (`demo_patient_04`, « Insuffisance renale debutante ») : enregistrement de « Otite standard » (Metacam 0,1 mg/kg 5 jours + Clamoxyl), application en un clic sur une ordonnance neuve à 4,2 kg (Metacam calculé à 0,42 mg), contre-indication AINS signalée avant et après application, renommage, persistance après rechargement de la page, suppression.

Données de test : le modèle créé a été **supprimé** à la fin ; la clé locale vaut `[]`. Aucune ordonnance n'a été enregistrée ni signée.

Non vérifié : l'écriture en SQLite réelle, qui demande `npm run tauri:dev`. Le stockage passe par `appSettingsService`, déjà utilisé sous Tauri pour les réglages de facture.

## Captures

Avant (`avant/`) :

1. `01-ordonnance-vide.jpg` : panneau vide ;
2. `02-ordonnance-un-medicament.jpg` : une ligne Metacam.

Après (`apres/`) :

1. `01-ordonnance-vide-bouton-modeles.jpg` : bouton « Modèles » ajouté avant « Aperçu », le reste à l'identique (sans modèle enregistré, l'état vide ne change pas) ;
2. `02-enregistrer-comme-modele.jpg` : fenêtre de sauvegarde, nom « Otite standard » ;
3. `03-modele-enregistre-liste.jpg` : modèle listé avec Appliquer, Renommer, Supprimer et le badge d'alertes ;
4. `04-nouvelle-ordonnance-partir-d-un-modele.jpg` : rangée « Partir d'un modèle » avec « 1 alerte » pour Simba ;
5. `05-modele-applique-doses-4-2-kg.jpg` : modèle appliqué, dose recalculée, bandeau de sécurité ;
6. `06-renommer-modele.jpg` : renommage en place ;
7. `07-supprimer-confirmation.jpg` : confirmation de suppression.

## Remarqué en passant, non modifié

- La posologie du catalogue pour le méloxicam chat (« 0.1 mg/kg J1 puis 0.05 mg/kg ») n'est pas comprise par le calculateur : la dose reste vide à l'ajout. Comportement existant.
- Les fenêtres ouvertes par-dessus le panneau (signature, modèles) n'assombrissent pas le panneau derrière elles. Comportement existant du composant de fenêtre, laissé tel quel.
