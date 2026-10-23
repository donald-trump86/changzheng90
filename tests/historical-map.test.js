import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

const context = {};
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
