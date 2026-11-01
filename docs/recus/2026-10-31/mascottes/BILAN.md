# Mascottes au trait, vivantes dans la barre latérale

Le 31/10/2026, à la demande d'Aissa. Les captures viennent d'une copie de la base réelle, en Clean et en Premium, clair et sombre :

- `avant/` : le commit acc29eb (peluches vectorielles, logo par défaut) ;
- `apres/` : ce changement.

Chaque jeu a son fichier `mesures.json`.

## La matière brute

- **Le trait de référence :** les deux animaux de la page de connexion (`auth-peeking-pets.tsx`). Un seul trait d'encre de 5 sur 220 (2,3 %), des aplats papier, une ou deux formes noires, du rose pour les joues et la langue seulement.
- **L'existant :** cinq animaux proposés (chat, chien, vache, fennec, lapin) et le logo classique, soit six choix dans les Paramètres. Six anciens noms restent relus (dog, cat, rabbit, fox, panda, bear). Les dessins étaient des « peluches » vectorielles animées avec framer-motion, et le logo était le choix par défaut.

## Les douze

| Repris dans le trait | Ajoutés |
| --- | --- |
| Chien (par défaut) | Cheval |
| Chat | Mouton |
| Lapin | Chèvre |
| Fennec | Hamster (les pattes tiennent une graine devant le cercle) |
| Vache | Perroquet |
| | Hérisson |
| | Tortue |

Les cinq animaux proposés ont été redessinés et sept ont été ajoutés : douze au total, plus le logo classique, qui reste possible. Les anciens noms enregistrés sont relus comme l'un des douze (« dog » devient « chien »).

**Le choix des ajouts :** les espèces d'une clinique vétérinaire en Algérie.
- **Rurales :** cheval, mouton, chèvre.
- **NAC :** hamster, perroquet, hérisson, tortue.

**Le trait :** 3 sur 120 (2,5 %), les arrondis et les aplats de la page de connexion. Un seul fichier de dessins, `line-mascots.tsx` : chaque animal est une donnée (oreilles, tête, marques, museau, avant-plan), et le visage est commun.

**Le cadre :** un cercle de rayon 46 sur 120.
- **Ce qui peut en sortir :** oreilles, cornes, crinière, crête, piquants, carapace, pattes du hamster, barbe de la chèvre.
- **Ce qui n'en sort jamais :** les épaules, coupées au bas du cercle.

## Les émotions

| Humeur | Yeux | Bouche | Quand |
| --- | --- | --- | --- |
| Neutre | pupilles qui suivent la souris | petit sourire | par défaut |
| Joyeux | arcs fermés (avec un liseré papier, pour rester lisibles sur la tache du chien) | bouche ouverte, langue | au survol de la mascotte |
| Réflexion | regard en haut à droite, un sourcil levé | bouche de travers | après 25 s sans mouvement de souris ; la mascotte revient au neutre au premier mouvement |

L'assistant garde sa propre humeur (il réfléchit pendant qu'il travaille) : `MascotAvatar` transmet celle que l'app impose.

## La vie dans la barre latérale

- **Les yeux** suivent la souris dans toute la fenêtre. La pupille avance d'au plus 2,2 unités dans un œil de 5,6 × 6,2 : elle reste dans l'œil (mesuré : ±2,19). Juste sur le visage, les yeux bougent peu ; à 90 px et au-delà, ils atteignent le bord. La tête suit d'un léger penché (4° au plus). Le suivi passe par une constante de temps de 0,14 s, doux, sans à-coups.
- **Au repos :**
  - une respiration lente (4,4 s) ;
  - un clignement toutes les 3 à 6 s, parfois double ;
  - une oreille qui frémit toutes les 7 à 14 s.
- **Le débordement :** la mascotte est dessinée à 68 px dans une boîte de 56 px, la même qu'avant ; la tête et les oreilles sortent du cercle par le haut. L'en-tête garde sa hauteur et le menu ne bouge pas (mesures plus bas).
- **Barre réduite aux icônes :** la mascotte passe à 44 px dans une boîte de 42, entièrement dans son cercle. Elle garde les yeux vivants.
- **Les couleurs :** la mascotte prend l'encre et le fond de la barre latérale, pas ceux de la page. En Clean clair, la barre est sombre : le chien y est blanc sur noir, comme la page de connexion en sombre.

