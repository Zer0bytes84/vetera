# Pilote de test (développement seulement)

Il permet à un script de la machine d'exécuter du code **dans la fenêtre de l'app** (la vraie fenêtre Tauri, ou un onglet de navigateur) et d'en lire le résultat. Il sert à tester l'app là où personne ne peut cliquer ni prendre de capture (une machine virtuelle, une session distante).

## Sécurité

- Il n'existe **que** si `BAITARI_TEST_HARNESS=1`, **que** dans le serveur de développement (`vite`, jamais `vite build`) et **que** si `NODE_ENV` n'est pas `production`. Sans cela, `testHarnessPlugin` rend `[]` : aucun fichier créé, aucun script injecté, rien dans un installateur.
- Le serveur de développement écoute sur toutes les interfaces. Toute requête doit donc venir **de la machine locale** (127.0.0.1, ::1) **et** porter un **jeton tiré au hasard à chaque démarrage**, gardé dans `.test-harness/token` (lisible par son propriétaire seul). Une machine voisine reçoit 403, même avec le bon jeton. Le jeton figure dans la page servie, c'est pourquoi la condition « machine locale » est indispensable.
- Un avertissement s'affiche dans le terminal au démarrage. Ne jamais l'activer sur une machine qui n'est pas la vôtre.
- Tests : `tests/test-harness.test.mjs`.

## Lancer

```bash
BAITARI_TEST_HARNESS=1 npm run tauri:dev     # ou BAITARI_TEST_HARNESS=1 npm run dev, pour un navigateur
```

Dossier de travail : `.test-harness/` (ignoré par git), ou `BAITARI_TEST_HARNESS_DIR`.

## Utiliser

```bash
npm run harness -- fichier.js                # un script
npm run harness -- --eval "return H.text()"  # une ligne
npm run harness -- --errors                  # erreurs de console depuis le chargement de la page
npm run harness -- --errors --clear
npm run harness -- --timeout 120 fichier.js  # délai en secondes (60 par défaut)
```

Le script est le corps d'une fonction `async` : il reçoit les aides sous `H` et `return` une valeur JSON. Code de sortie 0 si le script réussit, 1 s'il lève une erreur ou si la fenêtre ne répond pas. Une fenêtre qui n'a pas interrogé le pilote depuis 15 s est signalée.

| Aide | Rôle |
| --- | --- |
| `H.press(el)` | Séquence complète d'un clic (pointer, mouse, click) : les menus de l'app y réagissent. |
| `H.setVal(el, texte)` | Saisit dans un champ contrôlé par React. |
| `H.setFiles(input, [File])` | Donne des fichiers à un `<input type="file">`, sans boîte de dialogue système. |
| `H.byText(sélecteur, /motif/)` | Premier élément dont le texte **ou** le libellé accessible correspond (chacun testé seul, `^` et `$` valent ce qu'ils disent). |
| `H.waitFor(fn, ms, quoi)` | Attend qu'une condition soit vraie, sinon lève une erreur nommée. |
| `H.text(sélecteur, max)` / `H.toasts()` | Lit la fenêtre. |
| `H.errors(clear)` | `console.error`, `console.warn`, erreurs de fenêtre et promesses rejetées depuis le chargement. |
| `H.tauri()` | Vrai dans l'app de bureau. |

Une base de données se lit et s'écrit comme le fait l'app : `const { getDatabase } = await import("/src/services/sqlite/database.ts")`.

## Limites connues

- `window.__TAURI_INTERNALS__.invoke` est en lecture seule : on ne peut pas l'intercepter. Un clic sur un lien externe ouvre réellement le navigateur de l'utilisateur.
- `window.confirm` natif peut bloquer la page : le remplacer (`window.confirm = () => true`) avant de cliquer, et le dire.
- Une tâche en cours est perdue si la page se recharge (modification du code, redémarrage de Vite) : relancer.
- Pas de capture d'écran (GNOME la refuse) : se fier au texte et au DOM.
- La VM a peu de mémoire (3,4 Go) : ne pas lancer à côté un second serveur de développement et un navigateur.

## Règle de travail

Tester dans la vraie app déverrouillée dès que c'est possible, parcours au clic compris. **Sauvegarder la base avant** (`VACUUM INTO` depuis une connexion en lecture seule), marquer les données de test (`ZZ-TEST`), et **nettoyer complètement après**, en vérifiant les compteurs avant/après.
