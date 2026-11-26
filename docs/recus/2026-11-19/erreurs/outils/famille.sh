#!/bin/bash
# Applique une seule regle ou action Ultracite sur le perimetre de npm run check, sans les fichiers exclus du formatage.
# Usage : famille.sh <regle> [--unsafe]
cd /home/parallels/work/erreurs2-wt || exit 1
RULE=$1; shift
mapfile -t EXCLUS < /home/parallels/work/exclus-formatage.txt
FILES=$(git ls-files src | grep -E '\.(tsx?|jsx?|css|json|jsonc)$' | grep -vxF -f /home/parallels/work/exclus-formatage.txt)
npx biome check --write --only="$RULE" "$@" $FILES biome.jsonc components.json eslint.config.js generate-license.ts package.json tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts 2>&1 | grep -E "Checked|Fixed|Found" | tail -3
