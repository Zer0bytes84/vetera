# Premium : analyse REA préalable au code

## Périmètre et méthode

Analyse écrite avant toute modification du frontend. Lecture de Baitari et inventaire REA de la référence Gr8r : commande `rea import-reference-source /private/tmp/baitari-gr8r-premium --format json`, résultat /private/tmp/baitari-premium-rea.json. Révision Gr8r 904205c626918ee96054eb35495c394a60c0c601. L’inventaire REA est une référence historique partielle, pas une preuve d’exécution. La démo fournie gr8-taskmanagement.vercel.app est inaccessible au navigateur de recherche ; le README pointe vers gr8r-taskmanagement.vercel.app. Les constats reposent sur les sources CSS, pas sur une capture supposée.

## Resources : ressources visuelles

Gr8r src/styles/tokens.css est la référence principale : surfaces légèrement chaudes et superposées, accent désaturé, couleurs sémantiques distinctes, espacement à base de 4 px, marge commune de 24 px, ombres fines et rayons contenus. Typographie Geist avec niveaux 12 à 23 px. components.css définit les états des boutons ; views/table.css prévoit une largeur fixe et des titres medium, avec emphase 600 sur les éléments importants. Ces principes seront adaptés à SF Pro et au bleu Baitari, sans copie de code, police téléchargée, données ou fonctionnalités Gr8r.

Baitari : src/design-system/tokens.css, src/index.css, src/lib/theme-store.ts, ThemeProvider, composants Shadcn Button/DropdownMenu/ContextMenu/Table/Badge et AppSidebar. Les paramètres Apparence possèdent déjà les préférences locales, le mode clair/sombre et Liquid Glass. Les mascottes sont des ressources intouchables.

## Events : événements

Choix explicite Premium dans Apparence ; persistance dans la configuration locale existante ; événement baitari-theme-config-changed ; applyTheme applique un attribut racine. Clair/sombre reste indépendant. Hover, focus-visible, active, disabled et sélection de ligne restent les événements existants. Les raccourcis sont seulement des accès aux actions existantes : rendez-vous, consultation, recherche patient, soin. Aucun nouvel acte ou workflow.

## Agents : responsabilités

Vétérinaire : choisit Classique ou Premium et utilise les actions actuelles. ThemeProvider/theme-store : appliquent et persistent le choix sans changer les autres préférences. CSS Premium : contrôle uniquement présentation et tokens. Shell : relie les quatre presets aux routes/événements existants. Repositories, SQLite, assistants et mascottes : aucune modification.

## Contrat de non-régression

Classique est la valeur par défaut, y compris pour une configuration ancienne ou invalide. Tous les nouveaux styles sont conditionnés par data-visual-style=premium. Les feuilles actuelles restent intactes ; pas de remise à zéro de l’accent, de la police ou du mode existant. Les presets ne sont visibles qu’en Premium. Couleurs de statut basées sur le sens existant, jamais déduites d’un texte traduit. Respect du clavier, contraste et reduced-motion.

## Ordre d’implémentation et preuve finale

1. Ce document préalable ; 2. préférence typée et persistée ; 3. tokens Premium ; 4. composants et états ; 5. gras ; 6. sidebar ; 7. presets utilisant les actions existantes ; 8. typecheck, lint sans avertissement, tests comptés, build et captures. Comparer le Classique avant et après et après retour depuis Premium, en clair/sombre. Tester persistance du toggle et routes des presets. Les captures seront sur données isolées et ne constitueront pas une écriture de production.
