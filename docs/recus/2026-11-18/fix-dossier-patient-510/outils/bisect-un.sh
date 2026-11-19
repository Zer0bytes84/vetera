#!/bin/bash
# Construit le commit donne en build groupe (porte de licence levee) et sonde 3 fiches et Soins. Usage : bisect-un.sh <commit> <port>
C=$1; PORT=$2
cd /home/parallels/work/bisect-wt && git checkout -q --detach "$C" || exit 2
KEY=$(node -e 'const c=require("node:crypto");const {publicKey}=c.generateKeyPairSync("ec",{namedCurve:"prime256v1"});console.log(publicKey.export({format:"der",type:"spki"}).toString("base64"))')
OUT=/home/parallels/work/fixdossier-banc/bisect-$C
NODE_ENV=development VITE_LICENSE_SERVER_URL=https://licence.example.com VITE_LICENSE_PUBLIC_KEY=$KEY timeout 1200 npx vite build --mode development --minify false --outDir $OUT --emptyOutDir >/dev/null 2>&1 || { echo "$C : build en echec"; exit 3; }
echo "$C : $(python3 -I /home/parallels/work/fixdossier-banc/cycles-all.py $OUT | head -1)"
(cd $OUT && nohup python3 -I -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 2
cd /home/parallels/work/fixdossier-banc && timeout 600 node dossiers.mjs http://127.0.0.1:$PORT/ store.json 3 2>&1 | grep -E "fiches plantent" | sed "s/^/$C : /"
timeout 300 node clinique.mjs http://127.0.0.1:$PORT/ 2>&1 | python3 -I -c "import sys,json;d=json.load(sys.stdin);print('$C : Soins garde-fou', d['Soins']['gardeFou'], '| Hospitalisation garde-fou', d['Hospitalisation']['gardeFou'])"
pkill -f "http.server $PORT" 2>/dev/null; true
