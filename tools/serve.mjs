// Tiny zero-dependency static file server: node tools/serve.mjs [dir] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

export function serve(dir, port = 8080) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      const gz = req.headers['accept-encoding']?.includes('gzip') && fs.existsSync(file + '.gz');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
      res.end(gz ? fs.readFileSync(file + '.gz') : data);
    });
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2] || '.', port = +(process.argv[3] || 8080);
  serve(dir, port).then(() => console.log(`Serving ${dir} at http://localhost:${port}/`));
}
