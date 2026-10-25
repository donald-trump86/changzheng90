import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

const context = {};
runInNewContext(await readFile(new URL('../src/history-data.js', import.meta.url), 'utf8'), context);
runInNewContext(await readFile(new URL('../src/historical-map-data.js', import.meta.url), 'utf8'), context);
const data = context.ChishuiMapData;
const plain = (value) => JSON.parse(JSON.stringify(value));

test('modern reference points preserve verified coordinates and north-up geography', () => {
  const expected = {
    yuanhou: [28.36793, 105.93496], tucheng: [28.28377, 105.99306],
    taiping: [28.13949, 106.03787], erlang: [28.14908, 106.17013],
    maotai: [27.85453, 106.36753], zaxi: [27.84397, 105.04509],
    gulin: [28.04406, 105.8085], xishui: [28.31992, 106.20886],
    tongzi: [28.13724, 106.82375], zunyi: [27.7255, 106.9274]
  };
  assert.equal(Object.keys(data.places).length, 10);
  for (const [id, coordinates] of Object.entries(expected)) {
    assert.deepEqual(plain(data.places[id].latlon), coordinates, id);
    assert.equal(data.places[id].precision, 'modern-reference');
    assert.ok(data.places[id].source);
  }
  const point = (id) => data.project(data.places[id].latlon);
  assert.ok(point('yuanhou')[0] < point('tucheng')[0]);
  assert.ok(point('yuanhou')[1] < point('tucheng')[1]);
  assert.ok(point('taiping')[0] < point('erlang')[0]);
  assert.ok(point('maotai')[1] > point('erlang')[1]);
  assert.ok(point('zaxi')[0] < point('gulin')[0]);
  assert.ok(point('tongzi')[1] < point('zunyi')[1]);
  assert.ok(data.sources.geodata.license.includes('by-sa/4.0'));
  assert.ok(data.sources.wikidata.license.includes('zero/1.0'));
});

test('stage connections derive from shared identities without inventing city visits', () => {
  const stages = data.stages;
  for (let i = 0; i < 3; i++) {
    assert.equal(stages[i].nodes.at(-1), stages[i + 1].nodes[0]);
    assert.deepEqual(plain(data.node(stages[i].nodes.at(-1))), plain(data.node(stages[i + 1].nodes[0])));
  }
  assert.deepEqual(plain(stages[1].fords), plain(stages[3].fords));
  assert.ok(stages[1].nodes.includes('tongzi'));
  assert.ok(stages[1].nodes.includes('loushan'));
  assert.equal(stages[1].nodes.at(-1), 'zunyi');
  assert.equal(stages[2].nodes.at(-1), 'chuannan');
  assert.ok(!stages[2].nodes.includes('gulin'));
  assert.equal(stages[3].nodes.at(-1), 'south');
  assert.ok(!stages[3].nodes.includes('zunyi'));
  assert.equal(data.relations.jiuxikou.latlon, null);
  assert.match(data.relations.jiuxikou.description, /太平渡.*上游.*5/);
  assert.deepEqual(plain(data.relations.jiuxikou.stages), [2, 4]);
  assert.equal(data.relations.loushan.latlon, null);
  assert.match(data.river.notice, /原创概化/);
  assert.ok(!('jiuxikou' in data.places));
  assert.throws(() => data.node('jiuxikou'), /Unknown map node/);
});

test('overview and local crossing paths are continuous and stay inside their own windows', () => {
  for (let chapter = 1; chapter <= 4; chapter++) for (const view of ['overview', 'detail']) {
    const geometry = data.geometry(chapter, view);
    assert.equal((geometry.path.match(/M/g) || []).length, 1);
    assert.ok(geometry.points.length >= 3);
    assert.ok(!/NaN|undefined/.test(geometry.path));
    const [x, y, width, height] = geometry.viewBox;
    for (const [px, py] of geometry.points) {
      assert.ok(px > x && px < x + width, `${chapter}/${view}: x ${px}`);
      assert.ok(py > y && py < y + height, `${chapter}/${view}: y ${py}`);
    }
    assert.deepEqual(plain(geometry.start), plain(geometry.points[0]));
    if (view === 'detail') assert.match(geometry.notice, /代表渡河段/);
  }
  assert.throws(() => data.geometry(0, 'overview'), /Unknown chapter/);
  assert.throws(() => data.geometry(1, 'bogus'), /Unknown map view/);
});

