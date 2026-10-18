# Sidebar : page Documents et mode icônes

Date : 18 octobre 2026. Rien n'a été commité.

## 1. Documents : sidebar dépliée comme ailleurs

**Cause** : `src/modules/shell/app-shell.tsx` contenait un composant `DocumentsSidebarMode`, qui repliait d'office la sidebar en entrant sur Documents (vue `notes`) et la rouvrait en sortant.

**Correction** : ce composant et son appel sont supprimés, avec l'import `useSidebar` devenu inutile. La sidebar garde donc l'état choisi par l'utilisateur sur toutes les pages : dépliée par défaut, repliée seulement s'il la replie.

Vérification : au chargement de Documents, la sidebar est dépliée (`data-state="expanded"`), avec « Documents » actif. La sidebar dépliée du Tableau de bord est inchangée : 248 px de large, lignes de 220 × 25 px.

Si l'application de bureau est restée ouverte sur Documents, la sidebar peut rester repliée jusqu'au prochain clic sur le bouton de dépliage. L'état initial au démarrage reste « dépliée ».

## 2. Mode icônes (sidebar repliée volontairement), inspiration Perplexity

Le style ne s'applique qu'au thème Premium et seulement en mode replié. Il est regroupé dans un bloc commenté en fin de `src/modules/shell/premium-sidebar.css`.

| Point | Avant | Après |
| --- | --- | --- |
| Largeur du rail | 56 px | 64 px |
| Cases d'icône | 34 × 34 px | 40 × 40 px, coins de 10 px, centrées sur un même axe |
| Rythme vertical | écart de 2 px, sauts irréguliers entre groupes | 4 px entre cases ; un court filet centré de 20 px entre groupes |
| Icônes | 20 px, trait 1 | 20 px, trait 1,5, gris atténué au repos, encre au survol et à l'état actif |
| État actif | fond plein et ombre de carte | pastille claire, filet d'1 px et ombre très légère |
| Survol | fond générique | fond `--nav-hover` ; l'info-bulle existante affiche le libellé |
| En-tête | logo et bouton de dépliage mal alignés (bureau) | logo puis bouton, centrés, espacés de 8 px |
| Pied | avatar dans un cadre de 44 px, réglages décalés | avatar rond de 40 px sans cadre, réglages dans une case de 40 px, même axe |
| Fenêtre basse | le pied de barre masquait les dernières icônes | la colonne défile, sans barre visible |

Couleurs : uniquement des jetons (`--ink`, `--ink-muted`, `--surface`, `--line`, `--line-strong`, `--nav-hover`). Thèmes clair et sombre vérifiés.

Le mode déplié, les libellés, les raccourcis et la navigation ne changent pas.

## Vérifications

- `npm run typecheck` : 0 erreur ;
- `npx eslint .` : 0 problème ;
- `npx vitest run` : 123 fichiers, 953 tests, tous verts.

Non vérifié dans l'application de bureau : le bouton de dépliage placé sous le logo (barre de titre macOS). Il suit la même règle de centrage.

## Captures

Votre capture jointe au message montrait l'ordonnance de Kejounti, pas la page Documents, et votre seconde capture n'a pas pu être enregistrée comme fichier. Les captures ci-dessous viennent donc du navigateur.

- Avant (`avant/`) :
  - `01-documents-sidebar-repliee.jpg` : Documents repliait la sidebar d'office ;
  - `02-mode-icones-detail.png` : rail d'icônes en fenêtre basse, pendant le travail ; le pied de barre masquait « Produits ».
- Après (`apres/`) :
  - `01-documents-sidebar-depliee.jpg` : Documents avec la sidebar dépliée ;
  - `02-mode-icones-replie-volontairement.jpg` : rail d'icônes ;
  - `03-mode-icones-survol-detail.png` : détail, survol et info-bulle ;
  - `04-mode-icones-theme-sombre.png` : thème sombre.
