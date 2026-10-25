import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/history-data.js';
import '../src/historical-map-data.js';
import { renderHistory } from './render-history.mjs';

const projectRoot = await realpath(fileURLToPath(new URL('../', import.meta.url)));
let html = await readFile(join(projectRoot, 'index.html'), 'utf8');
if (renderHistory(html, globalThis.ChishuiHistory, globalThis.ChishuiMapData) !== html) throw new Error('Historical HTML is stale; run node scripts/render-history.mjs');
const dist = resolve(projectRoot, 'dist');
const sourceFiles = new Set(['src/history-data.js', 'src/historical-map-data.js', 'src/historical-map.js', 'src/historical-map.css', 'src/print-atlas.css', 'src/editorial-motion.js', 'src/editorial-motion.css', 'src/audio.js', 'src/history-scroll.js', 'src/page-scroll.js', 'src/image-viewer.js']);
const imageFiles = ['valley-480', 'valley-960', 'valley-1440', 'valley-1774', 'gathering-320', 'gathering-585', 'sixth-army-320', 'sixth-army-698'].map(name => `public/images/${name}.webp`);
const assetFiles = new Set(['public/map/region-relief.png', 'public/atlas-paper.png', 'public/fonts/chishui-atlas-display.woff2', 'public/fonts/ZHUQUE-OFL.txt', 'public/vendor/anime-4.5.0.esm.min.js', 'public/vendor/ANIME-LICENSE.txt', 'public/vendor/lenis-1.3.27.esm.js', 'public/vendor/lenis-1.3.27-LICENSE.txt', 'public/favicon.svg', 'public/party-emblem.svg', 'public/audio/undertow.mp3', 'public/audio/the-great-sea.mp3', 'public/CNAME', ...imageFiles]);
const studyFiles = ['design-study/chishui-valley-study.png', 'design-study/long-march-gathering.jpg', 'design-study/sixth-army-1935.jpg'];
const files = ['index.html', 'audio-credits.html', ...studyFiles];

async function inventory(directory, allowed) {
  for (const entry of (await readdir(join(projectRoot, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.')) continue;
    const name = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${name}`);
    if (entry.isDirectory()) await inventory(name, allowed);
    else if (entry.isFile() && allowed.has(name)) files.push(name);
  }
}
for (const directory of ['src', 'public', 'design-study']) {
  const info = await lstat(join(projectRoot, directory));
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Expected regular directory: ${directory}`);
}
await inventory('src', sourceFiles);
await inventory('public', assetFiles);
for (const name of [...sourceFiles, ...assetFiles]) {
  if (!files.includes(name)) throw new Error(`Missing deploy file: ${name}`);
}
for (const name of files) {
  if (!(await lstat(join(projectRoot, name))).isFile()) throw new Error(`Expected regular file: ${name}`);
}

const hashes = new Map();
for (const name of files) {
  if (name === 'index.html' || name === 'audio-credits.html' || name === 'public/CNAME') continue;
  const bytes = await readFile(join(projectRoot, name));
  hashes.set(name, createHash('sha256').update(bytes).digest('hex').slice(0, 8));
}
const versionedHTML = html.replace(
  /\.\/((?:src|public|design-study)\/[^"'\s)]+\.(?:css|js|webp|png|jpg|jpeg|svg))(?:\?v=[0-9a-f]{8})?/g,
  (match, relPath) => {
    const version = hashes.get(relPath);
    if (!version) throw new Error(`Untracked versioned asset in index.html: ${relPath}`);
    return `./${relPath}?v=${version}`;
  }
);
if (versionedHTML !== html) {
  html = versionedHTML;
  await writeFile(join(projectRoot, 'index.html'), html);
}

// Deletion is confined to this verified, fixed absolute sibling of this project's src/.
if (!dist || !dist.startsWith('/') || dirname(dist) !== projectRoot || basename(dist) !== 'dist' || dist !== join(projectRoot, 'dist')) throw new Error('Unsafe build destination');
try {
  const info = await lstat(dist);
  if (info.isSymbolicLink() || !info.isDirectory() || await realpath(dist) !== dist) throw new Error('Refusing non-directory or linked dist destination');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist);
for (const name of files) {
  const output = join(dist, name === 'public/CNAME' ? 'CNAME' : name);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(join(projectRoot, name), output);
}
await writeFile(join(dist, '.nojekyll'), '');
console.log(`Built ${files.length + 1} static files into dist/`);
