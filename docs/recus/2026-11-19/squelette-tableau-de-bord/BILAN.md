# Tableau de bord : le squelette Cards à la place de la rangée « Chiffres clés » pendant sa lecture, 19 novembre 2026

**Où :** branche `chantier/data-answer-2026-11-19` (elle porte le Loading Skeleton de la tranche 1), commit local. Rien n'est poussé, fusionné ni tagué.

## 1. La mesure avant

**Le banc :** l'app assemblée comme la release, avec la copie masquée de la base. Les tables du tableau de bord arrivent **1,5 s après son montage** (patch servi à la volée, `outils/chargement.mjs`) ; celles dont l'app a besoin pour s'ouvrir (utilisateurs, sessions, réglages) arrivent tout de suite, comme sur ton Mac. Toutes les 50 ms, on relève les valeurs des quatre cartes, la présence d'un squelette, la hauteur de la rangée et le décalage de mise en page.

**Ce que montre master pendant la lecture, mesuré, en clair et en sombre :** la rangée s'affiche tout de suite **avec des valeurs fausses**, pendant toute la lecture (1,25 s mesurées) :

| Carte | Affiché pendant la lecture | Valeur réelle |
|---|---|---|
| Trésorerie | 0 DA | 31 500 DA |
| Rendez-vous | 0 | 50 |
| Créances | 0 DA, « Aucune facture impayée » | 0 DA |
| Actions à suivre | 0, « Aucune action à terminer · 100 % » | 1 |

Captures : `avant/pendant-*.jpg`. Sur ton Mac, la lecture du tableau de bord dure 2 à 2,3 s (tes deux relevés) : ces zéros s'y voient d'autant plus longtemps.

## 2. Ce qui change

**`StatGrid`**, le composant de toutes les premières rangées, a un mode « en lecture » (`loading`) :
- **chaque carte est dessinée en squelette**, au reflet du Loading Skeleton, ligne pour ligne : libellé avec sa pastille, chiffre, pastille de variation, ligne courte, barre d'objectif quand la carte en a une. Les hauteurs sont celles de la carte : rien ne bouge à l'arrivée des chiffres ;
- **aucun chiffre n'est montré avant d'être connu ;**
- la zone devient une région `status` nommée (« Chargement des chiffres clés ») et occupée (`aria-busy`). Ses formes sont cachées des lecteurs d'écran. L'arrivée des chiffres est déjà annoncée par la région polie qui entoure la rangée ;
- **pas de flash sur une lecture rapide :** les squelettes tiennent la place sans se montrer pendant les 150 premières millisecondes, puis restent au moins 300 ms (le `useDelayedSkeleton` du tableau de bord, déjà utilisé par ses autres modules) ;
- **l'en-tête de la bande reste vivant :** titre, période et filtres restent là et utilisables pendant la lecture.

**Le tableau de bord** passe ce mode tant que la caisse, les rendez-vous et les patients, ou les actions, sont en lecture.

## 3. La mesure après

Mêmes conditions, deux passes, en clair et en sombre :

| | Avant | Après |
|---|---|---|
| Valeurs fausses affichées | pendant toute la lecture (1,25 s) | **jamais** |
| Squelette affiché | jamais | pendant la lecture (1,25 s environ) |
| Hauteur de la rangée | 264 px (clair), 262 px (sombre) | **264 et 262 px, inchangées** |
| Décalage cumulé de la page | 0,009 à 0,01 | 0,009 à 0,01 (inchangé : il vient des autres rangées) |
| Valeurs finales | justes | justes, les mêmes |

Captures : `apres/pendant-*.jpg` (les squelettes) et `apres/apres-*.jpg` (les chiffres). Relevés : `releves/`.

**Contrôles :** typecheck 0, lint 0, **2 207 tests verts** (le test de durée connu du tableau de bord est vert seul) ; 3 nouveaux tests : aucun chiffre en lecture, place tenue avant le délai, retour des valeurs.

## 4. Ce qui reste

- **La rangée « Recettes & activité » montre aussi « 0 DA » pendant la lecture** (même cause : son total s'affiche avant la lecture du journal). Le même traitement s'y applique ; je ne l'ai pas fait sans ton mot, puisque tu as demandé le squelette pour les cartes.
- **Les autres pages qui utilisent `StatGrid`** (Patients, Agenda, Finances, Équipe…) peuvent recevoir le même mode : une ligne par page, à faire page par page avec sa mesure.
- **Pas vu sur le bureau :** la lecture lente est simulée dans le navigateur. Ton test en tauri dev la montrera pour de vrai, puisque la lecture y dure 2 s.
