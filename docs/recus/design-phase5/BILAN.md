# Audit design, phase 5 : pages restantes

Aucun commit. Vérifications : `npm run typecheck` 0 erreur, ESLint 0 erreur 0 avertissement, Vitest 117 fichiers et 909 tests réussis (3 nouveaux). Captures : `avant/` (état à la fin de la phase 4) et `apres/`, thème clair Premium, 1440 px.

## Tableau de bord

1. **Accueil** : le prénom ignore les civilités (Dr, Pr, Mme, Mlle, M.) : « Dr Lina Ait Salem » donne « Lina » (`firstNameOf`, testé). Le titre est à 24 px (mesuré). Avec le compte de test « Dr Audit », l'accueil dit « Bonjour Audit », faute d'autre prénom.
2. **Gestion du cabinet** : le compteur passe à droite, sur la ligne de l'icône, en 12 px #7F7F7F. Les deux tuiles sans valeur chiffrée (« Séjours actifs », « Bilan en direct ») n'affichent plus de compteur du tout. Je n'ai pas branché le nombre de séjours : il exige une lecture SQLite supplémentaire sur le tableau de bord, à décider séparément.
3. **Liste du jour** : la puce n'affiche que le type d'acte, avec la couleur par type de l'Agenda (même carte `APPOINTMENT_TYPE_META`) au lieu de « Nala - Vaccin » coloré par statut.
4. **Graphique** : les graduations gardent au moins 76 px d'écart ; la dernière date remplace sa voisine si elle est trop proche. Avant : « 13 oct. » et « 16 oct. » se chevauchaient.

## Patients

1. « Réinitialiser » devient « Réinitialiser les filtres » et passe en fin de barre de filtres, toujours visible (le bouton conditionnel existant et celui de l'en-tête sont fusionnés, même action).
2. Double cadre supprimé : le tableau n'a plus de bordure extérieure ni de coins arrondis dans la carte.

## Rappels

1. **Une seule ligne** : segmenté de source à gauche, onglets d'état, bouton « Gérer les types », puis le périmètre (Mes rappels / Toute l'équipe) et la recherche à droite. « Types » n'est plus un onglet : « Gérer les types » ouvre le même écran (vérifié).
2. **En-tête** : la liste « Mes rappels » quitte l'en-tête pour la barre de filtres. Le bouton « Rappel médical » reste seul dans l'en-tête.

## Documents

« Afficher » a une largeur minimale de 160 px (maximale 260 px) : « Tous les dossiers » n'est plus tronqué.

## Produits

Nom retenu : **Produits** (barre latérale, fil d'Ariane et traductions le disaient déjà). « Pharmacie & Stock » est remplacé dans le titre de page, la tuile du tableau de bord, la palette de commandes et la recherche de documents. Je n'ai pas touché au libellé enregistré dans l'index de recherche (donnée stockée, utilisée par un test existant).

## Finances

1. **Registre** : une rangée flexible : recherche extensible, puis Filtrer, puis Dates.
2. **Bouton « Analyse »** : icône de graphique à la place du chevron.

## Équipe

1. **Cartes** : les trois actions (réinitialiser le mot de passe, modifier le rôle / statut, supprimer) sont dans un menu « … », mêmes droits qu'avant (menu réservé à ceux qui gèrent l'équipe, suppression absente pour le compte propriétaire). Le nom du membre garde toute la largeur.
2. **Annuaire** : un seul compteur (« 3 membres »). L'indicateur « Équipe active » des cartes de synthèse garde le décompte des actifs. Initiales sur fond #F5F5F5 au lieu d'émoji, la photo reste affichée quand le membre en a une. Les initiales ignorent aussi les civilités.

## Paramètres

1. **Menu** : colonne à 200 px, une seule ligne par entrée (« Modèles de documents » ne passe plus sur deux lignes, mesuré : 9 entrées à 40 px). Icônes distinctes : bâtiment (Cabinet & factures), cloche (Rappels médicaux), document (Modèles de documents), cercle « i » (À propos).
2. **Modèles de documents** : colonne « Statut » avec l'interrupteur seul, colonne « Actions » à part avec son en-tête visible (modifier, dupliquer, supprimer). Les rôles sans droit d'édition voient toujours le texte « Actif / Inactif ».
3. **Apparence** : 8 pastilles (Mist, Bleu, Émeraude, Violet, Rose, Ambre, Orange, Noir) au lieu de 10. Cyan et Teal restent valides pour les réglages déjà enregistrés et sont affichés tant que l'un d'eux est le choix courant.

## Notes

- `Parametres.tsx` a été reformaté par Prettier au passage : le diff de ce fichier est plus gros que le changement réel.
- Non vérifié ici : les listes SQLite (rappels médicaux, séjours, factures) dans `npm run tauri:dev`.
