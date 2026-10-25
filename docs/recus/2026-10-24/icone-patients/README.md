# Icône de la page Patients : le carnet de santé

Date : 24 octobre 2026. Commit local, aucun push.

## Le choix

La patte déplaisait au vétérinaire : ses pastilles pleines détonnaient à côté des icônes au trait fin de la barre latérale. Sept candidates de la même famille (Lucide, trait de 1 px, 16 px) ont été posées dans la vraie barre (`planche-candidates.png`). Le choix s'est porté sur **E, le carnet de santé** (`book-heart`) : un carnet marqué d'un cœur, qui dit « dossier médical de l'animal ».

## Ce qui change (Clean seulement)

- La substitution d'icône de Clean pour Patients passe de `--clean-icon-paw-print` à `--clean-icon-book-heart`, au même trait que les autres substitutions.
- Elle s'applique aux deux endroits où la patte apparaissait : l'entrée Patients de la barre latérale et l'icône du titre de la page Patients.
- Le test de charte qui liste les substitutions est mis à jour en conséquence.

Rien d'autre ne bouge : Premium garde son stéthoscope, aucun composant n'est modifié.

## Captures

- `planche-candidates.png` : les sept candidates et l'icône d'avant, dans la barre.
- `avant/patients-*` : la page Patients avec la patte (captures de la session UI), en clair et en sombre.
- `apres/patients-*` et `apres/zoom-*` : la page et le détail de la barre et du titre, avec le carnet, en clair et en sombre.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte).
- Non vérifié dans la fenêtre Tauri (WebKit).
