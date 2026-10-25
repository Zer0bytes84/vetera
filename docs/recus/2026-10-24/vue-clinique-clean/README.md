# Vue Clinique du tableau de bord, passée au thème Clean

Date : 24 octobre 2026. Commit local, aucun push. Demande : « revoir la vue clinique et l'adapter à la même philosophie de design que le thème Clean, car elle demeure sous l'ancien thème ».

## Le constat

La vue Clinique (le second bouton du basculeur, à côté de « Nouveau patient ») gardait la composition gravée de Premium, définie dans `premium-workspace.css` :
- des cadres sans fond ni arrondi, aux filets doublés, qui dépassaient de 10 px pour se croiser aux angles ;
- des onglets filetés ;
- des titres en police d'affichage.

La vue Analytique, elle, était déjà en cartes Clean. Les deux vues d'un même écran ne parlaient donc pas la même langue.

## Ce qui change (Clean clair et sombre seulement)

Un seul bloc dans `src/design-system/clean.css`, sous la portée `:root[data-skin="clean"] .premium-clinical-overview`. Aucun composant ni jeton n'est modifié, et Premium reste identique.

- **Cartes** : chaque bloc (Maintenant, Planning des visites, Actions à suivre, Suivi des patients, Trésorerie, Tendances) devient une carte blanche, avec un seul filet et des coins de 10 px. Plus de croisements ni de filets doubles.
- **Espacements** : 24 px entre les rangées, 16 px entre les cartes d'une rangée, 16 px de marge intérieure, comme la vue Analytique.
- **En-têtes de carte** : titre en 14 px semi-gras dans l'encre forte, sous-titre discret, un filet léger dessous. Le premier bloc garde 16 px d'air sous l'en-tête.
- **Chiffres** (rendez-vous, en attente, terminés ; patients actifs ; trésorerie) : 24 px semi-gras, séparés par le filet léger.
- **Filtres** (Toutes, À recevoir… ; Tout, Tâches… ; 30 jours, 90 jours) : l'interrupteur segmenté des autres écrans Clean (piste de 32 px, élément choisi en feuille blanche).
- **Visite en cours** : la vignette du patient prend le ton de la piste, le nom passe en 18 px semi-gras et la barre d'avancement repose sur la même piste.

## Ce qui ne change pas

- **Contenu et comportement** : mêmes blocs, mêmes boutons, mêmes liens (Ouvrir Flux, Dans Flux, Agenda, Rappels, Dossiers, Voir les finances), mêmes filtres. Le tunnel arrivé, attente, visite passe toujours par Flux.
- **Navigation clavier et mascottes** : inchangées.
- **Couleurs** : variables de la charte uniquement, aucune couleur codée en dur, aucun `transition-all`.

## Captures

Elles sont prises dans l'instance de test isolée (données de démonstration), en 1440 × 900 rétina, mascotte réglée sur « logo ». Chaque série couvre le haut, le milieu et le bas de la vue :
- `avant/clinique-1` à `4`, en clair et en sombre ;
- `apres/clinique-1` à `4`, en clair et en sombre.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts**. C'est le compte du dépôt après les commits de la session Gemma 4 ; aucun test n'a été ajouté ici.
- Les chartes de Clean et des interactions, ainsi que l'échelle typographique, passent : le nom du patient en cours a été ramené de 20 à 18 px pour rester sur l'échelle.

## Reste à faire

- **Non vérifié dans la fenêtre Tauri (WebKit).**
- **Badges d'état** des lignes (Terminé, Hospitalisé, Traitement) : ils gardent le traitement Clean commun (pastilles teintées), sans le liseré ajouté à la liste des patients. Les aligner serait un petit lot séparé.
