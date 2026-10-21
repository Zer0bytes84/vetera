# Module Documents : la bibliothèque rejoint le socle

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

Documents n'a ni indicateurs ni données périssables à dater. Le traitement porte donc sur la bibliothèque, la seule liste du module, qui était restée hors du socle (voir le bilan du socle).

- **Survol en pastille.** Le même palier de ton que les autres listes remplace le survol blanc propre à la page. Il apparaît tout de suite et s'efface en 150 ms. Le document ouvert garde son fond.
- **Menu « ⋮ » révélé.** Il n'apparaît qu'au survol, au clavier ou au focus, au lieu d'être répété sur chaque ligne. Il reste toujours visible sur un écran tactile. L'étoile des favoris et l'épingle restent affichées.
- **Curseur clavier commun.**
  - ↑ ↓ parcourent les documents et Entrée ouvre le document courant.
  - Le dernier document ouvert redevient courant au retour.
  - Pendant la saisie dans l'éditeur, les flèches restent à l'éditeur.

Rien n'est retiré : toutes les actions du menu (favori, épingle, dupliquer, suivi clinique, export, suppression) sont inchangées.

## Vérification dans l'instance de test

1. Survol de « Protocoles vaccination » : la pastille et le « ⋮ » apparaissent sur cette ligne seulement.
2. Souris hors de la liste, puis ↓ ↓ : le curseur se pose sur la deuxième ligne.
3. Entrée : « Protocoles vaccination » s'ouvre.

## Captures

Données de démonstration, 1440 × 900.
- `avant/documents-clair` : chaque ligne montre son « ⋮ ».
- `apres/` :
  - `documents-survol` : survol en clair ;
  - `documents-survol-sombre` : survol en sombre ;
  - `documents-clavier` : curseur au clavier ;
  - `documents-ouvert` : document ouvert par Entrée.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 149 fichiers, 1 116 tests verts. La mécanique du curseur est couverte par `tests/interaction-charter.test.ts`, et vérifiée ici à l'écran.
