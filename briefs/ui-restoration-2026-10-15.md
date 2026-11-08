# Restauration fonctionnelle après la refonte Premium

## Priorité et frontière

Demande du 15 octobre 2026 : restaurer les fonctionnalités existantes, puis appliquer les styles autour des composants et parcours conservés. Aucun reset Git global : HEAD est encore en version 3.3.12 et ne contient pas plusieurs fonctionnalités récentes, présentes dans les fichiers de travail. Un checkout global supprimerait précisément les modules à protéger.

Sauvegarde avant intervention : `outputs/ui-restoration-2026-10-15/source-before-restoration.tar.gz`, état Git, patch complet et empreintes des sources. Aucune donnée SQLite du cabinet modifiée.

## REA de la restauration

- Ressources : espace clinique existant (Dossiers, Consultations, Soins, Hospitalisation), composants métiers et registres actuels, tokens Premium opt-in. Inventorier les sources de présentation séparément des services, migrations et modèles.
- Événements : navigation principale et raccourcis, ouverture depuis un patient ou un soin de l’Agenda, filtres, formulaires et validations existantes. Leur présence dans les fichiers ne prouve pas leur accessibilité : vérifier les parcours rendus.
- Agents : vétérinaire et équipe doivent retrouver tous les parcours avant de considérer le style validé. Les données et migrations du chantier Produits restent protégées.

## Défaut confirmé

`view-registry.tsx` envoyait `clinique` vers `CliniquePage`, la page de consultations seule. `ClinicalWorkspace`, contenant les quatre onglets, restait limité à l’ancienne route `soins`. Cette rupture masque Dossiers, Soins, Hospitalisation et les requêtes de focus venant du dossier patient ou de l’Agenda. Rétablir l’espace commun sur la route Clinique et conserver les callbacks actuels.

## Matrice d’audit

Tableau de bord, Patients et dossier, Agenda, Clinique et ses quatre sections, Rappels et types, Documents et assistant/modèles, Produits et ses six onglets, Finances et Analyse, Équipe. Vérifier présence, navigation et ouverture des commandes sur une base isolée, puis tester Classique/Premium et clair/sombre. Le bilan distinguera les fonctionnalités restaurées de celles simplement vérifiées.

## Fonctionnalités rétablies

- Route Clinique vers l’espace complet : Dossiers, Consultations, Soins et Hospitalisation coexistent à nouveau. L’ancienne route Soins reste compatible.
- Liens dossier patient vers les soins filtrés et Agenda vers le détail du soin. Consommation unique des demandes de focus, pour éviter la réouverture d’un ancien soin lors du retour dans Clinique.
- Accès « Réorganiser les widgets » depuis les paramètres en Premium : l’éditeur de disposition existant est de nouveau rendu.

## Harmonisation demandée pendant la restauration

Premium uniquement : navigation clinique gravée, bandeau de métriques Soins, filtres avec sélection lisible, recherche/date regroupées, lignes de soins lisibles et alerte latérale. Hospitalisation : onglets, cartes de séjours et emplacements, détail et surveillance harmonisés. Dossier sélectionné de consultation : marges et en-têtes cohérents. Dossier patient : widgets, identité, propriétaire, huit onglets sur grille sans défilement horizontal, chronologie avec action Note clinique entière. Aperçu latéral : trois vues conservées et mêmes panneaux. SOAP : quatre surfaces de saisie, en-têtes à motif et actions alignées. Les boutons Retour / Soins sont dans une rangée commune. Les bandes de consultation et d’identité sont contenues dans leur cadre.

Le motif reste limité aux en-têtes, les champs et lignes de données conservent un fond lisible. Les mascottes sont inchangées. Les règles sont sous le sélecteur Premium ; Classique conserve sa présentation. Le regroupement des deux boutons corrige leur alignement dans les deux styles.

## Parcours audités

