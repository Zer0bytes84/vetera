#!/bin/zsh
# imprime toutes les secondes : horodatage, Go utilisés (active+wired+compressed), swap utilisé
while true; do
  vm_stat | awk -v t=$(date +%s) '/page size of/{ps=$8} /Pages active/{a=$3} /Pages wired/{w=$4} /occupied by compressor/{c=$5} END{gsub(/\./,"",a);gsub(/\./,"",w);gsub(/\./,"",c); printf "%s %.2f", t, (a+w+c)*ps/1e9}'
  sysctl -n vm.swapusage | awk '{printf " swap=%s\n", $6}'
  sleep 1
done
