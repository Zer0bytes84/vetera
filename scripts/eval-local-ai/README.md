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

## Jeux publics en français (permanents)

Les trois jeux du challenge de la recherche (Alloprof, Syntec, PublicHealthQA, issus de MTEB-French) servent de mesure permanente de la recherche, indépendante de la taille de la base locale. Sous-échantillon Alloprof fixe : 200 questions, 677 documents, identique au challenge.

```bash
node scripts/eval-local-ai/fetch-public-sets.mjs --out "$HOME/Library/Caches/baitari-eval"
```

Puis lancer le banc avec `BAITARI_EVAL_TASKS=public,b`, `BAITARI_EVAL_PUBLIC=$HOME/Library/Caches/baitari-eval/public-sets.json` et `BAITARI_EVAL_SIZES=800,1200` (tailles d'extraits à comparer). Chaque passage mesure les deux index sur le même encodage :
- l'index par rubriques (v2, actuel) : correspondances textuelles d'abord, refus au-delà de 2 048 tokens ;
- l'index par extraits (v3, phase A1) : meilleur extrait par document, score vectoriel avec bonus lexical.

Compter environ 1 h 30 pour Alloprof sur un poste à 8 Go (trois index encodés en WASM). **La fenêtre de debug doit rester visible à l'écran** : masquée, macOS la met en veille (App Nap), le calcul tombe à quelques pour cent de CPU et une requête finit par dépasser le délai de 480 s du moteur.

## Captures de l'écran de recherche

`vite.capture.config.ts` injecte `capture-scenario.ts` dans la fenêtre de debug. Le scénario règle le thème et l'index, ouvre la palette ou l'onglet « Cas similaires » de l'assistant, lance la recherche, puis restaure les réglages locaux de l'utilisateur. Le stockage local est partagé avec l'application réelle : le scénario sauvegarde chaque clé avant de la toucher (dans la session et dans `<signal>.originals.json`). Variables : `BAITARI_CAPTURE_SCENARIO` (`palette` ou `assistant`), `BAITARI_CAPTURE_THEME`, `BAITARI_CAPTURE_GENERATION` (`sections` ou `passages`), `BAITARI_CAPTURE_QUERY`, `BAITARI_CAPTURE_PATIENT`, `BAITARI_CAPTURE_SIGNAL`. Lancer avec un `BAITARI_DATA_DIR` contenant une copie de la base.

## Tâches

| Tâche | Entrée | Mesures |
|---|---|---|
| A | dictées conservées (`consultation_soaps.transcript`) et note validée | acceptation au 1er essai et finale, fidélité à la trame, mots altérés, rangement, posologies inventées, durée, modèle prêt |
| B | questions annotées par patient | Rappel@5, MRR@10 et nDCG@10 au niveau de la source, index par rubriques contre index par extraits, régressions question par question, requête à chaud |
| public | trois jeux publics en français | idem, plus documents refusés, lignes d'index et temps d'encodage |
| C | documents réels et pages attendues | réponses obtenues, citations pertinentes ou abstention correcte, durée |
| fictif | cas fictif × N, puis 5 recherches | latence et mémoire seulement |

Métriques et seuils : `docs/recus/2026-10-22/plan-assistant-gemma4/04-jeu-evaluation.md`.
