# Faille de sécurité des notes : bilan du 26 novembre 2026

**Branche :** `fix/securite-2026-11-26`, partie de `master` (`54e874c0`, la 5.3.0). Locale, **non poussée** ; ni `master` ni aucun tag n'ont bougé.
**Source :** le brief du 26/11 et `VERDICT-AGY.md` (Hydrogen), relus avant de commencer.

## En une phrase

L'aperçu d'une note exécutait le HTML stocké (restauration, import, poste pair) et l'application ne se défendait ensuite en rien (pas de CSP, permissions sur tout le dossier personnel). C'est prouvé dans Chromium **et** dans l'app Linux empaquetée, avant et après. Les quatre correctifs sont en place ; ce qui ne peut pas être prouvé ici (macOS, Windows) est listé plus bas.

## 1. La faille, prouvée avant de corriger

Quinze charges utiles écrites **directement dans la base** (le chemin d'une restauration ; jamais par l'éditeur), puis chaque note ouverte en Aperçu, comme une personne le ferait (`outils/charges.mjs`, relevés `releves/avant.json` et `apres.json`).

| | Charges avec un effet |
|---|---|
| **Avant** (master) | **9 sur 15** : `onerror` (2 formes), `<iframe srcdoc>`, lien `javascript:`, `ontoggle`, `onclick`, `formaction` exécutent du code ; une balise image appelle un hôte extérieur ; un `style` recouvre tout l'écran |
| **Après** | **0 sur 15** |
| Note légitime riche (titres, styles, liens, listes, tâches, code, tableau fusionné) | affichée **à l'identique** avant et après |

Dans l'**app Linux empaquetée** (WebKitGTK, `tauri://localhost`), même note piégée :
- avant : le code s'exécute (`pwned: [1, 1]`) et la charge reste intacte dans l'aperçu ;
- après : rien ne s'exécute ; l'image, le lien `javascript:` et l'`onclick` sont retirés.

## 2. Les quatre correctifs

