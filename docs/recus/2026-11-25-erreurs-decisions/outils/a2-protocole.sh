#!/bin/bash
# Protocole A2, fichier par fichier et cumulatif : on range les imports d'un seul fichier, on assemble, on compare au
# relevé de départ. Identique : le fichier reste rangé, on passe au suivant. Différent : le fichier est remis tel quel et
# noté avec l'écart. Usage : protocole.sh <liste de fichiers> <dossier de sortie>
LISTE=$1; OUT=$2; W=/tmp/claude-0/erreurs; A2=/tmp/claude-0/a2
cd $W || exit 1
export VITE_LICENSE_SERVER_URL=https://licence.example.invalid VITE_LICENSE_PUBLIC_KEY=$(cat $A2/key.b64) VITE_CONFIG_NATIVE_IGNORE_WARNING=true
mkdir -p $OUT; : > $OUT/journal.tsv
while read -r f; do
  [ -z "$f" ] && continue
  t0=$(date +%s.%N)
  npx biome check --write --formatter-enabled=false --linter-enabled=false --only=assist/source/organizeImports "$f" > /dev/null 2>&1
  if git diff --quiet -- "$f"; then echo -e "$f\tSANS_CHANGEMENT\t" >> $OUT/journal.tsv; continue; fi
  if ! A2_OUT=$A2/essai npx vite build --config a2-mesure.config.ts > $A2/essai.log 2>&1; then
    git checkout -q -- "$f"; echo -e "$f\tECHEC_ASSEMBLAGE\t" >> $OUT/journal.tsv; continue
  fi
  res=$(node $A2/compare.mjs $A2/base $A2/essai --detail)
  head=$(echo "$res" | head -1)
  if [[ $head == IDENTIQUE* ]]; then
    echo -e "$f\tIDENTIQUE\t$head" >> $OUT/journal.tsv
  else
    git diff -- "$f" > "$OUT/$(echo $f | tr / _).patch"
    echo "$res" > "$OUT/$(echo $f | tr / _).ecart.txt"
    git checkout -q -- "$f"
    echo -e "$f\t${head%% *}\t$head" >> $OUT/journal.tsv
  fi
  echo "$(wc -l < $OUT/journal.tsv) $f $(tail -1 $OUT/journal.tsv | cut -f2) $(printf '%.1f' $(echo "$(date +%s.%N) - $t0" | bc)) s"
done < $LISTE
git diff > $OUT/cumul.patch
