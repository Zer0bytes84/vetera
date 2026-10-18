# Bilan du 17 octobre 2026 (build 3.3.26)

Aucun push, tag, release ni build natif. Vérifications : typecheck 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 113 fichiers et 898 tests réussis.

## Tâche 1 : export PDF du dossier patient

Relecture du code laissé par Codex (`src/modules/patients/export/`) : dialogue d'options (période, cinq sections, annexes), page de garde, en-tête et pied répétés sur chaque page avec « Page X / N », nommage `Dossier_NomPatient_Date.pdf`, génération annulable avec progression, aperçu, enregistrement et impression. Aucun appel réseau : polices et worker PDF chargés depuis l'application (contrôlé dans le navigateur pendant une génération réelle, toutes les requêtes sont locales).

Corrections apportées :
- Les champs Du / Au utilisent le sélecteur de date français standard (tâche 4).
- Les messages d'erreur « Impossible de lire… » et « Indiquez… » s'affichent tels quels au lieu d'un message générique.

Reçus : `pdf/Dossier_Mocha_2026-10-17.pdf` (17 pages : garde, identité, 12 consultations triées de la plus récente à la plus ancienne, prescriptions, rappels, notes, index des annexes, bilan de laboratoire portrait et paysage), rendus des pages 1, 3, 12 et 17, PDF des tests moteur, captures `t1-*`.

Limite connue, inchangée : dans le navigateur, les rappels médicaux ne sont pas lisibles (stockage SQLite uniquement). L'export le signale clairement et demande de décocher la section.

## Tâche 2 : widget « Rappels médicaux »

- Retiré du tableau de bord, affiché dans la vue Clinique sous les cartes de synthèse. Le lien « Voir les rappels » ouvre toujours la liste des rappels médicaux.
- Deux zones libellées : « Situation » (En retard, Aujourd'hui, À venir) et « Prochaines échéances » (liste datée : date, patient, type). Les compteurs ne sont plus mélangés aux rappels.
- Mise en page en requête de conteneur : les zones s'empilent quand le widget est étroit.

Captures : `t2-*` (avant / après, thèmes clair et sombre). Le widget peuplé est rendu avec des données fictives, car les rappels médicaux n'existent qu'en SQLite.

## Tâche 3 : dialogue « Tâches de suivi »

- Modal élargi à 640 px ; colonne Type élargie (« Médicament » complet).
- Calendrier compact (cases de 36 px) ancré sous le champ date.
- Après création : écran de confirmation explicite (soin, jour, heure), compteur des propositions restantes, boutons « Planifier un autre soin » et « Voir les soins du patient ». La liste marque chaque soin « Planifié le … ». La redirection ouvre Clinique > Soins filtré sur le patient, à la date du soin planifié.

Captures : `t3-*`. Dans le navigateur, l'enregistrement d'un soin échoue (stockage SQLite uniquement, comportement existant) : pour la capture de confirmation, l'appel d'enregistrement a été remplacé temporairement dans l'onglet de test, sans modification du code. Le contenu transmis a été vérifié (`scheduledAt: 2026-10-18T08:00`, type médicament).

## Tâche 4 : sélecteurs de date

- Cause : les champs `type="date"` et `datetime-local` utilisent le sélecteur natif de WebKit, qui suit la langue du système (« Oct 2026 », « Su Mo… »).
- Nouveau composant `DatePicker` (calendrier de l'app, français, lundi en premier, format JJ/MM/AAAA, min/max, effacement pour les dates facultatives, validation « requis » conservée).
- Remplacés : 17 champs date (Rappels, Tâches, vaccination, pesée, date de naissance x2, export PDF x2, registre documentaire x2, factures, transactions, agenda récurrence, soins, suivi d'hospitalisation, report de rappel, admin activation) et 3 champs date+heure d'hospitalisation (date française + sélecteur d'heure existant).
- `Calendar` est désormais français et commence le lundi par défaut, partout.
- Cause des calendriers démesurés : les règles globales des tableaux du thème Premium (padding `!important` sur les `td`) s'appliquaient aux jours du calendrier. Neutralisées dans les calendriers uniquement.

Captures : `t4-*`.
