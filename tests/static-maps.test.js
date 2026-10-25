import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { renderStaticMap } from '../scripts/render-static-maps.mjs';

const context = {};
for (const name of ['history-data.js', 'historical-map-data.js']) {
  runInNewContext(await readFile(new URL(`../src/${name}`, import.meta.url), 'utf8'), context);
}
const mapData = context.ChishuiMapData;
const chapters = context.ChishuiHistory.chapters;

test('overview renders four canonical routes with independent semantics', () => {
  const html = renderStaticMap({ id: 'context-map', mapData, chapters });
  assert.equal((html.match(/data-static-route=/g) || []).length, 4);
  for (const n of [1, 2, 3, 4]) assert.ok(html.includes(mapData.geometry(n, 'overview').path), `overview route ${n}`);
  assert.match(html, /四渡赤水总览/);
  assert.match(html, /阶段行军概括连线/);
  assert.doesNotMatch(html, /id="(?:route-map|current-route)"|data-chapter=/);
});

test('overview identifies every reference town, all four stages and north', () => {
  const html = renderStaticMap({ id: 'overview-labels', mapData, chapters });
  for (const [key, place] of Object.entries(mapData.places)) {
    const [x, y] = mapData.node(key);
    assert.ok(html.includes(`data-static-place="${key}" cx="${x}" cy="${y}"`), key);
    assert.ok(html.includes(place.name), place.name);
  }
  assert.equal((html.match(/data-static-stage=/g) || []).length, 4);
  for (const n of [1, 2, 3, 4]) assert.ok(html.includes(`marker-end="url(#overview-labels-arrow-${n})"`));
  assert.match(html, /赤水河/);
  assert.match(html, />北</);
});

test('each chapter uses its own crossing geometry and keeps historical limits visible', () => {
  for (const chapter of [1, 2, 3, 4]) {
    const html = renderStaticMap({ id: `chapter-map-${chapter}`, chapter, mapData, chapters });
    assert.equal((html.match(/data-static-route=/g) || []).length, 1);
    assert.ok(html.includes(mapData.geometry(chapter, 'detail').path));
    assert.ok(html.includes(chapters[chapter - 1].date));
    assert.match(html, /不是本阶段全程/);
    assert.match(html, /不串联多个渡口/);
    assert.doesNotMatch(html, /data-chapter=/);
  }
});

test('combined maps have unique IDs and resolve every accessibility and marker reference', () => {
  const html = [null, 1, 2, 3, 4].map(chapter => renderStaticMap({ id: `static-${chapter ?? 'overview'}`, chapter, mapData, chapters })).join('');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const refs = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap(match => match[1].split(/\s+/));
  refs.push(...[...html.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1]));
  for (const ref of refs) assert.ok(ids.includes(ref), ref);
});

test('invalid chapter, prefix or missing geometry fails instead of showing chapter one', () => {
  assert.throws(() => renderStaticMap({ id: 'bad', chapter: 0, mapData, chapters }), /chapter/i);
  assert.throws(() => renderStaticMap({ id: 'bad', chapter: 5, mapData, chapters }), /chapter/i);
  assert.throws(() => renderStaticMap({ id: 'bad" onclick="x', mapData, chapters }), /id/i);
  assert.throws(() => renderStaticMap({ id: 'missing', mapData: null, chapters }), /map data/i);
});
