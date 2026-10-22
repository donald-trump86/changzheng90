import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
function isInside(root, target) {
  const path = relative(root, target);
  return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`);
}

/** Caller owns listen/close, allowing bounded in-process HTTP smoke checks. */
export async function createStaticServer(root = projectRoot) {
  const realRoot = await realpath(root);
  if (!(await stat(realRoot)).isDirectory()) throw new Error('Root must be a directory');
  return createServer(async (request, response) => {
    const send = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      return send(405, 'Method not allowed');
    }
    let pathname;
    try { pathname = decodeURIComponent(request.url.split('?')[0]); }
    catch { return send(400, 'Malformed path'); }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0')) return send(400, 'Invalid path');
    // Inspect decoded segments before URL normalization can erase traversal evidence.
    if (pathname.split('/').some((segment) => segment.startsWith('.'))) return send(403, 'Forbidden');
    const candidate = resolve(realRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!isInside(realRoot, candidate)) return send(403, 'Forbidden');
    try {
      const target = await realpath(candidate);
      if (!isInside(realRoot, target)) return send(403, 'Forbidden');
      if (!(await stat(target)).isFile()) return send(404, 'Not found');
      const body = await readFile(target);
      response.writeHead(200, {
        'Content-Type': mime[extname(target).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) return send(404, 'Not found');
      if (['EACCES', 'EPERM'].includes(error.code)) return send(403, 'Forbidden');
      send(500, 'Unable to read file');
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.length && !(args.length === 2 && args[0] === '--root')) throw new Error('Usage: node scripts/serve.mjs [--root dist]');
    const port = Number(process.env.PORT ?? 4173);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
    const server = await createStaticServer(args.length ? resolve(projectRoot, args[1]) : projectRoot);
    server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Serving http://127.0.0.1:${port}${args.length ? ' (dist)' : ''}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
