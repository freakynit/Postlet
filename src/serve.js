import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'dist');

const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

export function createServer({ rootDir = root } = {}) {
  return http.createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(req.url.split('?')[0]);
      if (url.endsWith('/')) url += 'index.html';
      let filePath = path.join(rootDir, url);
      if (!filePath.startsWith(rootDir)) { res.writeHead(403).end('forbidden'); return; }
      try { await fs.access(filePath); } catch {
        if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html');
      }
      const data = await fs.readFile(filePath);
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) {
      res.writeHead(404).end('not found');
    }
  });
}

export function startServer({ port = Number(process.env.PORT) || 8080, host = process.env.HOST || '127.0.0.1', rootDir = root } = {}) {
  const server = createServer({ rootDir });
  server.listen(port, host, () => console.log(`Serving ${path.relative(path.resolve(__dirname, '..'), rootDir)}/ at http://${host}:${port}`));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
