#!/bin/bash
# Mesure des tests de durée : N suites complètes telles quelles, puis N suites sans chunk-cycles suivies de chunk-cycles seul.
cd /tmp/claude-0/erreurs-b; OUT=/tmp/claude-0/duree; mkdir -p $OUT; N=${1:-3}
for i in $(seq 1 $N); do
  s=$(date +%s); npx vitest run --exclude tests/activation-server.test.mjs --reporter=json --outputFile=$OUT/tel-$i.json > /dev/null 2>&1; echo "tel $i $(( $(date +%s)-s )) s"
  s=$(date +%s); npx vitest run --exclude tests/activation-server.test.mjs --exclude tests/build/chunk-cycles.test.ts --reporter=json --outputFile=$OUT/sans-$i.json > /dev/null 2>&1; npx vitest run tests/build/chunk-cycles.test.ts --reporter=json --outputFile=$OUT/seul-$i.json > /dev/null 2>&1; echo "separe $i $(( $(date +%s)-s )) s"
done