| Module | Contrôles réalisés |
|---|---|
| Tableau de bord | Vue classique, journée clinique, personnalisation des widgets |
| Patients | Nouveau patient, aperçu et ses trois vues, ouverture du dossier, huit rubriques, accès aux soins filtrés |
| Agenda | Quatre modes présents, ouverture rendez-vous, piste des soins et lien vers leur détail |
| Clinique | Quatre sections, modes de soins par patient/par heure, recherche patient du formulaire, admission, emplacements, détail séjour et constantes |
| Rappels | En cours, À venir, Terminés, Appels du jour, Types de rappels ; tests des rappels manuels/médicaux et des compteurs |
| Documents | Bibliothèque, modèles, assistant et navigation entre espaces |
| Produits | Catalogue, Mouvements, Inventaire, Lots, Approvisionnements, Opérations ; chargement de chaque onglet |
| Finances | Factures, Journal, Analyse et ouverture des formulaires existants |
| Équipe | Liste des membres et accès aux formulaires de création/modification |

Les parcours UI sont exécutés sur une copie locale de la base, avec un utilisateur de test authentifié par le banc d’essai. Les données de notes existantes sont lues dans cette copie ; aucune note n’est modifiée pendant le contrôle visuel. La date du banc d’essai est fixée au 15 octobre 2026 pour éviter que le passage de minuit ne change les listes du jour. Pas d’écriture dans la base du cabinet. Les commandes métier de validation, facturation, stock et rollback sont couvertes par les tests de services existants ; l’audit UI n’équivaut pas à une exécution destructive exhaustive en production.

## Vérifications

- Typecheck : 0 erreur.
- ESLint : 0 erreur, 0 avertissement. Suppression de symboles inutilisés, sans retirer de rendu actif.
- Vitest : 712 tests passés, 91 fichiers. Deux nouveaux tests vérifient les routes Clinique et Soins et la conservation du callback patient.
- Licences : 13 tests passés séparément.
- Parcours Chromium : 67 contrôles passés. Parcours WebKit : les mêmes 67 contrôles passés, pas 134 scénarios distincts.
- Cinq largeurs contrôlées : 600, 768, 1000, 1280, 1440 px, sans débordement des onglets, de la chronologie et de la page.
- Note existante chargée dans les quatre rubriques SOAP, valeurs conservées après changement de thème.
- Build frontend réussi. Avertissement Vite existant concernant les gros chunks ; pas d’échec de build.
- JavaScript de démarrage : 275,9 ko gzip, sous la limite de 300 ko.

La comparaison de sources avec la sauvegarde initiale ne relève aucune modification de service métier, schéma, migration ni store. Une comparaison de priorité dans Rappels a été réécrite avec includes pour lever TS2367 tout en conservant exactement le comportement urgent/high. Les deux anciens tests de rendu des rappels acceptent les classes CSS supplémentaires, tout en conservant leurs assertions de compteurs et de lignes affichées.

## Inventaire et preuves

- `outputs/ui-restoration-2026-10-15/file-inventory.md` : inventaire complet des fichiers de travail, séparant présentation, fichiers mixtes et services protégés. Il ne faut pas attribuer tous les fichiers mixtes à la refonte Premium.
- `outputs/ui-restoration-2026-10-15/restoration-only.patch` : diff de cette seule intervention par rapport à la sauvegarde, y compris les fichiers déjà non suivis par Git.
- `outputs/ui-restoration-2026-10-15/restoration-changed-files.json` : liste exacte des fichiers touchés pendant cette restauration.
- Galerie locale : `/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/ui-restoration-2026-10-15/index.html`. Avant : captures fournies par l’utilisateur, aux dimensions de sa fenêtre. Après : captures sur base isolée, dimensions indiquées. Pas de capture avant inventée pour Hospitalisation.

Cette intervention ne produit pas de nouvel installeur macOS : les changements sont dans le code utilisé en Tauri dev et le frontend de production a été compilé.
