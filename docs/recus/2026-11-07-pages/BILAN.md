# Phase 2 : en-têtes, blocs et tableaux des pages (7 novembre 2026)

Réhabillage, pas refonte : chaque bouton, onglet et action garde sa fonction. Tout est vérifié dans l'application (navigateur, données de test), Clean clair sauf mention contraire.

## Ce qui a changé

**En-têtes de page.** Une ligne « Titre : note » (Patients : liste du cabinet, Produits, Factures, Documents…), sans séparateur dessous, boutons en pilules à droite.

**Première rangée.** Même surface que le tableau de bord : bande grise d'en-tête (icône, titre, sous-titre), cartes blanches dessous (Patients, Produits, Factures, Documents).

**Tableaux.** Le Data Table TuffUI adapté à nos jetons sur Patients, Produits/Inventaire, Registre des factures et liste des Documents ; colonnes numériques alignées à droite (écart mesuré : 0 px).

**Dossier patient.**
- Clic sur un patient : le dossier complet s'ouvre directement, sans panneau intermédiaire.
- En-tête d'une ligne : avatar à gauche du nom, ID et statut, puis la ligne de contexte (allergie en premier, contention, espèce, race, sexe, âge, propriétaire et téléphone, solde à la fin en ambre ou rouge).
- « Chiffres clés » : quatre cartes séparées par des filets ; dans la bande, « Modifier », « Actions » (menu : Modifier le dossier en premier, puis Note hors visite, Planifier un rendez-vous, Ouvrir les soins, Exporter en PDF, Carnet de santé) et « Note clinique », trois boutons de même taille (132 × 32).
- « Dossier médical » : rail vertical de sept sections ; chaque icône dans une pastille de sa couleur, section active en ligne teintée arrondie, compteur discret quand la section a des éléments (rien à zéro), liste centrée, sans séparateur.
- Chronologie en colonnes fixes (date | type | motif et plan | pièces et actions), chaque événement en carte bordée, couleur par type.
- « Informations permanentes » : quatre cartes blanches (Identité, Propriétaire, Notes générales, Complétude du dossier).
- Jamais « Na » : un champ vide dit « Non renseigné » ou ne s'affiche pas (`meaningful()`, testé).

**Écran Consultation.** Barre « Consultation · nom » et son séparateur supprimés ; la note est une surface « Note clinique » (sous-titre SOAP et état d'enregistrement), boutons en pilules dans la bande ; Subjectif, Objectif, Analyse, Plan en cartes blanches bordées, icône dans sa couleur ; « Générer les tâches de suivi » et « Valider la note » regroupés à droite en bas. Une section qui ne contient qu'un « Na » s'ouvre vide (le texte stocké n'est remplacé qu'au prochain enregistrement réel). « Produits utilisés » passe en surface avec le formulaire dans une carte bordée.

**Documents.** Première rangée en surface (documents du cabinet, récents, épinglés), liste en Data Table avec recherche et filtres ; éditeur, assistant et modèles inchangés.

**En-tête de l'application.** Séparateur fin entre les icônes et l'avatar, à 10 px de chaque côté, comme celui après le bouton de la barre latérale.

## Vérification

`rt-pages.json` : 56 contrôles, 0 échec, 0 erreur de page. Trois patients (avec allergie, sans données, très rempli) : pas de « Na », contexte jamais tronqué, allergie en premier, pièces alignées à droite, événements sans grand blanc, boutons de même taille. Chaque action du dossier ouverte une à une, les sept onglets, la flèche du clavier, et les modes de la page Documents.

Captures quatre thèmes du dossier : `dossier/`. Avant : `avant/`. `iter/` est un brouillon de travail, non versionné.

`tsc`, `eslint` et la suite de tests : voir le message de commit.

## Limites connues

- « Produits utilisés » ne s'affiche que dans l'application de bureau : le nouvel habillage est codé mais n'a pas été vu dans un navigateur.
- L'écran Consultation du tableau Flux n'a pas pu être ouvert avec les données de test du navigateur (les changements d'étape n'y persistent pas) ; son en-tête est le même composant que celui du dossier, vérifié là.
- Le menu « Modifier le dossier » ouvre bien l'éditeur ; le contrôle automatique l'a lu de travers (l'éditeur s'ouvre en place, pas en fenêtre).
- L'en-tête du dossier perdait sa mise en page quand on arrivait directement sur le dossier (lien, recherche) : sa feuille de style n'était chargée que par une autre page. Corrigé (`patient-header.tsx` l'importe).
- Un reformatage prettier a touché plusieurs fichiers de `src/modules/patients/components/` : différences de forme seulement, signalées pour la relecture.
- Tableaux non convertis : Journal, liste des Rappels, lots et mouvements de stock, cartes de l'Équipe.
