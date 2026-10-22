# Banc d'évaluation de l'assistant local

Mesure l'assistant tel que le vétérinaire le vit : vrais workers, vrais modèles installés, vrais garde-fous (`prepareSoapDraft`, `readDocumentAnswer`, `embedTexts`, `rankPatientChunks`), dans le webview de l'application de bureau. Rien de ce dossier n'entre dans le bundle de production.

## Garanties

- **Lecture seule.** `extract-cases.mjs` copie la base (avec son WAL) dans un dossier temporaire, l'ouvre en `readOnly`, puis supprime la copie. La page d'évaluation ne touche à aucune base : l'application est lancée avec `BAITARI_DATA_DIR` vers un dossier vide.
- **Rien ne sort du poste.** Le rapport (`report-<étiquette>.json`) ne contient que des identifiants opaques, des durées et des scores. Les mots altérés et les posologies détectées, à relire par le vétérinaire, vont dans `*.details-local.json`, qui reste sur le poste.
- **Aucune donnée inventée dans les scores.** Le cas fictif (`synthetic-latency-case.json`) ne sert qu'à la latence et à la mémoire.

## Déroulé

1. Annoter les questions (modèle : `annotations.example.json`), avec un vétérinaire de la clinique.
2. Extraire le corpus :
   ```bash
   node scripts/eval-local-ai/extract-cases.mjs --db "$HOME/Library/Application Support/com.baitari.vetera/baitari.db" --out "$HOME/Library/Caches/baitari-eval" --annotations annotations.json --with-synthetic
   ```
3. Fermer toute session `tauri dev`, car le port 5180 doit être libre. Lancer le serveur du banc, puis le binaire de debug avec un dossier de données vide :
   ```bash
   BAITARI_EVAL_CASES=$HOME/Library/Caches/baitari-eval/cases.json BAITARI_EVAL_OUT=$HOME/Library/Caches/baitari-eval/report-avant.json BAITARI_EVAL_LABEL=avant npx vite --config scripts/eval-local-ai/vite.eval.config.ts
   ```
   ```bash
   BAITARI_DATA_DIR=$(mktemp -d) src-tauri/target/debug/vetera
   ```
   La fenêtre ouvre directement le banc. La progression s'écrit dans `report-avant.progress.log` ; le rapport apparaît à la fin.
   Options : `BAITARI_EVAL_TASKS` (`a,b,c,synthetic` ; par défaut toutes), `BAITARI_EVAL_RUNS` (répétitions du cas fictif, 3 par défaut).
4. Rejouer avec l'autre configuration (autre modèle, autre code) sous l'étiquette `apres`, puis produire le tableau :
   ```bash
   node scripts/eval-local-ai/report.mjs report-avant.json report-apres.json > RAPPORT.md
   ```

Pour la mémoire, échantillonner chaque seconde l'empreinte (`footprint`) des processus `com.apple.WebKit.*` apparus avec l'application (macOS), ou du processus WebView2 (Windows).

## Tâches

| Tâche | Entrée | Mesures |
|---|---|---|
| A | dictées conservées (`consultation_soaps.transcript`) et note validée | acceptation au 1er essai et finale, fidélité à la trame, mots altérés, rangement, posologies inventées, durée, modèle prêt |
| B | questions annotées par patient | Rappel@5 lexical et hybride, MRR@10, nDCG@10, durée d'une requête, sections refusées |
| C | documents réels et pages attendues | réponses obtenues, citations pertinentes ou abstention correcte, durée |
| fictif | cas fictif × N, puis 5 recherches | latence et mémoire seulement |

Métriques et seuils : `docs/recus/2026-10-22/plan-assistant-gemma4/04-jeu-evaluation.md`.
