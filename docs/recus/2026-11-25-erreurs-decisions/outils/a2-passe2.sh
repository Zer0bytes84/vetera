#!/bin/bash
# Seconde passe : chaque fichier non identique, rangé seul par-dessus les 225 fichiers identiques ; relevé détaillé.
W=/tmp/claude-0/erreurs; A2=/tmp/claude-0/a2; OUT=$A2/passe2; mkdir -p $OUT; cd $W
export VITE_LICENSE_SERVER_URL=https://licence.example.invalid VITE_LICENSE_PUBLIC_KEY=$(cat $A2/key.b64) VITE_CONFIG_NATIVE_IGNORE_WARNING=true
awk -F'\t' '$2!="IDENTIQUE"{print $1}' $A2/complet/journal.tsv | while read -r f; do
  n=$(echo $f | tr / _)
  npx biome check --write --formatter-enabled=false --linter-enabled=false --only=assist/source/organizeImports "$f" > /dev/null 2>&1
  A2_OUT=$A2/p2 npx vite build --config a2-mesure.config.ts > /dev/null 2>&1
  node $A2/compare.mjs $A2/base $A2/p2 --detail > $OUT/$n.txt
  if head -1 $OUT/$n.txt | grep -q CSS_CHANGE; then mkdir -p $OUT/$n.css; cp $A2/p2/css/* $OUT/$n.css/; fi
  git checkout -q -- "$f"; echo "$f $(head -1 $OUT/$n.txt | cut -d' ' -f1)"
done
