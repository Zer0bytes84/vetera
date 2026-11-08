# Barre de titre Windows : l'en-tête devient la barre de titre (7 novembre 2026)

**Statut : codé et vérifié dans le navigateur, PAS encore testé sous Windows.** Je n'avais ni chaîne Rust ni machine Windows. Le travail est sur la branche locale `barre-titre-windows`, pas sur `master` : la release de demain n'en dépend pas tant que les essais Windows ci-dessous ne sont pas faits. Repli assumé si un point casse : ne pas fusionner la branche, la barre native reste.

## Ce que dit le code de decorum (lu avant de coder)

Lu : le README, et surtout le crate **publié** 1.1.1 (septembre 2024), qui est celui que Cargo compile. Il diffère du dépôt GitHub actuel.

- Sélecteurs exacts : `div[data-tauri-decorum-tb]`, `button.decorum-tb-btn`, `button#decorum-tb-minimize`, `#decorum-tb-maximize`, `#decorum-tb-close`. Le « `div[data-decorum-tb]` » de la référence Gemini est faux, et la coquille `set_ title` n'a pas été reprise.
- **Le Snap Layout n'est pas natif.** Après 620 ms de survol d'« Agrandir », decorum donne le focus à la fenêtre puis simule Win+Z (bibliothèque enigo), puis Alt. La position des boutons dans le DOM ne joue donc pas. Effets possibles : vol de focus, rien sous Windows 10 ou si les dispositions d'ancrage sont désactivées.
- **Barre parasite.** Si aucun `[data-tauri-decorum-tb]` n'existe au chargement du DOM, decorum pose sa propre barre transparente de 32 px, fixe, sur toute la largeur, au-dessus de notre en-tête. Elle aurait avalé les clics sur la recherche, le bouton plus et les icônes. Parade : un élément statique dans `index.html`, présent avant React.
- **Plein écran.** decorum ne masque jamais ses boutons ; c'est notre code qui le fait.
- **Fenêtre.** decorum retire les décorations au démarrage (`set_decorations(false)`), pas dans la configuration : un éclair de la barre native au lancement est possible.

## Configuration

- `withGlobalTauri` était **déjà** à `true` chez nous, donc rien ne change. Ce réglage met l'API Tauri sur `window.__TAURI__` pour tout script de la page, ce qu'exige decorum. Le vrai risque est ailleurs et existait avant : `csp: null` avec `fs:scope $HOME/**` et `sql:execute`, si bien qu'une injection de script aurait tout. À traiter dans un chantier sécurité.
- **Dépendance Windows seulement :** `[target.'cfg(target_os = "windows")'.dependencies] tauri-plugin-decorum = "=1.1.1"`. Mac et Linux ne la compilent pas. `Cargo.lock` a été résolu, par une machine qui a Rust.
- `main.rs` : greffon et `create_overlay_titlebar()` sous `#[cfg(target_os = "windows")]`, sur la fenêtre `main`. Une erreur est journalisée, jamais fatale.
- **Permissions :** fichier à part `capabilities/windows-titlebar.json`, avec `"platforms": ["windows"]`. tauri-build 2.5.6 ignore une capacité hors de sa plateforme (`acl.rs`, `validate_capabilities`), vérifié dans son code. Elle contient `decorum:allow-show-snap-overlay`, les droits de fenêtre utilisés et `allow-set-decorations` pour le filet de secours. `allow-set-size` et `allow-center` ont été retirées : rien ne s'en sert.
- La fenêtre `activation-admin` garde sa barre native.

## Mesures et style

