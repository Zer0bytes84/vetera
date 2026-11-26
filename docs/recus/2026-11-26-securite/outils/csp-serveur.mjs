import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [dir, port, cspFile] = process.argv.slice(2);
const csp = JSON.parse(fs.readFileSync(cspFile, 'utf8')).app.security.csp;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/__probe.js') { res.writeHead(200, { 'content-type': 'text/javascript', 'content-security-policy': csp }); res.end("try{eval('1');window.__probe={eval:false}}catch(e){window.__probe={eval:true}};try{new Function('return 1')();window.__probe.fn=false}catch(e){window.__probe.fn=true}"); return; }
  let file = path.join(dir, p === '/' ? 'index.html' : p);
  if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'content-security-policy': csp, 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(Number(port), '127.0.0.1', () => console.log('serveur CSP sur ' + port));
