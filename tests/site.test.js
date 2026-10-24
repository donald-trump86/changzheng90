import { createHash } from 'node:crypto';
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/serve.mjs';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const dist = join(root, 'dist');
const domain = 'changzheng90.luvch1nabest.me\n';
const historyImages = ['long-march-gathering.jpg', 'sixth-army-1935.jpg'];
before(() => execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root }));

function get(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, agent: false, ...options }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => { const bytes = Buffer.concat(chunks); resolve({ status: res.statusCode, type: res.headers['content-type'], headers: res.headers, bytes, body: bytes.toString('utf8') }); });
    });
    req.setTimeout(3000, () => req.destroy(new Error('HTTP check timed out')));
    req.on('error', reject);
    req.end();
  });
}

async function withServer(directory, run) {
  const server = await createStaticServer(directory);
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    await run(server.address().port);
  } finally {
    if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    assert.equal(server.listening, false, 'owned HTTP listener closed');
  }
}

async function withFixture(run) {
  const parent = await realpath(tmpdir());
  const fixture = await realpath(await mkdtemp(join(parent, 'chishui-site-')));
  try { await run(fixture); }
  finally {
    assert.equal(dirname(fixture), parent);
    assert.ok(basename(fixture).startsWith('chishui-site-'));
    assert.equal(await realpath(fixture), fixture);
    await rm(fixture, { recursive: true });
  }
}

test('custom domain is exact in source and deployment root', async () => {
  assert.equal(await readFile(join(root, 'public/CNAME'), 'utf8'), domain);
  assert.equal(await readFile(join(dist, 'CNAME'), 'utf8'), domain);
  assert.equal(await readFile(join(dist, '.nojekyll'), 'utf8'), '');
});

test('deployment contains only the public site, no source tooling or private artifacts', async () => {
  const entries = (await readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name).slice(dist.length + 1)).sort();
  const studyFiles = ['design-study/chishui-valley-study.png', 'design-study/long-march-gathering.jpg', 'design-study/sixth-army-1935.jpg'];
  const previews = ['valley-480', 'valley-960', 'valley-1440', 'valley-1774', 'gathering-320', 'gathering-585', 'sixth-army-320', 'sixth-army-698'].map(name => `public/images/${name}.webp`);
  assert.equal(entries.length, 35);
  assert.deepEqual(entries, ['.nojekyll', 'CNAME', 'audio-credits.html', 'index.html', 'public/favicon.svg', 'public/party-emblem.svg', 'public/audio/undertow.mp3', 'public/audio/the-great-sea.mp3', 'public/vendor/anime-4.5.0.esm.min.js', 'public/vendor/ANIME-LICENSE.txt', 'public/atlas-paper.png', 'public/fonts/chishui-atlas-display.woff2', 'public/fonts/ZHUQUE-OFL.txt', 'src/print-atlas.css', 'src/history-data.js', 'src/historical-map-data.js', 'src/historical-map.js', 'src/historical-map.css', 'public/map/region-relief.png', 'src/editorial-motion.js', 'src/editorial-motion.css', 'src/image-viewer.js', 'src/audio.js', 'src/history-scroll.js', ...studyFiles, ...previews].sort());
});

test('historical JPEGs have actual encoded bytes and identical deployment copies', async () => {
  for (const name of historyImages) {
    const original = await readFile(join(root, 'design-study', name));
    assert.deepEqual([...original.subarray(0, 3)], [255, 216, 255], name);
    assert.ok(original.length > 10000, `${name}: real photograph, not a placeholder`);
    assert.deepEqual(await readFile(join(dist, 'design-study', name)), original, name);
  }
});

test('responsive previews match encoded assets and preserved originals', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'docs/image-manifest.json'), 'utf8'));
  let count = 0;
  for (const image of manifest.images) {
    const source = await readFile(join(root, image.source.path));
    assert.equal(createHash('sha256').update(source).digest('hex'), image.source.sha256);
    assert.equal(source.length, image.source.bytes);
    for (const variant of image.variants) {
      assert.match(variant.path, /^public\/images\/[a-z0-9-]+\.webp$/);
      const bytes = await readFile(join(root, variant.path));
      assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
      assert.equal(bytes.length, variant.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256);
      assert.ok(variant.width <= image.source.width && variant.height <= image.source.height);
      assert.ok(variant.bytes < image.source.bytes);
      assert.deepEqual(await readFile(join(dist, variant.path)), bytes);
      count++;
    }
  }
  assert.equal(count, 8);
  const valley = manifest.images.find((item) => item.id === 'valley');
  assert.equal(valley.source.width, 1774);
  assert.equal(valley.source.height, 887);
  assert.notEqual(valley.source.sha256, 'c5084be3c29d97edf80bb99061b78b212a7c79b1686534977f2365749be9b201');
});

