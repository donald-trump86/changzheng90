import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { renderMaoExhibition } from '../scripts/render-mao-exhibition.mjs';
import { initMaoExhibition } from '../src/mao-exhibition.js';

const context = {};
for (const name of ['history-data.js', 'historical-map-data.js']) {
  runInNewContext(await readFile(new URL(`../src/${name}`, import.meta.url), 'utf8'), context);
}
const regions = renderMaoExhibition(context.ChishuiMapData);
const combined = Object.values(regions).join('');

test('Zunyi prologue and literary interlude precede the four crossings; command exhibition follows them', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const order = ['zunyi', 'mountain-poems', 'crossings', 'mao-command', 'continuation'];
  const positions = order.map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(regions['zunyi-prologue'], /datetime="1935-01-15"[\s\S]*datetime="1935-01-19"[\s\S]*datetime="1935-01-28"[\s\S]*datetime="1935-01-29"/);
  assert.match(regions['mao-exhibition'], /三人军事指挥小组成立于二渡之后、三渡之前/);
  assert.match(regions['mao-exhibition'], /毛泽东、周恩来、王稼祥组成三人军事指挥小组/);
});

test('all three poems retain their verified text and state the limits of exhibition chronology', () => {
  const verses = [...regions['mountain-poems'].matchAll(/<blockquote\b[^>]*><p>(.*?)<\/p><\/blockquote>/g)]
    .map(([, verse]) => verse.replace(/<[^>]+>/g, ''));
  assert.deepEqual(verses, [
    '山，快马加鞭未下鞍。惊回首，离天三尺三。',
    '山，倒海翻江卷巨澜。奔腾急，万马战犹酣。',
    '山，刺破青天锷未残。天欲堕，赖以拄其间。',
  ]);
  assert.match(regions['mountain-poems'], /1934—1935年/);
  assert.match(regions['mountain-poems'], /展陈顺序不表示三首词写于遵义至土城之间/);
});

test('command map reuses all four canonical routes without creating conflicting chapter navigation', () => {
  const map = regions['mao-exhibition'];
  for (const number of [1, 2, 3, 4]) assert.ok(map.includes(context.ChishuiMapData.geometry(number, 'overview').path));
  assert.ok(map.includes(context.ChishuiMapData.path(context.ChishuiMapData.river.points)));
  assert.doesNotMatch(combined, /data-chapter-choice|data-chapter="/);
  assert.match(map, /本专题创作性主题文案，非毛泽东原话/);
  assert.match(map, /四渡结束，行军仍在继续/);
});

test('exhibition images are labelled as artwork and its local accessibility references resolve', () => {
  const ids = [...combined.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, names] of combined.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const name of names.split(/\s+/)) assert.ok(ids.includes(name), name);
  }
  const pictures = [...combined.matchAll(/<picture>.*?<\/picture>/g)].map(([picture]) => picture);
  assert.equal(pictures.length, 6);
  assert.ok(pictures.every(picture => /loading="lazy"/.test(picture) && /width="\d+" height="\d+"/.test(picture)));
  assert.equal((combined.match(/人物、陈设与山河为艺术构图，不是历史照片或现场复原/g) || []).length, 5);
  assert.match(combined, /<details id="exhibition-sources" class="exhibition-sources">/);
});

test('strategy follows the article at the reading line and preserves manual choice in tablet columns', () => {
  const observers = [];
  const windowEvents = {};
  const boxes = { judge: [-376, 24], divert: [24, 424], initiative: [424, 824] };
  const scenes = Object.keys(boxes).map(key => ({
    dataset: { strategyScene: key },
    getBoundingClientRect: () => ({ top: boxes[key][0], bottom: boxes[key][1] }),
  }));
  const links = Object.keys(boxes).map(key => ({
    dataset: { strategyChoice: key },
    addEventListener(name, listener) { this[name] = listener; },
    setAttribute() {}, removeAttribute() {},
  }));
  const map = { dataset: { strategy: 'judge' } };
  const caption = {};
  const win = {
    innerHeight: 900, AbortController,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener(name, listener) { windowEvents[name] = listener; },
    IntersectionObserver: class {
      constructor(callback, options) { Object.assign(this, { callback, options }); observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; } unobserve() {}
    },
    MutationObserver: class { observe() {} disconnect() {} },
  };
  const doc = { defaultView: win, body: { dataset: {} }, addEventListener() {} };
  const root = {
    ownerDocument: doc,
    querySelector: selector => ({ '.mao-exhibition': {}, '[data-command-map]': map, '[data-strategy-caption]': caption })[selector],
    querySelectorAll: selector => ({ '[data-strategy-choice]': links, '[data-strategy-scene]': scenes })[selector] || [],
  };
  const controller = initMaoExhibition({ root });
  observers[0].callback();
  assert.equal(map.dataset.strategy, 'divert');
  assert.equal(caption.textContent, '三渡再西，四渡再东');
  assert.equal(observers[0].options.rootMargin, '-270px 0px -629px 0px');
  boxes.divert = [-376, 24]; boxes.initiative = [24, 424];
  observers[0].callback();
  assert.equal(map.dataset.strategy, 'initiative');
  for (const key of Object.keys(boxes)) boxes[key] = [24, 424];
  links[1].click({ button: 0 });
  observers[0].callback();
  assert.equal(map.dataset.strategy, 'divert');
  win.innerHeight = 600;
  windowEvents.resize();
  assert.ok(observers[0].disconnected);
  assert.equal(observers.at(-1).options.rootMargin, '-180px 0px -419px 0px');
  controller.destroy();
  assert.ok(observers.every(observer => observer.disconnected));
});
