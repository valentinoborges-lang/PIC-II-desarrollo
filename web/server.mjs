import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

createServer((request, response) => {
  const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = normalize(join(root, relativePath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Archivo no encontrado');
    return;
  }

  response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Tacómetro básico listo en http://${host}:${port}`);
});
