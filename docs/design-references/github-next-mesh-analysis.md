# Analyse de GitHub Next et adaptation Baitari

Inspection du 5 octobre 2026, à partir du HTML et des ressources JavaScript/CSS publiques. Le navigateur automatisé n’était pas disponible dans cette session : les observations ci-dessous viennent du code livré au navigateur, sans validation visuelle du rendu.

## Sources inspectées

- https://githubnext.com/projects/
- https://githubnext.com/posts/
- https://githubnext.com/people/
- https://githubnext.com/
- https://githubnext.com/projects/chopin/
- Composant effectivement chargé : https://githubnext.com/_astro/Gradient.C38yVGvw.js
- Styles : https://githubnext.com/_astro/Header.WHv3jsdc.css

Les noms des fichiers compilés peuvent changer lors d’un déploiement.

## Architecture réelle

Le site utilise Astro, avec un composant React `Gradient` hydraté via `client:idle`. Le HTML initial contient un canvas ; le dessin attend le montage et la mesure du parent. Le header a `data-astro-transition-persist="site-header"` : Astro le conserve entre les navigations. Le gradient n’a pas cet attribut dans les pages inspectées.

Ce que l’on perçoit comme un mesh est un assemblage de gradients radiaux dessinés avec CanvasRenderingContext2D. Il n’y a ni WebGL, ni shader, ni réseau de sommets interpolés dans ce composant. Aucun filtre de flou, grain, image ou animation continue n’y est utilisé. La douceur vient des rampes alpha et du masque CSS.

## Choix des couleurs et variation

Six palettes par défaut, de trois couleurs chacune :

| Palette | Couleurs |
| --- | --- |
| Indigo / rose / violet | #6366F1, #F9A8D4, #A78BFA |
| Ambre / jaune | #F59E0B, #FCD34D, #FBBF24 |
| Rose / corail | #EC4899, #F9A8D4, #FB7185 |
| Violet / lilas | #8B5CF6, #C4B5FD, #DDD6FE |
| Cyan | #06B6D4, #67E8F9, #22D3EE |
| Indigo / cyan / violet | #6366F1, #06B6D4, #8B5CF6 |

Une palette est sélectionnée avec `Math.random()` dans un `useMemo`. Une autre valeur aléatoire, conservée avec `useState`, sert de seed géométrique. Le générateur local est `fract(sin(seed) * 10000)`.

Les pages Projects, Posts et People passent toutes `opacity=0.7` et `few=true`. Elles ne passent aucune palette spécifique : les couleurs ne sont donc pas associées à leur URL par ce composant. Le changement de couleurs à chaque nouveau montage est établi par le code ; le comportement exact d’une navigation dépend du cycle de vie Astro.

Les fiches peuvent imposer leurs couleurs. Chopin passe explicitement `#99D529` et `#2DC8EE`. L’accueil passe `opacity=0.75`, sans `few=true`.

## Variante à deux halos : paramètres exacts

Pour une surface de largeur W et hauteur H :

- Deux couleurs : la première et la dernière de la palette.
- Seed par halo : seed initial + index × 13.
- Centre horizontal : W/2 + (random(seed) − 0.5) × W × 0.15, soit entre 42.5 % et 57.5 % de la largeur.
- Centre vertical : −0.15 × H, au-dessus du bord visible.
- Rayon horizontal : W × (0.45 + random(seed+200) × 0.15).
- Rayon vertical : H × (0.55 + random(seed+300) × 0.15).
- Le contexte est translaté au centre, puis étiré par le rapport rayon horizontal / rayon vertical. Un cercle devient ainsi une ellipse.
- Stops du gradient : couleur opaque à 0 et 0.2 ; blanc transparent à 1.
- Les halos sont dessinés successivement avec la composition canvas par défaut, `source-over`.

Sur Projects, le parent est une bande absolue de 220 px de haut. Son masque vaut noir de 0 à 50 px puis devient transparent à 210 px. L’opacité globale du canvas vaut 0.7. La combinaison du rayon vertical assez court, du centre négatif et du masque concentre les couleurs au sommet.

## Variante à plusieurs cercles

La liste de dessin contient six couleurs blanches, puis trois répétitions de la palette. Avec trois couleurs : quinze cercles au total. Avec les deux couleurs de Chopin : douze cercles.

Chaque cercle a un centre x entre 0 et W, un centre y entre −0.3H et 0, et un rayon entre 0.6H et 1.2H. Les stops sont couleur opaque à 0 et 0.3, puis transparent à 1. Les six cercles blancs constituent les premières couches ; les couleurs les recouvrent ensuite selon leur alpha. Cette variante produit une répartition plus irrégulière que les deux grandes ellipses.

## Dessin, taille et animation

Le parent est mesuré via `offsetWidth` et `offsetHeight`, au montage et sur `window.resize`. Le canvas multiplie sa résolution par `devicePixelRatio` puis redimensionne le contexte pour conserver les coordonnées CSS. Le dessin est relancé quand la taille, les couleurs, la seed ou la variante changent.