test('standard golden CPC emblem SVG is exact and free of scripts or external refs', async () => {
  const svg = await readFile(join(root, 'public/party-emblem.svg'));
  assert.equal(svg.length, 420);
  assert.equal(
    createHash('sha256').update(svg).digest('hex'),
    '3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3'
  );
  const text = svg.toString('utf8');
  assert.match(text, /viewBox="1 1 32 32"/);
  assert.match(text, /fill="#fdcf30"/);
  assert.doesNotMatch(text, /<script|href=|xlink:|animate|polygon/i);
});

test('new homepage is served at root with working images under a repository prefix', async () => {
  await withServer(dist, async (port) => {
    const home = await get(port, '/');
    assert.equal(home.status, 200);
    assert.match(home.body, /<title>长征路上，四渡赤水<\/title>/);
    assert.deepEqual(home.bytes, await readFile(join(root, 'index.html')));
  });
  await withFixture(async (fixture) => {
    await cp(dist, join(fixture, 'repository'), { recursive: true });
    await withServer(fixture, async (port) => {
      const base = new URL(`http://127.0.0.1:${port}/repository/index.html`);
      const html = await get(port, base.pathname);
      assert.equal(html.status, 200);
      assert.doesNotMatch(html.body, /reference-(?:weiriver|conference-1934)\.jpg|\/Users\/|artifacts\/|context-b\d+/);
      const modules = [...html.body.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
      const styles = [...html.body.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(modules, ['./src/editorial-motion.js']);
      assert.deepEqual(styles, ['./src/editorial-motion.css', './src/print-atlas.css', './src/historical-map.css']);
      const classics = [...html.body.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(classics, ['./src/history-data.js', './src/historical-map-data.js', './src/historical-map.js']);
      const visited = new Set();
      async function resource(ref, parent, type) {
        assert.match(ref, /^\.\.?\//, 'resources use local relative URLs');
        const url = new URL(ref, parent);
        assert.equal(url.origin, base.origin);
        assert.ok(url.pathname.startsWith('/repository/'), url.pathname);
        if (visited.has(url.pathname)) return;
        visited.add(url.pathname);
        const response = await get(port, url.pathname);
        assert.equal(response.status, 200, url.pathname);
        assert.match(response.type, type, url.pathname);
        const original = await readFile(join(root, url.pathname.slice('/repository/'.length)));
        assert.deepEqual(response.bytes, original, url.pathname);
        if (url.pathname.endsWith('.js')) {
          const bindings = new Map([...response.body.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([^'"]+)['"]/g)].map((match) => [match[1], match[2]]));
          const specs = [];
          for (const match of response.body.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)) specs.push(match[1]);
          for (const match of response.body.matchAll(/\bimport\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
            assert.ok(bindings.has(match[1]), `dynamic import binding stays locally resolvable: ${match[1]}`);
            specs.push(bindings.get(match[1]));
          }
          for (const match of response.body.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(match[1]);
          for (const spec of specs) await resource(spec, url, /^(?:text|application)\/javascript(?:;|$)/);
        }
        return response;
      }
      for (const ref of styles) {
        const sheet = await resource(ref, base, /^text\/css(?:;|$)/);
        if (ref.endsWith('/print-atlas.css')) {
          const urls = [...sheet.body.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map((match) => match[1]);
          assert.deepEqual(urls.sort(), ['../public/atlas-paper.png', '../public/fonts/chishui-atlas-display.woff2']);
          const sheetURL = new URL(ref, base);
          for (const asset of urls) {
            const font = asset.endsWith('.woff2');
            const result = await resource(asset, sheetURL, font ? /^font\/woff2(?:;|$)/ : /^image\/png(?:;|$)/);
            if (font) {
              assert.equal(result.bytes.subarray(0, 4).toString('ascii'), 'wOF2');
              assert.ok(result.bytes.length <= 500 * 1024, 'display subset stays within 500KiB');
              assert.equal(result.bytes.readUInt32BE(8), result.bytes.length, 'WOFF2 encoded length matches');
            } else assert.deepEqual([...result.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
          }
          const ofl = await resource('./public/fonts/ZHUQUE-OFL.txt', base, /^text\/plain(?:;|$)/);
          assert.match(ofl.body, /SIL OPEN FONT LICENSE Version 1\.1[\s\S]*PREAMBLE[\s\S]*DEFINITIONS[\s\S]*PERMISSION & CONDITIONS[\s\S]*TERMINATION[\s\S]*DISCLAIMER/);
          assert.match(ofl.body, /Copyright \(c\) 2023, Zhejiang JadeFoci/);
        }
      }
      for (const ref of [...classics, ...modules]) await resource(ref, base, /^(?:text|application)\/javascript(?:;|$)/);
      for (const match of html.body.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        await resource(match[1], base, /^(?:text|application)\/javascript(?:;|$)/);
      }
      const reliefRef = [...html.body.matchAll(/<image\b[^>]*\bdata-map-src="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(reliefRef, ['./public/map/region-relief.png']);
      const relief = await resource(reliefRef[0], base, /^image\/png(?:;|$)/);
      assert.deepEqual([...relief.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(relief.bytes.readUInt32BE(16), 600);
      assert.equal(relief.bytes.readUInt32BE(20), 492);
      assert.ok(visited.has('/repository/public/vendor/anime-4.5.0.esm.min.js'), 'follow actual module import to bundled Anime');
      const license = await resource('./public/vendor/ANIME-LICENSE.txt', base, /^text\/plain(?:;|$)/);
      assert.match(license.body, /MIT License[\s\S]*Copyright[\s\S]*Permission is hereby granted[\s\S]*THE SOFTWARE IS PROVIDED "AS IS"/);
      assert.equal((await get(port, '/repository/public/vendor/anime-4.5.0.esm.min.js')).bytes.length, 118678);
      const previews = new Set([...html.body.matchAll(/<source\b[^>]*\bsrcset="([^"]+)"/g)].flatMap(match => match[1].split(',').map(item => item.trim().split(/\s+/)[0])));
      assert.equal(previews.size, 8, 'all responsive variants are wired');
      for (const ref of previews) {
        const preview = await resource(ref, base, /^image\/webp(?:;|$)/);
        assert.equal(preview.bytes.subarray(8, 12).toString(), 'WEBP');
      }
      const viewerAnchors = [...html.body.matchAll(/<a\b[^>]*\bdata-image-view\b[^>]*>/g)].map((match) => match[0]);
      const originals = new Set(viewerAnchors.map((tag) => (tag.match(/\bhref="([^"]+)"/) || [])[1]));
      assert.deepEqual([...originals].sort(), ['./design-study/chishui-valley-study.png', './design-study/long-march-gathering.jpg', './design-study/sixth-army-1935.jpg']);
      for (const ref of originals) {
        const url = new URL(ref, base);
        assert.equal(url.origin, base.origin);
        assert.ok(url.pathname.startsWith('/repository/design-study/'));
        const response = await get(port, url.pathname);
        assert.equal(response.status, 200, url.pathname);
        assert.equal(response.type, ref.endsWith('.png') ? 'image/png' : 'image/jpeg');
        assert.deepEqual(response.bytes, await readFile(join(root, url.pathname.slice('/repository/'.length))));
      }
      const imgRefs = [...new Set([...html.body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]))];
      assert.deepEqual(imgRefs.sort(), ['./public/images/gathering-585.webp', './public/images/sixth-army-698.webp', './public/images/valley-960.webp', './public/party-emblem.svg']);
      for (const ref of imgRefs) {
        const url = new URL(ref, base);
        assert.equal(url.origin, base.origin);
        assert.ok(url.pathname.startsWith('/repository/public/'));
        const response = await get(port, url.pathname);
        assert.equal(response.status, 200, url.pathname);
        if (ref.endsWith('.svg')) {
          assert.match(response.type, /^image\/svg\+xml(?:;|$)/);
        } else {
          assert.equal(response.type, 'image/webp');
          assert.equal(response.bytes.subarray(8, 12).toString(), 'WEBP');
        }
        assert.deepEqual(response.bytes, await readFile(join(root, url.pathname.slice('/repository/'.length))));
      }
    });
  });
});

test('source and built servers return 404 and deny encoded traversal and hidden paths', async () => {
  for (const directory of [root, dist]) await withServer(directory, async (port) => {
    for (const path of ['/missing-file', '/src/', '/docs/absent']) assert.equal((await get(port, path)).status, 404, path);
    for (const path of ['/%2e%2e/package.json', '/%2E%2E%2Fpackage.json', '/src/%2e%2e/story.js', '/.git/config', '/.superpowers/sdd/private.md']) {
      assert.equal((await get(port, path)).status, 403, path);
    }
    assert.equal((await get(port, '/%ZZ')).status, 400);
  });
});

test('a symlink to a real file outside the served root is refused', async () => {
  await withFixture(async (fixture) => {
    const served = join(fixture, 'served');
    await mkdir(served);
    await writeFile(join(fixture, 'outside.txt'), 'must never be served');
    await symlink(join(fixture, 'outside.txt'), join(served, 'escape.txt'));
    await withServer(served, async (port) => {
      const response = await get(port, '/escape.txt');
      assert.equal(response.status, 403);
      assert.ok(!response.body.includes('must never be served'));
    });
  });
});


test('local audio supports exact GET ranges, suffixes, HEAD and 416', async () => {
  const original = await readFile(join(root, 'public/audio/undertow.mp3'));
  assert.ok(original.length > 100000, 'actual encoded instrumental asset');
  await withServer(dist, async (port) => {
    const path = '/public/audio/undertow.mp3';
    const full = await get(port, path);
    assert.equal(full.type, 'audio/mpeg');
    assert.deepEqual(full.bytes, original);
    assert.equal(full.headers['accept-ranges'], 'bytes');
    for (const [range, start, end] of [['bytes=0-127', 0, 127], ['bytes=128-', 128, original.length - 1], ['bytes=-97', original.length - 97, original.length - 1], ['bytes=0-999999999', 0, original.length - 1]]) {
      const part = await get(port, path, { headers: { Range: range } });
      assert.equal(part.status, 206, range);
      assert.equal(part.headers['content-range'], `bytes ${start}-${end}/${original.length}`);
      assert.equal(Number(part.headers['content-length']), end - start + 1);
      assert.deepEqual(part.bytes, original.subarray(start, end + 1));
    }
    const head = await get(port, path, { method: 'HEAD', headers: { Range: 'bytes=0-127' } });
    assert.equal(head.status, 206);
    assert.equal(head.bytes.length, 0);
    assert.equal(head.headers['content-length'], '128');
    const fullHead = await get(port, path, { method: 'HEAD' });
    assert.equal(fullHead.status, 200);
    assert.equal(Number(fullHead.headers['content-length']), original.length);
    assert.equal(fullHead.bytes.length, 0);
    for (const range of [`bytes=${original.length}-`, 'bytes=5-2', 'bytes=-0', 'bytes=0-1,4-5', 'bytes=nope']) {
      const invalid = await get(port, path, { headers: { Range: range } });
      assert.equal(invalid.status, 416, range);
      assert.equal(invalid.headers['content-range'], `bytes */${original.length}`);
    }
  });
});

test('current deployed pages and modules contain no personal signature', async () => {
  for (const file of ['index.html', 'audio-credits.html', 'src/history-data.js', 'src/image-viewer.js', 'src/audio.js', 'src/history-scroll.js', 'src/editorial-motion.js', 'src/editorial-motion.css', 'src/print-atlas.css', 'src/historical-map.js', 'src/historical-map.css', 'src/historical-map-data.js']) {
    assert.doesNotMatch(await readFile(join(dist, file), 'utf8'), /戴诗旭|Jason Dai|作品作者：/i, file);
  }
});

test('atlas CSS styles CPC emblem backing, dark archive cabinet, native-width caps, and elevated paper rules', async () => {
  const atlas = await readFile(join(root, 'src/print-atlas.css'), 'utf8');
  const mapCss = await readFile(join(root, 'src/historical-map.css'), 'utf8');
  assert.match(atlas, /\.hero-emblem-backing\s*\{[\s\S]*?background:\s*#7A1E1A/i);
  assert.match(atlas, /\.archives-grid\s*\{[\s\S]*?background:\s*#221D18/i);
  assert.match(atlas, /\.archive-primary\s*\{[\s\S]*?max-width:\s*585px/);
  assert.match(atlas, /\.archive-secondary\s*\{[\s\S]*?max-width:\s*560px/);
  assert.doesNotMatch(atlas, /\.archive-secondary\s*\{[^}]*margin-top:\s*28px/);
  assert.match(atlas, /--surface-elevated:\s*#F7F2E7/i);
  assert.match(mapCss, /\.map-relief\s*\{[\s\S]*?opacity:\s*0\.48/);
});
