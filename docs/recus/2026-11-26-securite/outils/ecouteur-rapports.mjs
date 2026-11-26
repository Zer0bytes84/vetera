import http from 'node:http';
import fs from 'node:fs';
const [port, file] = process.argv.slice(2);
http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'cross-origin-resource-policy': 'cross-origin' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => { fs.appendFileSync(file, JSON.stringify({ path: req.url, ct: req.headers['content-type'], body: body.slice(0, 200000) }) + '\n'); res.writeHead(200, cors); res.end('ok'); });
}).listen(Number(port), '127.0.0.1', () => console.log('écouteur sur ' + port));
