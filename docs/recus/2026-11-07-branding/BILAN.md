# Branding : « bAItari » et la nouvelle icône (7 novembre 2026)

## Un, le mot de la barre latérale

**Mot :** « bAItari ». « b » et « tari » gardent la couleur, la police, la graisse et la taille d'avant ; « AI » passe en dégradé bleu vers sarcelle, l'esprit de nos courbes. Au survol du mot, un reflet traverse les deux lettres, puis revient : 0,9 s, aucune animation si le système demande moins de mouvement. En contraste élevé de Windows, le texte reprend la couleur du système. Les lecteurs d'écran lisent toujours « Tableau de bord Baitari ».

**Couleurs mesurées.** Les teintes exactes des courbes tombaient sous le seuil de lecture à 18 px : le bleu à 4,1 : 1 sur la barre sombre, la sarcelle à 2,9 : 1 sur la barre claire de Premium. Même famille, ajustée à chaque fond :
- barres sombres (Clean clair et sombre, Premium sombre) : #3d9bff vers #2fb7a3, de 6,6 à 7,8 : 1 ;
- barre claire (Premium clair) : #0060c0 vers #0f7566, de 4,9 à 5,3 : 1.

**Centrage.** Mesuré sur les pixels dessinés, à l'échelle 3 :
- la mascotte, oreilles comprises, occupe de 7,7 à 64,0 px, milieu à 35,8 ;
- le mot était 0,7 px trop bas ; il est corrigé, écart à 0,0 px dans les quatre thèmes.

Captures : `avant/mot-barre-laterale.png`, `apres/mot-<thème>.png`.

À savoir : dans cette police, le « I » majuscule est une simple barre, comme un « l ». C'est la couleur qui sépare « AI » du reste.

## Deux, l'icône de l'application

**L'ancienne icône** (un « b » noir sur fond crème, `avant/icones/`) partait encore avec la release.

**La nouvelle**, tirée du dessin actuel de la mascotte, rendue depuis l'application :
- le chien en gros plan dans son cadre, sur une tuile de la couleur de la barre latérale (#0c0d0f) ;
- l'oreille qui sort du cadre, comme dans la barre latérale ;
- le cadre cerclé du dégradé bleu vers sarcelle du « AI ».

Trois sources, toutes en 1024 px avec fond transparent, dans `src-tauri/icons/source/` :
- **pleine** : la tuile occupe toute l'image (Windows, Linux, png) ;
- **Mac** : la grille d'Apple, tuile de 824 px avec ombre ;
- **petites tailles** : cadrage serré et anneau plus épais, pour rester lisible en 16, 24 et 32 px dans la barre des tâches.

**Jeu complet** produit par le CLI Tauri 2.10.1, la version du projet :
- les png et les logos `Square*` ;
- `icon.icns`, toutes tailles jusqu'à 1024, depuis la source Mac ;
- `icon.ico`, avec 16, 24 et 32 depuis la source petites tailles, et 48, 64 et 256 depuis la source pleine ;
- `32x32.png`, l'icône Dock du mode développement et le dossier Android.

`tauri.conf.json` pointait déjà sur ces fichiers (`icons/icon.ico`, `icons/icon.icns`, les png) : rien d'autre à brancher. L'installateur Windows, l'exécutable (barre des tâches) et le paquet Mac les reprennent à la compilation.

**Vérification sur les fichiers livrés.** Images extraites de `icon.icns` et de `icon.ico`, puis comparées pixel à pixel (écart moyen par canal, 0 à 255) :

| Fichier | Écart avec la nouvelle icône | Écart avec l'ancienne |
|---|---|---|
| `icon.icns` (1024) | 0,01 | 150,8 |
| `icon.ico` (256) | 0,00 | 114,4 |

L'`.ico` contient 16, 24, 32, 48, 64 et 256. Planche : `apres/icones/extraits-icns-ico.png`. Lisibilité aux petites tailles : `apres/icones/petites-tailles.png`.

**Non fait ici.** Je n'ai pas pu produire l'installateur ni le paquet `.app` : pas de Rust sur cette machine. La vérification porte sur les fichiers d'icône que la compilation embarque. À la prochaine compilation, un coup d'œil sur l'installateur Windows, la barre des tâches et le Dock le confirmera.

**Reste ancien.**
- `src-tauri/icons/icon.svg` et `generate-icon.js` regénèrent l'ancien « b » si on lance ce script : à supprimer, ou à ne plus utiliser.
- Le favicon `public/baitari-mark.svg` (onglet du navigateur, serveur d'activation) n'a pas été changé ; il n'apparaît pas dans l'application de bureau.

Tests : tsc, eslint, 202 fichiers et 1626 tests verts.
