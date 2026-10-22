import { copyFile, lstat, mkdir, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = resolve(projectRoot, 'dist');
const sourceExtensions = new Set(['.js', '.css']);
const assetExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff2', '.txt']);
const files = ['index.html'];

async function inventory(directory, allowed) {
  for (const entry of (await readdir(join(projectRoot, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.name.startsWith('.')) continue;
    const name = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${name}`);
    if (entry.isDirectory()) await inventory(name, allowed);
    else if (entry.isFile() && (allowed.has(extname(entry.name).toLowerCase()) || (directory === 'public' && entry.name === 'CNAME'))) files.push(name);
  }
}
for (const directory of ['src', 'public']) {
  const info = await lstat(join(projectRoot, directory));
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Expected regular directory: ${directory}`);
}
await inventory('src', sourceExtensions);
await inventory('public', assetExtensions);
for (const name of files) {
  if (!(await lstat(join(projectRoot, name))).isFile()) throw new Error(`Expected regular file: ${name}`);
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
