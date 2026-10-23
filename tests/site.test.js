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
const historyImages = ['long-march-gathering.jpg', 'sixth-army-1935.jpg', 'luding-bridge-museum.jpg', 'luding-chain-museum.jpg'];
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
  const studyFiles = ['design-study/index.html', 'design-study/chishui-valley-study.png', 'design-study/long-march-gathering.jpg', 'design-study/sixth-army-1935.jpg'];
  assert.equal(entries.length, 32);
  assert.deepEqual(entries, ['.nojekyll', 'CNAME', 'index.html', 'public/favicon.svg', ...historyImages.map((name) => `public/history/${name}`), 'public/internationale.mp3', 'public/party-emblem.svg', 'public/vendor/anime-4.5.0.esm.min.js', 'public/vendor/ANIME-LICENSE.txt', 'public/atlas-paper.png', 'public/fonts/chishui-atlas-display.woff2', 'public/fonts/ZHUQUE-OFL.txt', 'src/print-atlas.css', 'src/historical-map-data.js', 'src/historical-map.js', 'src/historical-map.css', 'public/map/region-relief.png', 'src/editorial-motion.js', 'src/editorial-motion.css', 'src/main.js', 'src/map.js', 'src/media.js', 'src/share.js', 'src/story.js', 'src/styles.css', ...studyFiles].sort());
});

test('published design study resolves local images under a repository prefix without private research', async () => {
  await withFixture(async (fixture) => {
    await cp(dist, join(fixture, 'repository'), { recursive: true });
    await withServer(fixture, async (port) => {
      const base = new URL(`http://127.0.0.1:${port}/repository/design-study/index.html`);
      const html = await get(port, base.pathname);
      assert.equal(html.status, 200);
      assert.doesNotMatch(html.body, /reference-(?:weiriver|conference-1934)\.jpg|\/Users\/|artifacts\/|context-b\d+|<audio\b/);
      const refs = new Set([...html.body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]));
      assert.equal(refs.size, 3);
      for (const ref of refs) {
        assert.match(ref, /^\.\//);
        const url = new URL(ref, base);
        assert.ok(url.pathname.startsWith('/repository/design-study/'));
        const response = await get(port, url.pathname);
        assert.equal(response.status, 200, ref);
        assert.equal(response.type, ref.endsWith('.png') ? 'image/png' : 'image/jpeg');
        assert.deepEqual(response.bytes, await readFile(join(root, 'design-study', basename(url.pathname))));
      }
      for (const name of ['long-march-gathering.jpg', 'sixth-army-1935.jpg']) {
        assert.deepEqual(await readFile(join(dist, 'design-study', name)), await readFile(join(root, 'public/history', name)));
      }
    });
  });
});

test('historical JPEGs have actual encoded bytes and identical deployment copies', async () => {
  for (const name of historyImages) {
    const original = await readFile(join(root, 'public/history', name));
    assert.deepEqual([...original.subarray(0, 3)], [255, 216, 255], name);
    assert.ok(original.length > 10000, `${name}: real photograph, not a placeholder`);
    assert.deepEqual(await readFile(join(dist, 'public/history', name)), original, name);
  }
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
      const modules = [...html.body.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
      const styles = [...html.body.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(modules, ['./src/editorial-motion.js']);
      assert.deepEqual(styles, ['./src/editorial-motion.css', './src/print-atlas.css', './src/historical-map.css']);
      const classics = [...html.body.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(classics, ['./src/historical-map-data.js', './src/historical-map.js']);
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
          for (const match of response.body.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
            await resource(match[1], url, /^(?:text|application)\/javascript(?:;|$)/);
          }
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
      const reliefRef = [...html.body.matchAll(/<image\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
      assert.deepEqual(reliefRef, ['./public/map/region-relief.png']);
      const relief = await resource(reliefRef[0], base, /^image\/png(?:;|$)/);
      assert.deepEqual([...relief.bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(relief.bytes.readUInt32BE(16), 600);
      assert.equal(relief.bytes.readUInt32BE(20), 492);
      assert.ok(visited.has('/repository/public/vendor/anime-4.5.0.esm.min.js'), 'follow actual module import to bundled Anime');
      const license = await resource('./public/vendor/ANIME-LICENSE.txt', base, /^text\/plain(?:;|$)/);
      assert.match(license.body, /MIT License[\s\S]*Copyright[\s\S]*Permission is hereby granted[\s\S]*THE SOFTWARE IS PROVIDED "AS IS"/);
      assert.equal((await get(port, '/repository/public/vendor/anime-4.5.0.esm.min.js')).bytes.length, 118678);
      const refs = new Set([...html.body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]));
      assert.deepEqual([...refs].sort(), ['./design-study/chishui-valley-study.png', './design-study/long-march-gathering.jpg', './design-study/sixth-army-1935.jpg']);
      for (const ref of refs) {
        const url = new URL(ref, base);
        assert.equal(url.origin, base.origin);
        assert.ok(url.pathname.startsWith('/repository/design-study/'));
        const response = await get(port, url.pathname);
        assert.equal(response.status, 200, url.pathname);
        assert.equal(response.type, ref.endsWith('.png') ? 'image/png' : 'image/jpeg');
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
  const original = await readFile(join(root, 'public/internationale.mp3'));
  assert.ok(original.length > 100000, 'actual encoded instrumental asset');
  await withServer(dist, async (port) => {
    const path = '/public/internationale.mp3';
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

test('static standard emblem and current deployed copy contain no personal signature', async () => {
  const emblem = await readFile(join(root, 'public/party-emblem.svg'), 'utf8');
  assert.equal(Buffer.byteLength(emblem), 420);
  assert.match(emblem, /viewBox="1 1 32 32"/);
  assert.match(emblem, /#fdcf30/i);
  assert.doesNotMatch(emblem, /<(?:script|animate|image|foreignObject)\b|(?:href|src)=/i);
  for (const file of ['index.html', 'src/main.js', 'src/map.js', 'src/share.js']) {
    assert.doesNotMatch(await readFile(join(dist, file), 'utf8'), /戴诗旭|Jason Dai|作品作者：/i, file);
  }
});
