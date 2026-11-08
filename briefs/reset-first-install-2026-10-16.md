# Réinitialisation complète, build 3.3.22

Demande : section Réinitialisation dans Paramètres > Sauvegarde. Choix explicite de l’utilisateur : tout effacer et revenir à la première installation.

- Le composant existant était dans Sécurité. Il est désormais accessible dans Sauvegarde, sous le titre Réinitialisation, uniquement pour le rôle admin.
- Mot de passe administrateur actif vérifié par le service, puis confirmation exacte RÉINITIALISER. Aucune suppression si ces contrôles échouent.
- Sauvegarde automatique avant toute modification ; interruption si elle échoue.
- SQLite : reconstruction du schéma canonique 001–035 dans une transaction unique, avec conservation de la sauvegarde. Les données du cabinet, comptes, sessions, paramètres et activation locale sont supprimés. Seules les structures et valeurs initiales des migrations sont recréées. Erreur pendant la reconstruction : rollback du schéma, des triggers et des données précédentes.
- Préférences locales effacées puis rechargement de l’application : l’assistant de première installation est à nouveau requis, avec activation de la licence.
- Web : copie de sauvegarde avant remplacement du stockage, comptes et licence supprimés, données de démonstration non recréées après reset.
- Les sauvegardes restent disponibles. Les fichiers de modèles IA sont des ressources installées et restent sur le disque. Aucune révocation distante de licence.
- Aucun essai destructif sur la base réelle. Aucun push, tag ni publication.

Tests : garde administrateur et masquage pour tous les autres rôles ; confirmation incorrecte ; mot de passe refusé ; sauvegarde échouée ; reconstruction complète après les 35 migrations avec facture émise ; échec simulé avec rollback ; absence de réensemencement web. Contrôle visuel réel du chemin Sauvegarde et de l’activation du bouton seulement après les deux champs, sans soumettre le reset.

Validation finale : typecheck 0 ; lint 0/0 ; 740 tests applicatifs dans 96 fichiers et 13 tests du serveur de licences. Vingt-et-un contrôles UI réussis dans Chromium et WebKit.

Ajustement demandé pendant la livraison : suppression du séparateur au-dessus du footer ; bloc compte Premium encadré avec la gravure `board-frame` déjà utilisée dans les pages et ses traits dépassant aux angles. Avatar, nom et actions du menu conservés ; vérification clair/sombre et repli sans débordement.
