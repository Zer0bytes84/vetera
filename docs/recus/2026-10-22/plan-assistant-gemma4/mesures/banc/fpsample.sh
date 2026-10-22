#!/bin/zsh
# empreinte (Mo) du processus GPU et somme des renderers Claude, chaque seconde
while true; do
  g=$(footprint 5249 2>/dev/null | awk -F'Footprint: ' '/Footprint:/{split($2,a," "); v=a[1]; if(a[2]=="GB") v*=1024; print v; exit}')
  r=0; for p in $(pgrep -f "Claude Helper \(Renderer\)"); do v=$(footprint $p 2>/dev/null | awk -F'Footprint: ' '/Footprint:/{split($2,a," "); v=a[1]; if(a[2]=="GB") v*=1024; if(a[2]=="KB") v/=1024; print v; exit}'); r=$((r + ${v:-0})); done
  echo "$(date +%s) gpu=$g renderers=$r"
  sleep 1
done