**Technique.**
- Les animations n'utilisent que des transformations.
- La boucle `requestAnimationFrame` ne tourne que pendant que les yeux voyagent : elle s'arrête quand ils sont posés, puis reprend au mouvement suivant.
- La respiration est une animation CSS, prise en charge par le compositeur.
- Tout s'arrête quand la fenêtre est cachée (`visibilitychange`) : boucle, minuteries des clignements et des oreilles.
- Avec « réduire les animations », il n'y a ni écouteur ni boucle ; la mascotte est immobile, les yeux fixes, le visage neutre.

**Les Paramètres.** Les douze portraits et le logo sont dans Apparence, réglage propre à ce poste comme le thème et la police (stockage local). Les douze portraits du choix sont immobiles : douze visages qui suivent la souris feraient une foule. L'aperçu, lui, est vivant.

## Mesures

Mesuré dans la page, pour les 4 apparences, avant et après (`mesures.json`) :

| Mesure | Avant | Après |
| --- | --- | --- |
| Hauteur de l'en-tête de la barre latérale, déployée | 74 px | 74 px |
| Hauteur de l'en-tête, réduite aux icônes | 106 px | 106 px |
| Position et taille des 26 éléments du menu | référence | identiques au pixel, dans les deux états |
| Défilement horizontal de la page | 0 | 0 |
| Déplacement maximal d'une pupille | — | 2,2 unités (limite 2,2 : elle reste dans l'œil) |

**Balayage de 3 s** (la souris parcourt la fenêtre, les yeux suivent), sur ce Mac :

| Apparence | Images | Moyenne | 95 % | Pire | Au-delà de 20 ms |
| --- | --- | --- | --- | --- | --- |
| Clean clair | 180 | 16,7 ms | 18,3 ms | 18,8 ms | 0 |
| Clean sombre | 180 | 16,7 ms | 18,1 ms | 18,7 ms | 0 |
| Premium clair | 180 | 16,7 ms | 18,4 ms | 18,7 ms | 0 |
| Premium sombre | 180 | 16,7 ms | 18,3 ms | 18,9 ms | 0 |

Aucune image perdue à 60 i/s. Je n'ai donc rien retiré pour des raisons de performance.

**Captures (`apres/`) :**
- `repos` ;
- `yeux-gauche`, `yeux-droite`, `yeux-haut`, `yeux-bas` ;
- `clignement` ;
- `joyeux`, `neutre`, `reflexion` ;
- `replie` ;
- `parametres`.

`planches/tous-etats.jpg` les met côte à côte : une ligne par apparence, dans l'ordre Clean clair, Clean sombre, Premium clair, Premium sombre.

**Regard à gauche et en haut :** la mascotte est à 60 px du bord gauche et à 50 px du haut de la fenêtre. La souris ne peut pas s'en éloigner davantage de ce côté, donc les pupilles y vont moins loin (1,4 unité). Elles atteignent le bord de l'œil à droite et en bas.

**Corrigé avant ce commit :**
- La réécriture de l'avatar avait supprimé le seul import de `mascot.css`. La mascotte sortait grise sur la barre latérale sombre (encre mesurée #292929 sur fond transparent). L'import est rétabli ; encre mesurée ensuite : #f3f3f5 sur #0c0d0f en Clean.
- L'œil joyeux posé sur la tache noire du chien disparaissait ; il a maintenant un liseré papier.

## Portes

- `tsc` : 0. `eslint` : 0. `vitest` : 176 fichiers, 1 365 tests verts.
- **Tests ajoutés :**
  - `tests/mascot-line-art.test.tsx` : pour chaque animal, deux pupilles mobiles, les trois humeurs, le trait de la page de connexion ; le cercle ouvert ou fermé ;
  - `tests/mascot.test.ts` : le chien par défaut, les douze choix, les anciens noms relus.
- **Retiré :** le moteur des peluches (framer-motion, environ 600 lignes) et son CSS, que plus rien n'utilisait.

## Ce que les captures ne prouvent pas

- **« Réduire les animations » :** non capturé. La vue web de capture ne permet pas de basculer la préférence du système. Le chemin est dans le code (aucun écouteur, aucune boucle, `data-still`) et dans la règle CSS `prefers-reduced-motion`.
- **Une machine de 8 Go :** non mesurée. Le balayage a été mesuré sur ce Mac seulement. La boucle ne fait que deux transformations par image, et s'arrête au repos.
- **Le clignement :** capturé en posant l'attribut. Son déclenchement aléatoire n'est pas photographié.
- **La réflexion :** venue toute seule après 26 s sans mouvement dans le premier passage (Clean clair) ; posée pour la capture dans les trois autres.
- **Le cas « fenêtre cachée » :** dans le code (`visibilitychange`), pas mesuré.
- **Les états vides et le panneau de l'assistant** utilisent le même portrait, mais n'ont pas été capturés.
