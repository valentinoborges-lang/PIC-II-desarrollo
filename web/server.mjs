import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = normalize(pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    const filePath = join(root, requested);
    if (!filePath.startsWith(root) || !(await stat(filePath)).isFile()) throw new Error('Not found');
    const contentType = contentTypes[extname(filePath)] || 'application/octet-stream';
    const content = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(contentType.startsWith('text/html')
      ? content.toString('utf8').replaceAll('__SITE_ORIGIN__', `http://127.0.0.1:${port}`)
      : content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Tacómetro Digital listo en http://127.0.0.1:${port}`);
});
