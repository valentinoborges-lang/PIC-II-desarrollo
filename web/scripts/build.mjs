import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of ['index.html', 'styles.css', 'js']) {
  await cp(join(root, entry), join(output, entry), { recursive: true });
}
try { await cp(join(root, 'public'), join(output, 'public'), { recursive: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const assetPaths = [
  'index.html',
  'styles.css',
  'js/app.js',
  'js/components/rpmChart.js',
  'js/services/measurementStore.js',
  'js/services/websocket.js',
  'js/utils/rpmClassification.js',
  'js/utils/statistics.js',
  'public/og.png'
];
const assets = {};
for (const assetPath of assetPaths) {
  const content = await readFile(join(output, assetPath));
  assets[`/${assetPath.replaceAll('\\', '/')}`] = content.toString('base64');
}

const workerSource = `
const assets = ${JSON.stringify(assets)};
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png'
};
function decode(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!assets[pathname] && !pathname.includes('.')) pathname = '/index.html';
    if (!assets[pathname]) return new Response('No encontrado', { status: 404 });
    const extension = pathname.slice(pathname.lastIndexOf('.'));
    const headers = { 'content-type': contentTypes[extension] || 'application/octet-stream' };
    if (extension === '.html') {
      const html = new TextDecoder().decode(decode(assets[pathname])).replaceAll('__SITE_ORIGIN__', url.origin);
      headers['cache-control'] = 'no-cache';
      return new Response(html, { headers });
    }
    headers['cache-control'] = extension === '.png' ? 'public, max-age=86400' : 'public, max-age=3600';
    return new Response(decode(assets[pathname]), { headers });
  }
};
`;

await mkdir(join(output, 'server'), { recursive: true });
await writeFile(join(output, 'server', 'index.js'), workerSource.trimStart(), 'utf8');
console.log(`Sitio preparado correctamente en ${relative(root, output)}/.`);