test('fourth crossing continues south on the east bank and differs from the second', () => {
  assert.notEqual(data.geometry(2, 'detail').path, data.geometry(4, 'detail').path);
  const riverX = y => {
    for (let i = 1; i < data.river.points.length; i++) {
      const a = data.river.points[i - 1], b = data.river.points[i];
      if (y >= a[1] && y <= b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]);
    }
    throw new Error(`No river reference at ${y}`);
  };
  for (const mode of ['overview', 'detail']) {
    const points = data.geometry(4, mode).points;
    const [a, b] = points.slice(-2);
    assert.ok(b[1] > a[1], `${mode}: continues south`);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      assert.ok(x > riverX(y), `${mode}: east bank at ${x}, ${y}`);
    }
  }
});

test('every stage crosses the drawn river once at its representative ford', () => {
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
  for (const mode of ['overview', 'detail']) for (let chapter = 1; chapter <= 4; chapter++) {
    const route = data.geometry(chapter, mode).points, hits = [];
    for (let i = 1; i < route.length; i++) for (let j = 1; j < data.river.points.length; j++) {
      const p = route[i - 1], q = data.river.points[j - 1];
      const r = subtract(route[i], p), s = subtract(data.river.points[j], q);
      const denominator = cross(r, s);
      if (Math.abs(denominator) < 1e-9) continue;
      const difference = subtract(q, p), t = cross(difference, s) / denominator, u = cross(difference, r) / denominator;
      if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
        const hit = [p[0] + t * r[0], p[1] + t * r[1]];
        if (!hits.some(a => Math.hypot(a[0] - hit[0], a[1] - hit[1]) < .001)) hits.push(hit);
      }
    }
    assert.equal(hits.length, 1, `${chapter}/${mode}: ${JSON.stringify(hits)}`);
    const ford = data.fords[data.stages[chapter - 1].focus].xy;
    assert.ok(Math.hypot(hits[0][0] - ford[0], hits[0][1] - ford[1]) < .001, `${chapter}/${mode}: crosses at its ford`);
  }
});

test('overview stage badges leave space for one another and the route-end arrows', () => {
  const routes = [1, 2, 3, 4].map(n => data.geometry(n, 'overview'));
  const badges = data.overview.badges.map(({ segment, t }, i) => {
    const a = routes[i].points[segment], b = routes[i].points[segment + 1];
    return a.map((value, axis) => value + (b[axis] - value) * t);
  });
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (let i = 0; i < badges.length; i++) {
    for (let j = i + 1; j < badges.length; j++) assert.ok(distance(badges[i], badges[j]) > 90, `badges ${i + 1}/${j + 1}`);
    for (const route of routes) assert.ok(distance(badges[i], route.points.at(-1)) > 80, `badge ${i + 1} covers an arrow`);
  }
});

test('terrain provenance contains the complete 90-point grid and explicit coarse license', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(data.terrain.elevations)).digest('hex'),
    '459895dcfd12754008296c53afdaaf0f6dc01e7e342285dfea6edcb03ace345d');
  assert.deepEqual(plain(data.terrain.bbox), [104.85, 27.4, 107.15, 29.05]);
  assert.equal(data.terrain.elevations.length, 90);
  assert.equal(Math.min(...data.terrain.elevations), 210);
  assert.equal(Math.max(...data.terrain.elevations), 1845);
  const sourceURL = new URL(data.terrain.url);
  assert.equal(sourceURL.hostname, 'api.open-meteo.com');
  assert.equal(sourceURL.pathname, '/v1/elevation');
  assert.equal(sourceURL.searchParams.get('latitude').split(',').length, 90);
  assert.equal(sourceURL.searchParams.get('longitude').split(',').length, 90);
  assert.match(data.terrain.notice, /粗采样/);
  assert.match(data.terrain.license, /by\/4.0/);
});


test('map stage historical text comes from the canonical chapters, including edited facts', async () => {
  const canonical = context.ChishuiHistory;
  for (const [index, stage] of data.stages.entries()) {
    for (const [key, value] of Object.entries(canonical.chapters[index].mapStage)) assert.equal(stage[key], value);
  }
  const history = plain(canonical);
  for (const chapter of history.chapters) {
    chapter.mapStage.summary = `修改后的地图说明${chapter.id}`;
    chapter.mapStage.chronology = `修改后的时间顺序${chapter.id}`;
    chapter.mapStage.destination = `修改后的目的地${chapter.id}`;
  }
  const edited = { ChishuiHistory: history };
  const mapSource = await readFile(new URL('../src/historical-map-data.js', import.meta.url), 'utf8');
  runInNewContext(mapSource, edited);
  for (const [index, stage] of edited.ChishuiMapData.stages.entries()) {
    for (const [key, value] of Object.entries(history.chapters[index].mapStage)) assert.equal(stage[key], value);
    assert.deepEqual(plain(edited.ChishuiMapData.geometry(index + 1, 'overview')), plain(data.geometry(index + 1, 'overview')));
  }
  assert.throws(() => runInNewContext(mapSource, {}), /Load history-data.js before historical-map-data.js/);
});