Le composant n’utilise ni boucle `requestAnimationFrame`, ni timer pour animer les halos. La classe `.fade-in` applique une apparition d’opacité de 500 ms. Le site comporte aussi des transitions de pages Astro, mais elles sont distinctes du dessin du gradient.

Limite de cette implémentation pour une application : `window.resize` ne détecte pas forcément un changement de largeur causé par l’ouverture de la sidebar. Un canvas adapté à Baitari devrait utiliser `ResizeObserver` et limiter le DPR si la surface devenait grande.

## Header et icônes

Les icônes à droite représentent Mastodon, Bluesky, X, Discord et RSS. Ce sont des SVG de 20 × 20 px, généralement remplis avec `fill-current`, dans une rangée espacée de 16 px. Le groupe applique `opacity: 0.75`. Les liens n’ont pas de fond, de bordure ou d’ombre. Certaines icônes deviennent colorées au survol, avec une transition de 300 ms.

La navigation centrale est différente : elle repose sur une capsule `bg-white/50`, `backdrop-blur-xl`, une bordure blanche et une ombre très légère. Les icônes latérales ne reprennent pas cette capsule.

Les icônes sociales pleines ont une silhouette plus dense que nos Hugeicons dessinées au trait. L’adaptation Baitari conserve les symboles fonctionnels existants et leur famille graphique ; elle reprend la couleur sombre et l’absence de pastille permanente.

## Différence avec notre Radiant

Le `HeroPattern` actif de Baitari utilisait un seul élément de 33 rem, haut de 14 rem, tourné de −10 degrés, positionné à −10 rem du sommet, avec un dégradé linéaire à 115 degrés et un flou de 64 px. La palette jaune / rose / violet était identique sur toutes les pages. Le composant `ui/mesh-gradient.tsx` animé existe aussi dans le dépôt, mais ce n’est pas lui qui dessine le fond du shell.

Radiant produit donc un accent localisé, asymétrique et flouté. GitHub Next répartit des halos elliptiques larges autour du centre, sans flou, avec un effacement explicite vers le contenu.

## Adaptation livrée

Le shell utilise désormais deux gradients radiaux CSS avec la géométrie de la variante `few`. CSS permet de conserver les proportions au redimensionnement du panneau sans canvas, mesure du DOM ou listener. Cette adaptation reprend la structure visuelle ; les interpolations alpha de CSS et du canvas peuvent produire de légères différences de couleur.

- Bande de 220 px, masque 0 / 50 / 210 px, centre vertical −33 px et opacité 0.7 en clair.
- Palettes explicites par section ; une seed dérivée du nom de la vue stabilise la géométrie.
- Patient et fiche patient partagent leurs couleurs ; finances et analyse financière aussi.
- Apparition de 500 ms à chaque changement de vue ; aucune animation permanente.
- Opacité abaissée à 0.25 en sombre, une adaptation Baitari qui n’est pas issue du composant source.
- `prefers-reduced-motion` désactive l’apparition.
- Couche décorative `aria-hidden` et `pointer-events: none`, placée derrière le header.
- Boutons du header transparents, icônes zinc sombre en clair et claires en sombre, fond discret au survol et focus visible.
- Recherche alignée sur la taille 36 px des autres commandes.

Le header Protocol conserve son opacité continue pilotée par `useScroll` et `useTransform`, son backdrop blur et son trait inférieur. Le gradient est dans le panneau, avant le header, et non dans une couche de réfraction du header.

Les motifs existants des modales et leurs aperçus restent gérés par `HeaderPatternLayer`. La palette du shell est volontairement liée à la section et ne dépend pas du réglage historique de motif, que le précédent `HeroPattern` Radiant ne consultait déjà pas.

## Validation et limites

Les fichiers ont été relus et la modification est transmise au serveur Vite déjà lancé. Aucun test automatique ni compilation de validation n’a été exécuté pour cette modification visuelle. Le navigateur contrôlable étant indisponible, le résultat n’a pas été validé visuellement dans Tauri. Le dosage final des couleurs pourra être ajusté à partir du rendu dans l’application.


## Ajustement du halo central

À la demande de l’utilisateur, le rendu Baitari a été amplifié : bande de 340 px, halos de 560 à 640 px de haut centrés à −60 px, centres horizontaux proches de 44 % et 56 %. Un masque elliptique concentre la profondeur au centre et raccourcit progressivement le halo sur les côtés. L’opacité est de 0.85 en clair et 0.32 en sombre. Les fiches patients et l’analyse financière ont désormais leurs propres palettes. Ces valeurs remplacent celles de la première adaptation décrite plus haut ; elles sont un choix de composition Baitari.


## Réduction après retour visuel

Le halo amplifié a été jugé trop présent. Le shell reprend désormais la géométrie de GitHub Next Projects : bande de 220 px, centre vertical à −33 px, rayons horizontaux de 45 à 60 % de la largeur, rayons verticaux de 55 à 70 % de 220 px, stops à 0 / 20 / 100 %, masque vertical à 0 / 50 / 210 px, opacité 0.7 en clair et 0.25 en sombre. Les palettes distinctes par page sont conservées. Cet ajustement remplace les valeurs de la section précédente.