- **Notre en-tête :** 60 px de haut dans les quatre thèmes. Les 43 et 46 px de la référence ne s'appliquent pas.
- **Boutons :** 46 px de large, la largeur des boutons de légende Windows, sur toute la hauteur de l'en-tête (46 × 60). L'espace réservé en fin d'en-tête vaut **exactement 138 px** (3 × 46).
- **Apparence :** icônes dessinées comme les nôtres (16 px, trait 1,5, couleur du texte), survol dans notre teinte, survol de « Fermer » en **#e81123** avec icône blanche, appui en #f1707a. Un changement de thème s'applique sans redémarrage (variables CSS).
- **Séparateur :** séparateur fin entre l'avatar et les contrôles, le même que celui de gauche, à 10 px de chaque côté.
- **Coin de la fenêtre :** en Clean, le cadre sombre de 8 px en haut et à droite est retiré sous Windows pour que « Fermer » soit dans le coin de la fenêtre. La barre latérale noire monte toujours au coin supérieur gauche. Choix de ma part, à valider.
- **Superposition :** les contrôles sont fixés au coin, au-dessus de l'en-tête et sous les dialogues et feuilles : une fenêtre modale les recouvre comme le reste de l'application.
- **Plein écran :** boutons, espace et séparateur disparaissent.
- **Mac et Linux :** l'élément reste caché, aucun script ne s'exécute (mesuré dans le navigateur : `display: none`, marge de l'en-tête inchangée).
- **Linux :** barre native conservée. Des contrôles React maison n'étaient pas vérifiables proprement sous Wayland sans y lancer l'application.

## Garde fonctionnelle

- Glisser et double-clic : le crochet existant `use-tauri-drag` de l'en-tête, inchangé. Les boutons de fenêtre sont hors de l'en-tête et ne le gênent pas.
- Tous les éléments cliquables de l'en-tête sont à gauche de l'espace réservé : aucun bouton de l'en-tête ne passe sous les contrôles (mesuré dans les quatre thèmes).
- Écrans sans en-tête (connexion, licence, configuration) : les contrôles restent au coin, et ces écrans gardent leurs zones de glisser.

## Équipe rouge (indépendante) et suites données

| Attaque | Verdict | Suite |
|---|---|---|
| Compilation Windows, Mac, Linux | OK sur le code | Seule preuve réelle : la CI `desktop-builds.yml` (windows-latest) |
| Le texte Segoe de decorum décentrait l'icône d'environ 11 px | Bloquant visuel | **Corrigé** (flex au lieu de grid) ; l'aperçu porte désormais le même texte |
| Course au chargement : sans boutons ni barre native, seul Alt+F4 reste | Risque | **Filet ajouté** : sans boutons après 4 s, la barre native revient |
| Interface en arabe : les contrôles couvraient le début de l'en-tête | Risque | **Corrigé** (`inset-inline-end`) |
| Premier Tab de chaque écran sur « Réduire » | Risque | **Corrigé** (hors de l'ordre de tabulation, comme Windows) |
| Écran tactile : le rouge de decorum revenait | Accessoire | **Corrigé** |
| Coin haut droit arrondi et sombre (`#root` arrondi pour la fenêtre Mac), trouvé à la capture | Défaut visuel | **Corrigé** sous Windows seulement |
| Snap simulé (vol de focus, Windows 10) | Risque | À vérifier à la main |
| Éclair de la barre native au lancement | Risque | À vérifier ; corriger par `decorations: false` propre à Windows seulement si gênant |

## À vérifier sous Windows avant de fusionner

1. Compilation (CI windows-latest ou `npm run tauri:dev`).
2. Lancement à froid : pas d'éclair gênant, boutons présents sur l'écran de démarrage, la licence et la connexion ; licence et base de données intactes.
3. Dix rechargements (réinitialisation, réessai) : les boutons reviennent.
4. Icônes centrées dans les 60 px ; « Fermer » rouge au survol.
5. Survol d'« Agrandir » environ 0,7 s : le menu Snap Layout s'affiche, bien placé.
6. Fenêtre agrandie : rien de coupé, barre des tâches visible, sans coins transparents ni vides ; deux écrans de résolutions différentes.
7. Ancrée sur une moitié d'écran : coins propres ; Windows 11 : ombre et coins arrondis.
8. Redimensionnement par les quatre bords, haut compris ; le coin haut droit ferme ou redimensionne ?
9. Glisser par une zone vide de l'en-tête, double-clic pour agrandir et restaurer.
10. Plein écran puis retour : l'espace réservé disparaît puis revient.
11. Changement de thème clair ou sombre, Clean ou Premium, sans redémarrage.

## Captures

`avant/` : l'en-tête actuel dans les quatre thèmes. `apres-apercu/` : l'en-tête avec les contrôles, rendus par le mode aperçu de développement (boutons inertes, sans fenêtre Windows), et le survol de « Fermer ». Ce ne sont **pas** des captures Windows. Mac : la non-régression n'a pas pu être capturée sur un Mac ; elle repose sur le code (rien n'est compilé ni exécuté hors Windows).

Tests : tsc, eslint, 202 fichiers et 1626 tests verts sur la branche.
