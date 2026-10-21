# Socle commun du peaufinage (points 1 à 6)

Date : 21 octobre 2026. Trois commits locaux, aucun push : `3614b7a`, `c9bf1de` et celui de ce bilan.

## Ce qui change

1. **Vitesses.**
   - Nouveaux jetons : `--speed-highlight-in` (0 ms), `--speed-highlight-out` (150 ms), puis 100, 250 et 350 ms.
   - Un survol apparaît immédiatement et s'efface en 150 ms.
   - 135 survols CSS ne s'activent plus qu'avec une souris ou un pavé tactile (`(hover: hover) and (pointer: fine)`).
   - 60 `transition-all` et 7 `transition: all` remplacés par des propriétés nommées.
2. **Pas d'animation sur ce qui est fréquent.**
   - Menus, listes déroulantes, popovers, menus contextuels et palette ⌘K s'ouvrent sans animation.
   - Changer d'écran n'a plus d'animation d'entrée.
   - Le tableau de bord n'a plus d'entrée en cascade.
   - Les gestes fréquents (barre d'outils, notifications, cartes) passent à 150 ms.
   - Les panneaux rares (assistant, barre latérale, assistant d'installation) gardent leur durée.
3. **Survol en pastille.**
   - Un seul palier de ton (4 % d'encre en clair, 5 % de blanc en sombre), coins de 8 px.
   - Les actions secondaires d'une ligne apparaissent au survol, au clavier ou au focus. Sur un écran tactile, elles restent toujours visibles.
4. **Un seul curseur pour la souris et le clavier** (`useListCursor`).
   - Le survol rend une ligne courante, et ↑ ↓ partent de là.
   - Entrée ouvre la ligne, Espace ouvre l'aperçu (Patients), Échap efface le curseur.
   - La dernière ligne ouverte redevient courante au retour.
   - Branché sur Patients, Produits et Factures.
5. **Info-bulles.**
   - La première bulle attend 500 ms, les voisines s'ouvrent ensuite tout de suite.
   - Les `title` natifs qui doublaient les bulles sont retirés.
   - Paramètres a sa bulle.
   - Les actions de ligne Patients indiquent leur raccourci (Espace, Entrée).
6. **États vides.**
   - La mascotte remplace l'icône, en image fixe, quand la clinique a choisi une mascotte. En mode logo (le réglage par défaut), l'icône reste.
   - « Nouveau patient » affiche ⌘ N.
   - Appliqué à Patients, Produits et Finances (factures, écritures).

## Garde-fous ajoutés

`tests/interaction-charter.test.ts` vérifie quatre choses, plus le déplacement du curseur :
- les jetons de vitesse ;
- l'absence de `transition-all` ;
- que tout `:hover` CSS reste dans la requête « pointeur fin » ;
- que menus et palette n'ont pas d'animation.

## Écarts et choix à valider

- **J et K ne sont pas utilisés** : dans Baitari, J seul ouvre déjà l'assistant. La navigation se fait avec ↑ et ↓. Pour adopter J/K comme Linear, il faudrait déplacer le raccourci de l'assistant (par exemple ⌘J seul).
- **Rappels et Documents ne sont pas branchés** :
  - les lignes de Rappels ne sont pas cliquables, et ses données ne se chargent qu'avec SQLite ;
  - Documents est un éditeur.

  Les deux seront traités à leur étape.
- **Factures non vérifiées en navigateur** : la facturation ne fonctionne qu'avec SQLite. Le branchement est en place, mais pas vérifié à l'écran.

## Captures

`avant/` et `apres/` ont été prises dans une instance de test locale : données de démonstration du navigateur, licence et compte de test sur un serveur de licences isolé, 1440 × 900 en rétina. Aucune donnée réelle n'a été lue ni modifiée.
- `patients-survol` : survol de la souris.
- `patients-clavier` : trois appuis sur ↓, sans souris.
- `stock-clavier` : deux appuis sur ↓, le menu « … » de la ligne est révélé.
- `info-bulle-recherche` : la bulle après le délai.
- `palette` : la palette, pleinement affichée 150 ms après ⌘K.
- `patients-vide-mascotte` et `patients-vide-logo` : l'état vide dans les deux réglages.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 140 fichiers, 1 079 tests verts.
