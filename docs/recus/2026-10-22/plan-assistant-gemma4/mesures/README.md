# Mesures du 22 octobre 2026

Machine : Apple M1, 8 Go de mémoire unifiée, macOS (Darwin 27). Au départ, le système occupait déjà environ 6,2 Go et 3,5 à 4,7 Go de swap, avec l'application Claude, des navigateurs, etc. C'est un poste chargé, pas une machine de laboratoire.

Moteur : celui de l'application, depuis `node_modules`. `@mediapipe/tasks-genai` 0.10.29 en WebGPU pour la génération, transformers.js 3.8.1 avec onnxruntime-web en WASM sur 1 thread pour l'embedding. Les paramètres et la séquence de chargement sont ceux de `soap.worker.ts` : `createFromOptions` avec `maxTokens: 1024`, puis mesure du prompt, puis `setOptions` qui relit les poids, puis génération à température 0 et `topK` 1, puis `close()`.

Différences avec l'application, à garder en tête :
- Navigateur Chromium (panneau intégré), et non WKWebView ou WebView2. Les ordres de grandeur relatifs entre modèles sont fiables ; les valeurs absolues dans Tauri seront à reprendre en phase 0.
- Chargeur WASM « classique » de MediaPipe au lieu du chargeur module (même binaire de calcul).
- Poids servis par un petit serveur HTTP local (Python) au lieu du protocole de fichiers Tauri. Un passage E2B a échoué sur une erreur réseau du serveur (`ENOBUFS`) ; il a été écarté et refait.

Prompt : instructions et format identiques à `createSoapPrompt`, version abrégée des consignes de sécurité. **Dictée de test fictive** (boiterie, chien), sans aucune donnée patient. Variante « longue » : douze consultations d'historique fictives, soit environ 1 350 tokens d'entrée. La fidélité compte les phrases de la trame retrouvées mot pour mot (normalisées) dans la sortie.

Mémoire : empreinte (`footprint`) du processus GPU du navigateur et de ses processus de rendu, échantillonnée chaque seconde ; le surcoût est le pic simultané moins la ligne de base. Swap lu par `sysctl vm.swapusage`.

| Fichier | Contenu |
|---|---|
| `gemma3-1b.json`, `gemma3-1b-memoire-propre.txt` | Modèle actuel |
| `gemma4-e2b.json` | Variante retenue |
| `gemma4-e4b.json` | Variante écartée comme modèle par défaut |
| `embeddinggemma-300m-fp32.json` | Recherche actuelle |
| `banc/` | Pages, worker et échantillonneurs utilisés, pour reproduire les mesures (hors application, rien n'est ajouté au bundle) |

Les fichiers Gemma 4 téléchargés pour ces mesures (E2B, E4B) ont été supprimés après usage.