### 2.1 Filtre HTML à liste blanche (`src/lib/sanitize-html.ts`)
- **DOMPurify 3.5.0**, liste blanche **relevée dans Chromium** sur ce que l'éditeur écrit réellement (mêmes extensions que `Editor.tsx`) : 31 balises, 18 couples balise/attribut, chacun avec le format de valeur de l'éditeur. Ni image, svg, math, cadre, formulaire, script, balise de style, ni attribut `on…`.
- Un `style` n'est gardé que sur `table` et `col` et seulement en largeur en pixels (c'est ce que les tableaux redimensionnables écrivent) ; une `class` seulement pour le langage d'un bloc de code ; un lien seulement en `http`, `https`, `mailto`, `tel`, avec `noopener noreferrer`.
- **Échec fermé** : sans DOM complet, le texte est rendu **échappé**. (DOMPurify, lui, rend alors le HTML tel quel en silence : j'ai écarté ce comportement, et la suite a révélé le cas du `window` partiel, corrigé.)
- **Appliqué** à l'aperçu de `NotesPro` **et en amont** : le dépôt des notes filtre à la lecture et à l'écriture. Tout autre point d'écriture de HTML est recensé par un test de garde (`html-sinks.test.ts`) : un nouveau point doit être revu.
- `chart.tsx` (le second `dangerouslySetInnerHTML`) : l'identifiant, la clé et la couleur sont validés ; sortie **identique** pour la configuration actuelle.
- **Aucune mise en forme légitime ne saute** : sur les 21 notes de la copie locale (histogramme des balises, aucun contenu lu), tout est dans la liste blanche ; la sortie réelle de l'éditeur passe à l'identique (test et banc).

### 2.2 CSP Tauri et fin du script inline
```
frame-src 'self'; font-src 'self' data:; base-uri 'self'; img-src 'self' data: blob: asset: http://asset.localhost https://asset.localhost; default-src 'self'; form-action 'self'; connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost https://asset.localhost https:; script-src 'self' 'wasm-unsafe-eval'; media-src 'self' blob:; object-src 'none'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:
```
- Le script de `index.html` est un fichier de `public/` : **plus aucun script inline** (test).
- `withGlobalTauri` à **false** (`window.__TAURI__` disparaît ; `__TAURI_INTERNALS__` reste, nécessaire à l'application).
- Tauri ajoute lui-même 208 empreintes `sha256` à `script-src` (scripts inline des pages HTML de `public/`) : sans conséquence.

### 2.3 Permissions réduites à ce que l'application appelle
Inventaire du code : plugins fichiers, dialogue, SQL, processus, mise à jour ; commandes de fichiers réellement appelées : `exists`, `mkdir`, `readFile`, `readTextFile`, `remove`, `writeFile`, `writeTextFile`, toutes sous `$APPDATA`.
- **Retiré** : périmètres `$HOME`, `$DESKTOP`, `$DOWNLOAD`, `$DOCUMENT` ; `read_dir`, `copy_file`, `read`, `write` ; `sql:load` ; `dialog:ask` ; `process:exit`.
- **Gardé, avec la raison** : `dialog:allow-message` et `allow-confirm`, parce que le plugin de dialogue remplace `window.alert` et `window.confirm` par ces appels (`init-iife.js`) : les retirer aurait cassé toutes les confirmations de l'application. `sql:allow-select/execute/close` : l'application lit et écrit sa base par ce plugin.
- Les fichiers choisis dans une boîte de dialogue **entrent seuls** dans le périmètre (code source du plugin, `commands.rs`) : les exports et imports continuent sans les dossiers personnels.

### 2.4 Pièces jointes
`window.open(dataUrl)` ne s'exécute plus que si l'adresse **elle-même** (pas le champ `mimeType` de la ligne) a un type permis : **PDF, PNG, JPEG, WebP, HEIC, HEIF**, les types que le dépôt de fichiers accepte. Un type refusé donne un message et n'ouvre rien. Les deux sites passent par le même filtre, et un test interdit tout autre `window.open` d'une adresse `data:`.

## 3. Preuves

| Contrôle | Résultat |
|---|---|
| `tsc` app et node | 0 |
| ESLint `--max-warnings=0` | 0 |
| Suite complète | **2 398 / 2 398** (2 271 sur master + **127** nouveaux) |
| Biome | `src` **39** erreurs (master 40), `tests` **94** (master 94) ; avertissements inchangés (499 et 8) ; aucune erreur nouvelle |
| `npm ci` depuis le lock | réussi, 799 paquets ; `@napi-rs/canvas` inchangé à 1.0.9 |
| Budget de démarrage (`check:startup`) | 923,8 ko, 282,6 ko gzip (identique à avant) |
| Banc Chromium des 15 charges | 9 avant, **0** après ; note légitime identique |
| Parcours des 13 pages sous la vraie CSP (Chromium) | 0 violation causée par l'application, hors une détection `eval` de `zod` au démarrage, sans effet |
| App Linux empaquetée, **avant / après** | voir ci-dessous |
| Arbre exact de la branche compilé en app empaquetée et lancé | compile (48 s), reste lancé 30 s sans plantage |

**Nouveaux tests (127) :** filtre HTML 69 (50 charges dont mXSS, attributs, liens, styles, champs, fidélité sur la vraie sortie de l'éditeur, idempotence) ; sans DOM 6 ; pièces jointes 32 ; couleurs de graphique 16 ; gardes 4. **Mutations attrapées** : autoriser `img`, accepter un `href` quelconque, un style libre, retirer `td`, ne plus filtrer les champs, retirer le contrôle de support.

### App Linux empaquetée, même sonde, même base

| | **Avant** (master) | **Après** |
|---|---|---|
| `window.__TAURI__` | présent | absent |
| `eval` / `new Function` | permis | **refusés** |
| script inline, gestionnaire inline | s'exécutent | **refusés** |
| `fetch` en `http:` | refusé | refusé |
| WebAssembly, worker `blob:` | fonctionnent | fonctionnent |
| note piégée en Aperçu | **exécute** | rien |
| fichiers sous `$APPDATA` (mkdir, écriture, lecture, suppression) | OK | OK |
| `exists` / `read_dir` sur Bureau, Téléchargements, Documents | **OK, liste les fichiers** | refusé |
| `mkdir` dans `$HOME`, Bureau, Téléchargements, Documents | **OK** | refusé |
| `copy_file` | refusé (chemin absent) | refusé (non permis) |
| `sql:load` d'une base quelconque | **OK** | refusé |
| `sql:select` | OK | OK |
| 13 pages | 0 erreur | 0 erreur, 0 violation de l'application |

Le build de ces essais est `tauri build --debug --no-bundle` sur Linux arm64 (WebKitGTK). La sonde de **l'essai « après »** ajoute à la politique un seul élément de test (`connect-src http://127.0.0.1:5400` et `report-uri`, pour recevoir le rapport) ; tout le reste de la politique est celui de la branche.

## 4. Décisions pour toi

1. **`connect-src` contient `https:`.** Le serveur de licence est une variable de la CI (`vars.VITE_LICENSE_SERVER_URL`), absente du dépôt : la CSP statique ne peut pas nommer son domaine. L'effet : un script (s'il y en avait un) pourrait encore émettre vers un site `https` quelconque. Je recommande une étape de CI qui écrit l'adresse exacte dans la CSP ; je ne peux pas la tester sur les machines macOS et Windows d'ici.
2. **Risque de `'unsafe-eval'` pour l'IA locale.** `new Function` n'apparaît que dans le moteur onnxruntime : détection de capacité (`try/catch`, sans conséquence) et un chemin `emval` qui n'est appelé que par le **WebGPU**. WebKitGTK n'a pas de WebGPU : je n'ai pas pu l'exercer. **À essayer sur Mac et Windows : dictée, Assistant, recherche par embeddings.** Si l'un échoue, la correction est d'ajouter `'unsafe-eval'` à `script-src` (une ligne).
3. **Types de pièces jointes.** J'ai pris les types que le dépôt accepte (PDF, PNG, JPEG, WebP, **HEIC, HEIF**), pas les quatre du verdict : sinon une photo HEIC légitime ne s'ouvrirait plus sur Mac. Ne s'ouvrent plus : SVG, HTML, XML, JavaScript, texte, « flux d'octets » et tout le reste (un fichier `.docx` attaché par « tous les fichiers » ne s'ouvrirait plus, avec un message). Confirme.
4. **Le HTML déjà stocké n'est pas nettoyé dans la base.** Il est neutralisé à chaque lecture et à chaque écriture ; une note piégée restaurée reste telle quelle en base jusqu'à sa modification. Une migration qui nettoie les notes au démarrage et à la restauration modifierait tes données : je ne l'ai pas faite sans ton accord.
5. **La fenêtre `activation-admin` partage les permissions de la fenêtre principale.** Les scinder demande de savoir précisément ce que l'administration appelle ; je n'ai pas deviné.
6. **`style-src 'unsafe-inline'` reste** : les graphiques, l'impression et le positionnement de l'interface en ont besoin ; le retirer est un chantier à part.
7. **`jsdom` ajouté en dépendance de développement** (+38 paquets dans le lock) : les tests de filtrage ont besoin d'un vrai analyseur HTML, la suite n'en avait pas. Sans lui, aucun test automatisé du filtre.

## 5. Ce qui n'est pas prouvé

- **macOS et Windows : rien n'a été construit ni lancé ici.** Seul Linux l'a été. Les moteurs diffèrent : `'wasm-unsafe-eval'` dépend de la version de WebKit du système (`minimumSystemVersion` 11.0) ; le schéma `asset:` / `https://asset.localhost` et les workers se comportent différemment selon le moteur.
- **Fonctions non exercées sous la CSP empaquetée** (elles demandent des modèles, des boîtes natives ou le réseau) : dictée, embeddings, reconnaissance de texte (OCR), génération de note SOAP, impression des PDF, export et import de sauvegarde par boîte de dialogue, mise à jour, activation de licence auprès du vrai serveur, fenêtre d'administration, réseau de la clinique. Pour les boîtes de dialogue, je m'appuie sur le code du plugin (lu), pas sur un clic.
- **Le build empaqueté d'essai est un build `--debug --no-bundle`** : ni installateur (`.deb`, AppImage), ni profil `release` avec LTO ; la politique et les permissions sont les mêmes, les paquets sont construits par la CI.
- L'essai **« après »** a été sondé avec la politique de test (un élément de plus). L'arbre **exact** de la branche a été compilé et lancé 30 s, **pas sondé**.
- Le filtre n'a été éprouvé que dans **Chromium** et **WebKitGTK** (et jsdom pour les tests) ; ni WKWebView ni WebView2.
- Les points du verdict que je n'ai **pas** traités : l'image `data:` de `Avatar.tsx` (inerte dans une balise `<img>`), le retrait de `'unsafe-inline'` des styles.
- Le blast radius **SQL** reste : l'application a besoin de `sql:execute`. La faille est fermée à la source (plus d'injection de HTML) et durcie (CSP, permissions), mais un script qui s'exécuterait quand même pourrait toujours lire et écrire la base.

## 6. Hygiène de l'essai

Les essais ont tourné sur la copie locale de la base. **Sauvegardée avant** (`VACUUM INTO`), **restaurée après** (21 notes, aucune session ni note de test, intégrité `ok`). Les essais « avant » ont créé quatre dossiers `zz-sonde-interdite` (dans `$HOME`, Bureau, Téléchargements, Documents) et un fichier de base : tous retirés. Les traces du jour dans `~/.local/share/com.baitari.vetera` (sauvegarde automatique, stockage local) sont retirées. Les copies de travail et caches de compilation d'essai sont supprimés.

## 7. Commits

| | |
|---|---|
| `da07c63f` | banc de la faille, état avant |
| `31521bdc` | filtre HTML des notes, dépôt, graphique, dépendances |
| `70170881` | pièces jointes |
| `0539ac9a` | filtre : échec fermé avec un `window` incomplet |
| `7bc3be3d` | CSP, script externe, permissions |
