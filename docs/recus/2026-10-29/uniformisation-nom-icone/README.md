# Uniformisation du nom et de l'icône de Baitari

29 octobre 2026, branche `feat/dictee-turbo-native`, macOS.

## Cause

Le build installé dit déjà « Baitari » partout. Son `Info.plist` porte `CFBundleName` et `CFBundleDisplayName` à « Baitari », et son icône est `icon.icns`, identique à `src-tauri/icons/icon.icns` (même empreinte SHA-1 `991529b13f37…`). Le menu de l'app (« À propos de Baitari », « Quitter Baitari ») vient du menu par défaut de Tauri, qui prend `productName`. La fenêtre « À propos » affiche ce nom et l'icône de l'app.

Les écarts viennent de `npm run tauri:dev`. Le binaire de dev, `src-tauri/target/debug/vetera`, tourne hors de tout paquet `.app`, donc sans identifiant de bundle. Deux surfaces en souffraient.

1. **Nom.** LaunchServices enregistre le processus sous le nom de son fichier, « vetera ». C'est ce nom que montrent l'étiquette du Dock au survol, le sélecteur Cmd-Tab, « Forcer à quitter » et le Moniteur d'activité. Avant le correctif, `lsappinfo` donnait `"vetera"` et `NSRunningApplication.localizedName` aussi. Le titre en gras de la barre de menus disait déjà « Baitari », car il reprend le titre du premier menu.
2. **Icône.** En dev, Tauri pose `icon.icns` telle quelle comme icône du Dock (`tauri/src/app.rs`, événement `Ready`). Elle remplit toute la case. Le build installé, lui, est réduit par macOS à la grille des icônes, 824 pixels sur 1024. Les deux icônes côte à côte n'avaient donc pas la même taille (capture `dock-avant-dev-et-installe.jpg`).

Le nom du binaire, `vetera`, n'a pas été renommé. En dev, sans identifiant de bundle, WebKit range le stockage de la webview (localStorage, IndexedDB) dans `~/Library/WebKit/vetera`. Renommer le binaire aurait laissé ce dossier orphelin et redémarré le dev sur un stockage vide. Le build installé range le sien sous `~/Library/WebKit/com.baitari.vetera`, qui ne dépend que de l'identifiant de bundle.

## Ce qui change

Seul le build de dev macOS change (`#[cfg(all(debug_assertions, target_os = "macos"))]`). Le build installé est déjà conforme et ne compile pas ce code.

- `src-tauri/src/main.rs`, `nommer_processus_dev` : au démarrage, le processus de dev annonce à LaunchServices le nom `productName` (« Baitari ») par `_LSSetApplicationInformationItem` et `_kLSDisplayNameKey`. Ces fonctions privées sont cherchées à l'exécution par `dlsym`. Si elles manquent, le dev garde son ancien nom sans rien casser. Le nom du processus (`NSProcessInfo.processName`) n'est pas touché, donc WebKit garde son dossier `~/Library/WebKit/vetera`. Après le correctif, aucun dossier `~/Library/WebKit/Baitari` n'a été créé.
- `src-tauri/src/main.rs`, `poser_icone_dock_dev` : à l'événement `Ready`, après Tauri, le dev pose `src-tauri/icons/dock-dev.png` comme icône du Dock. C'est `icon.png` réduite à 412 pixels sur 512 et centrée sur fond transparent, soit la grille 824 sur 1024. Le lancement passe de `.run(contexte)` à `.build(contexte)` puis `.run(rappel)`.
- `src-tauri/Cargo.toml` : dépendances macOS `objc2`, `objc2-app-kit` et `objc2-foundation`, déjà présentes dans `Cargo.lock` via Tauri, aux mêmes versions.

Rien d'autre ne bouge. L'identifiant `com.baitari.vetera`, `productName`, le binaire `vetera`, le dossier de données et `baitari.db` restent tels quels. Les clés internes `vetera:*` du localStorage et de la palette de commandes, invisibles, restent aussi. La base réelle n'a pas été ouverte : sa date de modification et sa taille (`1793320004`, `1708032` octets) sont les mêmes avant et après les essais.

Surfaces vérifiées après correctif :

| Surface | Build installé | `tauri:dev` |
| --- | --- | --- |
| Barre de menus, titre en gras | Baitari | Baitari (déjà avant) |
| Nom LaunchServices (Dock au survol, Cmd-Tab, Forcer à quitter) | Baitari | Baitari (était « vetera ») |
| Icône du Dock | icône officielle | icône officielle, même taille (était plus grande) |
| Titre de fenêtre | vide, masqué (`hiddenTitle`) | idem |
| Titre de la page web (`index.html`) | Baitari | Baitari |
| Menu « À propos » | À propos de Baitari, icône de l'app | idem |
| Écran de connexion | mot-symbole « bAItari » (`Auth.tsx`) | idem |
| `APP_NAME` (`src/lib/brand.ts`) | Baitari | Baitari |

