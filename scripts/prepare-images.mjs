#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Run from any working directory. Override executable names/paths with MAGICK
// and CWEBP; arguments always go directly to execFile, never through a shell.
const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const magick = process.env.MAGICK || 'magick';
const cwebp = process.env.CWEBP || 'cwebp';
const quality = 84;
const manifestPath = 'docs/image-manifest.json';
const sources = [
  {
    id: 'valley',
    role: 'generated-artwork',
    path: 'design-study/chishui-valley-study.png',
    format: 'PNG', width: 1774, height: 887, bytes: 3018714,
    sha256: 'c5084be3c29d97edf80bb99061b78b212a7c79b1686534977f2365749be9b201',
    widths: [480, 960, 1440, 1774],
  },
  {
    id: 'gathering',
    role: 'historical-photograph-preview',
    path: 'design-study/long-march-gathering.jpg',
    format: 'JPEG', width: 585, height: 310, bytes: 71686,
    sha256: 'dcc1807e93537afdd8bc02978996cd52410a11e8e3009d50be9c68a01569ec8c',
    widths: [320, 585],
  },
  {
    id: 'sixth-army',
    role: 'historical-photograph-preview',
    path: 'design-study/sixth-army-1935.jpg',
    format: 'JPEG', width: 698, height: 357, bytes: 128640,
    sha256: 'ee2238bfcdf45a50af86302091cb9799de73b40e647b0cc99b51a9dc781e049f',
    widths: [320, 698],
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function absolute(path) {
  const result = resolve(root, path);
  assert(result.startsWith(`${root}/`), `Path escapes repository: ${path}`);
  return result;
}

async function inspectPath(path, kind, allowMissing = false) {
  try {
    const info = await lstat(absolute(path));
    assert(!info.isSymbolicLink(), `Refusing symlink: ${path}`);
    assert(kind === 'directory' ? info.isDirectory() : info.isFile(),
      `Expected ${kind}: ${path}`);
    assert(await realpath(absolute(path)) === absolute(path),
      `Refusing redirected path: ${path}`);
    return true;
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function execute(tool, args) {
  const { stdout } = await run(tool, args, {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' },
  });
  return stdout.trim();
}

async function identity(path) {
  const buffer = await readFile(absolute(path));
  return {
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

async function dimensions(path) {
  const decoded = await execute(magick, [
    'identify', '-regard-warnings', '-format', '%m %w %h', absolute(path),
  ]);
  const match = /^(PNG|JPEG|WEBP) (\d+) (\d+)$/.exec(decoded);
  assert(match, `Unexpected image format or frame count: ${path}: ${decoded}`);
  return { format: match[1], width: Number(match[2]), height: Number(match[3]) };
}

async function verifySource(source) {
  await inspectPath(source.path, 'file');
  const actual = { ...await identity(source.path), ...await dimensions(source.path) };
  for (const key of ['bytes', 'sha256', 'format', 'width', 'height']) {
    assert(actual[key] === source[key], `Source ${key} mismatch: ${source.path}`);
  }
  return { path: source.path, ...actual };
}

async function main() {
  assert(process.argv.length === 2, 'No CLI arguments supported; outputs are fixed.');
  assert(await realpath(root) === root, 'Repository root must not be redirected.');
  for (const path of ['scripts', 'docs', 'design-study']) {
    await inspectPath(path, 'directory');
  }
  // Validate all sources and destinations before the first write.
  const verifiedSources = [];
  for (const source of sources) verifiedSources.push(await verifySource(source));
  for (const path of ['public', 'public/images']) {
    await inspectPath(path, 'directory', true);
  }
  for (const source of sources) {
    for (const width of source.widths) {
      assert(Number.isInteger(width) && width > 0 && width <= source.width,
        `Invalid or upscaled width: ${source.id}: ${width}`);
      await inspectPath(`public/images/${source.id}-${width}.webp`, 'file', true);
    }
  }
  await inspectPath(manifestPath, 'file', true);
  const tools = {
    magick: (await execute(magick, ['-version'])).split('\n')[0],
    cwebp: (await execute(cwebp, ['-version'])).split('\n')[0],
  };
  await mkdir(absolute('public/images'), { recursive: true });
  const images = [];
  for (const [index, source] of sources.entries()) {
    const variants = [];
    for (const width of source.widths) {
      const height = Math.round(source.height * width / source.width);
      const path = `public/images/${source.id}-${width}.webp`;
      assert(height > 0 && height <= source.height, `Invalid height: ${path}`);
      await execute(cwebp, [
        '-quiet', '-q', String(quality), '-m', '6', '-sharp_yuv',
        '-metadata', 'none', '-resize', String(width), String(height),
        absolute(source.path), '-o', absolute(path),
      ]);
      const actual = await dimensions(path);
      assert(actual.format === 'WEBP' && actual.width === width && actual.height === height,
        `Encoded WebP dimensions mismatch: ${path}`);
      const header = await readFile(absolute(path));
      assert(header.toString('ascii', 0, 4) === 'RIFF'
        && header.toString('ascii', 8, 12) === 'WEBP', `Invalid WebP container: ${path}`);
      variants.push({ path, ...actual, quality, ...await identity(path) });
    }
    images.push({ id: source.id, role: source.role, source: verifiedSources[index], variants });
  }
  // Recheck originals after encoding; their encoded previews never replace them.
  for (const source of sources) await verifySource(source);
  const sourceBytes = images.reduce((sum, image) => sum + image.source.bytes, 0);
  const variantBytes = images.reduce((sum, image) =>
    sum + image.variants.reduce((subtotal, variant) => subtotal + variant.bytes, 0), 0);
  const largestVariantBytes = images.reduce((sum, image) =>
    sum + image.variants.at(-1).bytes, 0);
  const totals = {
    sourceBytes, variantBytes, largestVariantBytes,
    allVariantsSavedBytes: sourceBytes - variantBytes,
    allVariantsSavingPercent: Number(((1 - variantBytes / sourceBytes) * 100).toFixed(2)),
    largestVariantsSavedBytes: sourceBytes - largestVariantBytes,
    largestVariantsSavingPercent: Number(((1 - largestVariantBytes / sourceBytes) * 100).toFixed(2)),
  };
  const manifest = {
    schemaVersion: 1,
    encoding: {
      format: 'WEBP', quality, method: 6, sharpYuv: true, metadata: 'none',
      resize: 'full-frame; integer height rounded from original aspect ratio; no upscaling',
      tools,
    },
    images, totals,
  };
  await writeFile(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Verified ${images.length} unchanged sources and 8 WebP variants.`);
  console.log(JSON.stringify(totals));
}

main().catch((error) => {
  console.error(`prepare-images: ${error.message}`);
  process.exitCode = 1;
});
