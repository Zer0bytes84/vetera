# Premium : livraison et vérification

## Choix et périmètre

Dans Paramètres > Apparence, activer Style Premium. Désactivé : Classique, valeur par défaut, y compris pour les préférences anciennes ou invalides. Le choix est persisté avec la configuration locale existante. Le mode clair/sombre reste indépendant. Les préférences précédentes sont conservées et réappliquées au retour Classique.

REA a précédé le code : voir premium-ui-rea.md et l’inventaire /private/tmp/baitari-premium-rea.json. Inspiration Gr8r adaptée à Baitari, sans copie d’application, données de démonstration ou nouvelle dépendance.

Premium apporte des surfaces douces, SF Pro/native système, hiérarchie et gras 600 avec approche resserrée, boutons aux rayons de 10 px, états hover/actif/désactivé/focus, menus et tableaux plus lisibles, pastilles sémantiques, sidebar avec quatre presets fixes. Les compteurs neutres ne reçoivent pas de pastille colorée artificielle.

Les presets ouvrent les fonctionnalités existantes. Nouvelle consultation reprend précisément le parcours existant du bouton du tableau de bord, via le formulaire de rendez-vous. Planifier un soin ouvre le formulaire actuel dans Clinique > Soins, sans création de soin avant confirmation. Les mascottes, leurs images et leurs animations n’ont pas été modifiées. Aucune table, donnée ou règle métier modifiée.

## Fichiers

| Fichier | Responsabilité |
|---|---|
| src/lib/visual-style.ts | Choix validé et définition des quatre presets |
| src/lib/theme-store.ts | Valeur Classique par défaut, persistance existante et application de l’attribut racine |
| src/components/Parametres.tsx | Toggle dans Apparence |
| src/design-system/premium.css | Tokens clair/sombre et styles conditionnels |
| src/index.css | Import de la feuille Premium |
| src/components/app-sidebar.tsx | Presets, masqués en Classique et sidebar repliée |
| src/modules/shell/app-shell.tsx | Connexion aux parcours existants |
| src/modules/care-tasks/care-page.tsx | Ouverture du formulaire existant depuis le preset et attribut visuel du statut |
| src/config/status-meta.ts | Marqueurs visuels Premium des statuts existants, couleurs Classique préservées |
| tests/visual-style.test.ts | Valeurs anciennes, persistance, retour aux variables d’origine et quatre presets |
| docs/premium-ui-rea.md | Analyse préalable Resources, Events, Agents |
| docs/premium-ui-bilan.md | Résultats, preuves et limites |

## Vérifications finales

- Typecheck : 0 erreur.
- ESLint global : 0 erreur et 0 avertissement.
- Vitest : 561 tests réussis dans 71 fichiers.
- Build frontend : réussi. Avertissement Vite existant sur la taille des bundles supérieurs à 500 kB, distinct du lint.
- Test navigateur du vrai AppShell : toggle, persistance après rechargement, quatre presets, sidebar repliée et menu de filtre. Aucune erreur JavaScript. Rayon calculé du bouton principal avec infobulle : 10 px.
- Comparaison pixel à pixel Patients Classique avant/après : aucune différence. Comparaison Classique sombre avant/après toggle : aucune différence. La comparaison après utilisation de la palette peut refléter son état de recherche transitoire ; elle ne sert pas de preuve d’égalité stricte du header.

Captures dans /Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/premium-ui/ :

- premium-dashboard.png : dashboard et sidebar dépliée
- premium-tableaux-pastilles.png : tableau patients et statuts
- premium-sombre-dashboard.png et premium-sombre-tableaux.png
- premium-menu.png : menu de filtre
- premium-sidebar-repliee.png : navigation compacte
- premium-parametres.png : toggle
- classique-avant-patients.png, classique-apres-patients.png
- classique-sombre-avant-toggle.png, classique-sombre-apres-toggle.png
- comparaison-classique.json et verification.json : résultats automatisés

Les captures utilisent un contexte navigateur isolé avec un patient existant et une base locale de test, pas les données de production. Les montants nuls et l’absence de propriétaire dans cette fixture ne sont pas des données de démonstration ajoutées à l’application. Pas de test manuel du WebView Tauri revendiqué. Le serveur Vite de test sur 5180 a été relancé pour éviter une feuille CSS en cache.

## Ajustements demandés après livraison

Premium est désormais le choix par défaut à la demande explicite du vétérinaire ; un choix Classique enregistré reste respecté. La sidebar n’affiche plus de titres de section, adapte sa densité à la hauteur et place les presets en bas, au-dessus du profil : Rendez-vous, Consultation, Patients, Soin, pastilles à gauche. Testée sans débordement entre 540 et 1000 px, également repliée. Les sélecteurs de vues sont harmonisés avec la référence Gr8r, sans modification de sélection ou de navigation au clavier. Ce changement de défaut remplace le contrat initial Classique par défaut, sans supprimer le toggle.
