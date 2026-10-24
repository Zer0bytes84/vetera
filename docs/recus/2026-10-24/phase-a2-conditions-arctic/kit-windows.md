# Kit de mesure : arctic sur le PC Windows 8 Go (condition 3)

But : mesurer arctic dans le vrai moteur Windows (WebView2), sans rien extrapoler du Mac. On mesure quatre choses :
- la requête à chaud, courte et longue ;
- le pic de RAM ;
- l'indexation (1 000 extraits au minimum, Alloprof si le temps le permet) ;
- le démarrage et le chargement du modèle.

Rien n'est envoyé hors du poste. Les rapports ne contiennent que des durées, des scores et des identifiants opaques.

## 1. Préparer le poste (une fois)

1. Installer Node 22 LTS, Rust stable (`rustup`, cible MSVC), Git, et les outils de build C++ de Visual Studio (« Développement Desktop en C++ »). WebView2 est déjà présent sur Windows 10 et 11.
2. Cloner le dépôt sur la branche du bilan, puis, dans PowerShell à la racine :
   ```powershell
   npm ci
   cd src-tauri; cargo build; cd ..
   ```
3. Copier les modèles depuis le Mac. Le dossier `~/Library/Application Support/com.baitari.vetera/local-ai/` devient `%APPDATA%\com.baitari.vetera\local-ai\`. Il faut au minimum `arctic-embed-l-v2\` (592 Mo) et `embeddinggemma\` (1 261 Mo, référence v1). Garder les mêmes sous-dossiers.
4. Copier les jeux de mesure du Mac (`~/Library/Caches/baitari-eval/`) vers `%LOCALAPPDATA%\baitari-eval\` :
   - `public-sets.json` : jeux publics, aucun dossier patient ;
   - `cases.json` : **seulement si** le poste doit rejouer tes questions. Il contient des extraits de dossiers. Sinon, ne pas le copier : les mesures ci-dessous n'en ont pas besoin, sauf la tâche `b`.
5. Brancher le secteur, mode d'alimentation « Performances optimales », fermer les autres applications, désactiver la mise en veille. **La fenêtre du banc doit rester visible** pendant toute la mesure.

## 2. Lancer les mesures (dans cet ordre)

Depuis la racine du dépôt, dans PowerShell (`Set-ExecutionPolicy -Scope Process Bypass` si besoin) :

| # | Commande | Durée attendue | Mesure |
|---|---|---|---|
| 1 | `.\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-q -Tasks isolation,queries` | 3 à 6 min | isolation, OCR, PDF, dictée et générateur chargés, puis chargement du modèle, requêtes courtes et longues, threads appliqués |
| 2 | `.\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-q1 -Tasks queries -Threads 1` | 2 à 5 min | même chose sur 1 thread, pour comparer |
| 3 | `.\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-qv1 -Tasks queries -Model embeddinggemma` | 2 à 5 min | référence v1 |
| 4 | `.\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-ps -Tasks public -OnlySets "PublicHealthQA,SyntecRetrieval"` | 10 à 40 min | indexation de 395 extraits, qualité, requêtes longues |
| 5 | `.\scripts\eval-local-ai\windows\run-bench.ps1 -Label win-allo -Tasks public -OnlySets AlloprofRetrieval -MaxMinutes 480` | 1 à 6 h | indexation de 4 156 extraits (au-delà des 1 000 demandés), mémoire sur la durée, gel éventuel |

Chaque mesure écrit dans `%LOCALAPPDATA%\baitari-eval\` :
- `report-<label>.json` : résultats ;
- `report-<label>.progress.log` : journal, avec un pouls par minute et une ligne tous les 100 textes ;
- `mem-<label>.csv` : chaque seconde, mémoire privée et mémoire résidente WebView2 en Mo, RAM libre du système, charge CPU ;
- `poste-<label>.json` : RAM, processeur, cœurs, GPU et pilote, version de WebView2, Windows.

**Si une mesure semble figée** (plus de ligne nouvelle dans le journal depuis 20 min), ne pas l'arrêter tout de suite. Noter l'heure et si le « pouls » continue d'apparaître dans le journal, puis l'arrêter. C'est l'information qui permet de dire si le moteur ou la page est bloqué. Pour Alloprof, relancer la même commande reprend au dernier point de sauvegarde (tous les 500 textes).

## 3. Tableau à remplir

Recopier depuis les rapports, ou me renvoyer le dossier `baitari-eval` sans `cases.json`.

| Mesure | Où la lire | Mac M1 8 Go (référence) | PC Windows 8 Go |
|---|---|---|---|
| Processeur, cœurs logiques, GPU, WebView2 | `poste-win-q.json` | M1, 8 cœurs, WKWebView | |
| Isolation active (`crossOriginIsolated`, `sharedArrayBuffer`) | `report-win-q.json` → `isolation` | vrai, vrai | |
| Threads appliqués par le moteur | `report-win-q.json` → `queries.engine.threads` | 4 | |
| Chargement du modèle + 1re requête | `queries.firstWithLoadMs` | 5,2 s | |
| Requête courte à chaud, médiane / pire cas | `queries.short.medianMs` / `maxMs` | 105 / 214 ms | |
| Requête longue à chaud, médiane / pire cas | `queries.long.medianMs` / `maxMs` | 319 / 544 ms | |
| Même chose sur 1 thread (longue, médiane) | `report-win-q1.json` | 851 ms | |
| v1, requête longue, médiane | `report-win-qv1.json` | 305 ms | |
| Indexation, s par extrait (PHQA + Syntec) | `report-win-ps.json` → `index.passages[0].seconds / rows` | 0,77 à 0,88 s | |
| Indexation d'Alloprof, durée totale | `report-win-allo.json` | 66 min (0,96 s par extrait) | |
| Pic de mémoire privée WebView2 | max de la 2e colonne de `mem-win-allo.csv` | 5,4 Go (WebKit, médiane 3,6 à 3,9 Go) | |
| RAM libre la plus basse | min de la 4e colonne | — | |
| Gel observé (oui/non, à quel texte, pouls présent ?) | journal | voir le bilan | |
| Démarrage de l'app jusqu'au banc prêt | 1re ligne du journal moins la ligne `lancement` de `mem-*.csv` | — | |

## 4. Critères

Les mêmes que sur le Mac :
- requête à chaud de 200 ms ou moins ;
- indexation à 1,5 fois la v1 au plus ;
- pas de gel ;
- RAM compatible avec un poste de 8 Go, la RAM libre ne devant pas descendre sous environ 500 Mo pendant l'indexation.

## Limites du kit

- Le binaire est un build de debug, comme sur le Mac. Les écarts de vitesse avec un build de production sont faibles pour le moteur WASM, qui reste compilé de la même façon, mais ils existent pour le reste de l'app.
- Sous Windows, l'app est servie par `http://tauri.localhost`. L'isolation y passe par les mêmes en-têtes (`tauri.conf.json`). C'est justement ce que la ligne « Isolation active » vérifie.
