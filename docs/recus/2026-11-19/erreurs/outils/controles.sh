#!/bin/bash
# Les controles apres chaque famille : typecheck, lint a zero avertissement, suite complete. Sort en erreur au moindre
# echec reel. Seuls les deux tests de duree connus (charge de la VM) sont toleres, s'ils passent relances seuls.
cd /home/parallels/work/erreurs2-wt || exit 1
timeout 600 npm run typecheck >/dev/null 2>&1; T=$?; echo "typecheck: $T"
timeout 900 npm run lint -- --max-warnings=0 >/dev/null 2>&1; L=$?; echo "lint: $L"
OUT=$(timeout 1200 npm test 2>&1)
echo "$OUT" | grep -E "Test Files|Tests " | tr -s ' '
FAILS=$(echo "$OUT" | grep -E "^ FAIL " | awk '{print $2}' | sort -u)
KNOWN="tests/modules/dashboard/dashboard-widgets.test.ts tests/modules/patients/patient-record-pdf.test.ts"
REAL=0
for f in $FAILS; do
  case " $KNOWN " in *" $f "*) ;; *) echo "ECHEC REEL : $f"; REAL=1 ;; esac
done
if [ -n "$FAILS" ] && [ $REAL -eq 0 ]; then
  if timeout 300 npx vitest run $FAILS 2>&1 | grep -qE "Tests .*failed"; then echo "ECHEC REEL : $FAILS, aussi seuls"; REAL=1; else echo "toleres (duree, charge) et verts seuls : $FAILS"; fi
fi
[ $T -eq 0 ] && [ $L -eq 0 ] && [ $REAL -eq 0 ] && echo "CONTROLES OK" && exit 0
echo "CONTROLES EN ECHEC"; exit 1
