#!/bin/bash
# Pour chaque famille donnee (regle:mode), une a la fois : appliquer, prouver, controler, commiter seule.
# Une famille dont un fichier compile differemment est defaite et notee pour inspection.
cd /home/parallels/work/erreurs2-wt || exit 1
for item in "$@"; do
  RULE=${item%%:*}; MODE=${item##*:}
  [ -n "$(git status --porcelain -- src vite.config.ts)" ] && { echo "arbre non propre, arret"; exit 1; }
  RES=$(/home/parallels/work/famille-prouvee.sh "$RULE" "$MODE" --unsafe)
  echo "$RES" | head -1
  N=$(git diff --name-only | wc -l)
  [ "$N" -eq 0 ] && continue
  if echo "$RES" | grep -q DIFFERENT; then
    echo "$RES" | grep DIFFERENT > "/home/parallels/work/a-inspecter-$(basename $RULE).txt"
    git checkout -q -- .; echo "  -> defaite, a inspecter"; continue
  fi
  if ! /home/parallels/work/controles.sh > /home/parallels/work/controles-$(basename $RULE).log 2>&1; then
    cat /home/parallels/work/controles-$(basename $RULE).log; git checkout -q -- .; echo "  -> defaite, controles en echec"; continue
  fi
  git add -A src vite.config.ts && git commit -q -m "style: $(basename $RULE) (Ultracite)

$N fichiers. Preuve : JavaScript compile identique dans les $N (mode $MODE).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && echo "  -> commit $(git log --oneline -1 | cut -c1-7), controles OK"
done
