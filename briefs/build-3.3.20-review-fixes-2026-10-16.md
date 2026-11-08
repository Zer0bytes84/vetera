# Correctifs de la revue 3.3.20

Périmètre : neuf retours utilisateurs. Aucun push, tag ni publication.

## Analyse REA visuelle avant les styles
Ressources : tokens Premium existants, gravure `--hair-*`, surfaces `--surface`, motif `--band`, formulaires et composants existants.
Événements : onglets Sécurité et Cabinet, saisie, sauvegarde, aperçu PDF, erreurs et confirmation de réinitialisation. Chaque action existante est conservée.
Agents : vétérinaire pour ses coordonnées et son mot de passe ; administrateur pour licences et réinitialisation. Aucun rôle implicite dans le formulaire Équipe.
Application : en-têtes gravés avec bande existante, formulaires lisibles, champs de hauteur cohérente, marges communes. Styles limités aux deux sections Premium, compatibles clair et sombre.

## Causes
- Cloche omise de la branche Premium du header.
- Gestion des licences accessible depuis À propos et par URL directe sans garde de rôle local.
- Liste des licences vide avant authentification serveur, présentée comme résultat synchronisé.
- Rôle stagiaire initialisé et utilisé comme valeur de secours.
- Migrations 031 à 035 présentes dans le registre courant. Une application antérieure doit refuser une base plus récente sans modifier ses données, avec un message français indiquant la mise à jour.

## Réinitialisation
Données métier supprimées uniquement après confirmation et authentification administrateur. Comptes, sessions, paramètres, activation et registre des migrations conservés. Sauvegarde préalable obligatoire. SQLite : transaction exclusive à la file d’opérations, contrôle d’intégrité et rollback en cas d’échec. Web : copie locale avant remplacement atomique du stockage. Aucun essai destructif sur la base réelle.

## Livraison et vérification
- Cloche visible et centre de notifications conservé dans le header Premium.
- Trois actions « Télécharger » utilisent l’installation existante, qui installe uniquement les outils manquants. L’import manuel reste accessible dans les options de téléchargement.
- Sécurité et Cabinet & factures : formulaires conservés, habillage Gravure Premium clair/sombre.
- Nouveau membre : choix de rôle obligatoire, aucune attribution implicite.
- Centre d’activation : entrée visible uniquement aux administrateurs ; fenêtre, URL directe et requêtes de gestion protégées par une session active et le rôle stocké. Le jeton du serveur reste nécessaire et n’est pas persisté.
- Authentification : suppression de la connexion automatique au premier compte et du compte de secours créé sans saisie. Les sessions valides restent reconnues, y compris les vétérinaires adjoints. Les sessions absentes, expirées et les comptes inactifs doivent se reconnecter.
- Licences : absence d’authentification et échec de synchronisation ne sont plus présentés comme une liste vide. Les filtres sont réinitialisés après création ; l’origine réellement configurée remplace l’étiquette locale trompeuse. Trois enregistrements existent dans le fichier local, alors que le serveur configuré est distant. Le contenu de ce serveur n’a pas été vérifié avec son jeton administrateur ; aucune licence n’a été créée, supprimée ou déplacée pendant cette intervention.
- Réinitialisation : conservation également des types de rappels, emplacements et séquences de numérotation. Les contraintes d’immutabilité sont suspendues uniquement dans la transaction de réinitialisation et leurs définitions exactes restaurées avant commit. Un échec de suppression restaure données et triggers. Aucun essai destructif sur les données réelles.
- Migrations : base réelle inspectée en lecture seule, versions 001 à 035. Registre courant complet ; tests de mise à niveau 030 → 035 et de réouverture idempotente, avec conservation des dossiers. Les schémas inconnus restent refusés, avec une explication française demandant une mise à jour et confirmant la conservation des données.

Résultats : typecheck 0 erreur ; lint 0 erreur / 0 avertissement ; 734 tests applicatifs dans 95 fichiers ; 13 tests du serveur de licences ; build frontend réussie. Quinze contrôles UI réussis sur Chromium et les mêmes quinze sur WebKit, base isolée et réseau de licences simulé. Captures en clair et sombre dans la galerie `review-3.3.20`.
Build locale Apple Silicon préparée en version 3.3.21. Aucun push, tag, publication ni installation dans /Applications.

La réinitialisation web désactive le réensemencement automatique des données de démonstration ; ce comportement est testé.
