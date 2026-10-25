# En-tête : fil d'Ariane retiré, recherche en pilule

Date : 24 octobre 2026. Commit local, aucun push. Référence : la barre de recherche de Dribbble (pilule arrondie, bouton rond intégré à droite), adaptée à Clean.

## Ce qui change

- **Fil d'Ariane retiré** de l'en-tête, sur toutes les pages (Premium et Clean). Le titre de chaque page reste dans la page elle-même.
- **Recherche en pilule**, alignée à gauche de l'en-tête, à l'ancienne place du fil d'Ariane :
  - 36 px de haut pour 300 px de large au plus (220 px au moins), entièrement arrondie ;
  - fond gris doux, la piste des interrupteurs segmentés de la charte (`--clean-segment-track`) ;
  - le texte indicatif à gauche, inchangé : « Rechercher un patient, une page… » ;
  - à droite, dans la pilule, un petit rond de 28 px porte ⌘K. Il est blanc en clair et légèrement éclairci en sombre, comme l'élément choisi d'un interrupteur segmenté (`--clean-segment-active`) : sobre, sans le rose de Dribbble.
  - Au survol, la pilule fonce d'un cran et ⌘K passe à l'encre forte. À l'appui, elle se tasse à 99 %, sauf en mouvement réduit.
- **Header étroit** : sous 560 px de large, la pilule redevient l'icône de recherche, comme avant.

## Ce qui ne change pas

- **La recherche** : un clic ou ⌘K ouvre la même palette.
- **Les icônes de droite** : thème, messages, notifications et avatar gardent leurs places et leurs actions.
- **Le reste** : aucune autre page modifiée. Variables de la charte uniquement, échelle typographique respectée (13 et 12 px), aucun `transition-all`.

## Captures

Instance de test isolée, 1440 × 900 rétina, en clair et en sombre :
- `avant/` : tableau de bord, Patients et la recherche survolée, avec le fil d'Ariane et le champ centré ;
- `apres/` : les mêmes vues avec la pilule.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte qu'avant).
- Non vérifié dans la fenêtre Tauri (WebKit).
