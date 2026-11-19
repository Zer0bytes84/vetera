#!/bin/bash
# Une famille Ultracite, appliquee seule, gardee seulement si chaque fichier compile au meme JavaScript.
# Usage : famille-prouvee.sh <regle> <mode de preuve : strict|syntaxe> [--unsafe]
cd /home/parallels/work/erreurs2-wt || exit 1
RULE=$1; MODE=$2; shift 2
/home/parallels/work/famille.sh "$RULE" "$@" >/dev/null
N=$(git diff --name-only | wc -l)
[ "$N" -eq 0 ] && { echo "$RULE : aucun correctif automatique"; exit 0; }
FLAG=""; [ "$MODE" = syntaxe ] && FLAG="--syntaxe"
OUT=$(node /home/parallels/work/js-identique.mjs $FLAG 2>&1)
echo "$RULE ($MODE) : $(echo "$OUT" | head -1)"
echo "$OUT" | grep DIFFERENT | head -20
