# Nettoyage technique — octobre 2026

Le design validé, les flux métier, les données et les versions de dépendances sont conservés.

## Changements

- Découpage Vite explicite : les dépendances communes ne sont plus absorbées dans les chunks PDF, éditeur ou graphiques. Ces bibliothèques restent chargées à la demande.
- JavaScript initial de production : 2 192 478 → environ 763 000 octets ; gzip : 663 972 → environ 232 500 octets. Ces chiffres mesurent le préchargement initial, pas la totalité de l’application ni un temps de démarrage natif.
- `npm run check:startup` parcourt les imports statiques du manifeste de production et impose un budget de 300 kB gzip. Exécuter après `npm run build:strict`.
- `npm run typecheck` vérifie maintenant les deux projets TypeScript référencés. L’ancienne commande ne vérifiait pas les sources applicatives.
- Surveillance des fichiers par événements natifs plutôt que polling permanent. Pour un système de fichiers réseau qui l’exige : `VITE_USE_POLLING=true npm run tauri:dev`.
- Résumé de consultations : dépendance à la valeur de date ; absence de boucle de requêtes provoquée par `new Date()` à chaque rendu. Les rafraîchissements automatiques utilisent l’heure courante.
- Formateurs monétaires réutilisés ; index mensuel pour les agrégations ; colonnes du tableau stables ; suppression de constantes, paramètres locaux et directives lint inutilisés.
- Icônes d’espèce rendues par un composant stable dans l’agenda.
- Diagnostic de démarrage : texte brut dans un élément unique, sans réécriture du DOM React. Test de non-régression pour les erreurs répétées et les messages contenant du HTML.

## Vérifications

- 122 tests applicatifs et 13 tests d’activation passent. Les tests d’activation emploient une base temporaire et des licences fictives.
- Compilation TypeScript et production réussies ; contrôle du bundle réussi.
- Lint des sources : aucune erreur, sept avertissements restants, contre une erreur et 22 avertissements avant nettoyage.
- Navigation navigateur vérifiée : tableau de bord, patients, agenda, clinique, documents, produits, finances, rappels, équipe, paramètres ; aucune erreur de console relevée.
- Le processus Tauri du checkout reste ouvert et reçoit les modifications via Vite. La validation manuelle native reste à faire par l’utilisateur.

## Limites de cette passe

Les avertissements restants concernent des effets historiques de contexte dans l’ancien assistant, l’agenda et l’ancien éditeur, une animation de chargement, les rappels et l’API TanStack Table non compatible avec la mémorisation automatique du compilateur React. Ils ne sont pas masqués par des désactivations globales. Aucun module historique n’est supprimé sans preuve de son inutilisation ; aucun changement de schéma ou migration de données n’est effectué.

Les versions disponibles sur npm ont été vérifiées. Aucune mise à jour n’est retenue sans gain identifié qui justifie le risque de modifier l’éditeur, les graphiques, les ponts Tauri ou les modèles locaux déjà validés.