Reste un point ouvert, qui n'a pas été tranché ici. Le logo dans l'app (`src/components/Logo.tsx`, `public/baitari-mark.svg`) est un « b » bleu avec une croix verte. On le voit sur l'écran d'activation, la barrière de licence et l'écran de démarrage. L'icône de l'app est un « b » noir avec un point vert, sur fond crème. Les deux marques coexistent. Les aligner est un choix de marque qui touche le composant `Logo` global. La consigne était de ne pas toucher ce composant, il est donc resté tel quel. La mascotte de la barre latérale est un choix de l'utilisateur, pas une icône d'app.

Les builds Windows et Linux n'ont pas été vérifiés. Leur binaire s'appelle aussi `vetera`.

## Inventaire

Apps Baitari ou Vetera trouvées sur la machine, d'après la base LaunchServices et une recherche dans `/Applications`, `~/Applications`, `~/Library/Caches`, `~/Desktop`, `~/Downloads`, `~/Documents` et `src-tauri/target`. Aucune n'est installée dans `/Applications`.

| Rôle | Chemin | Nom affiché | Identifiant de bundle | Exécutable | Version | Icône |
| --- | --- | --- | --- | --- | --- | --- |
| Build de release du dépôt (19 h 35) | `src-tauri/target/release/bundle/macos/Baitari.app` | Baitari | `com.baitari.vetera` | `vetera` | 3.3.29 | `icon.icns` officielle |
| App de mesure | `~/Library/Caches/baitari-eval/mesure/Baitari.app` | Baitari | `com.baitari.vetera` | `vetera` | 3.3.29 | `icon.icns` officielle |
| App de mesure, état avant | `~/Library/Caches/baitari-eval/mesure-avant/Baitari.app` | Baitari | `com.baitari.vetera` | `vetera` | 3.3.29 | `icon.icns` officielle |
| Copie « produit » (28 octobre) | `~/Library/Caches/baitari-eval/produit/Baitari.app` | Baitari | `com.baitari.vetera` | `vetera` | 3.3.29 | `icon.icns` officielle |
| Dev (`npm run tauri:dev`) | `src-tauri/target/debug/vetera`, pas de paquet | Baitari (était « vetera ») | aucun | `vetera` | 3.3.29 | `icon.icns` posée par Tauri, puis `dock-dev.png` |

Les quatre paquets partagent l'identifiant `com.baitari.vetera`. Lancés sans HOME isolé, ils ouvrent tous la même base réelle. Seule `mesure` est enregistrée dans LaunchServices. Les archives `bAItari_*.app.tar.gz` et `.AppImage` de `~/Documents/01 - Personnel et famille/…/App dev/` sont d'anciennes versions 1.5.x, non décompressées.

Dossiers liés au nom : `~/Library/Application Support/com.baitari.vetera` (données), `~/Library/WebKit/com.baitari.vetera` (webview du build installé), `~/Library/WebKit/vetera` (webview du dev), `~/Library/Caches/com.baitari.vetera` et `~/Library/Caches/vetera`.

## Captures

Prises par `screencapture -l` sur la fenêtre « Menubar » du WindowServer et la fenêtre « Dock », recadrées sur fond sombre. Le build installé a été lancé depuis `target/release/bundle/macos/Baitari.app` avec un HOME isolé. Sa base allait donc sous ce HOME, pas dans la base réelle. Les copies du dev ont été lancées avec `BAITARI_DATA_DIR` isolé, puis arrêtées par leur PID.

- `barre-menus-dev-avant.jpg`, `barre-menus-dev-apres.jpg` : barre de menus du dev au premier plan. Le titre en gras dit « Baitari » avant comme après. macOS refuse de mettre une autre app au premier plan depuis un processus en arrière-plan, et la barre de menus du build installé n'a pas pu être capturée seule. Son titre vient du même menu Tauri.
- `dock-avant-deux-dev.jpg` : deux instances dev avant correctif, icône pleine case.
- `dock-avant-dev-et-installe.jpg` : dev (à gauche) avant le correctif d'icône, à côté du build installé (à droite). L'icône dev est plus grande.
- `dock-apres-dev-et-installe.jpg` : après correctif, les deux icônes ont la même taille.
- `fenetre-installe-activation.jpg` : fenêtre du build installé, sur l'écran d'activation, faute de licence dans le HOME isolé. On y voit le logo bleu de `Logo.tsx`, le point ouvert plus haut.

L'étiquette du Dock au survol n'apparaît pas dans une capture statique. Sans autorisation d'accessibilité, on ne peut pas la lire non plus. La preuve du nom vient de LaunchServices :

```
avant : lsappinfo → "vetera"  ; NSRunningApplication.localizedName → vetera (sans bundle)
après : lsappinfo → "Baitari" ; NSRunningApplication.localizedName → Baitari (sans bundle)
installé : NSRunningApplication.localizedName → Baitari (com.baitari.vetera)
```

Portes : `tsc -b` et `eslint .` sans erreur, `npm test` 172 fichiers et 1325 tests passés, `cargo check` sans avertissement.
