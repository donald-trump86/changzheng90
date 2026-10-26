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

function motionFixture({ compact = false, reduced = false, mode, forcedColors = false, failWAAPI = false } = {}) {
  const calls = [];
  const observers = [];
  const covers = [];
  const media = {};
  function eventNode(properties = {}) {
    const listeners = {};
    return Object.assign({
      addEventListener(name, listener, options = {}) {
        (listeners[name] ||= []).push({ listener, options });
      },
      dispatch(name, event = {}) {
        for (const item of [...listeners[name] || []]) {
          if (!item.options.signal?.aborted) item.listener(event);
          if (item.options.once) listeners[name] = listeners[name].filter(value => value !== item);
        }
      },
    }, properties);
  }
  function node(selector = '', selectors = {}) {
    return eventNode({
      dataset: {},
      style: { removeProperty(name) { delete this[name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]; } },
      matches: value => value === selector,
      querySelector: value => selectors[value]?.[0],
      querySelectorAll: value => selectors[value] || [],
      setAttribute() {}, removeAttribute() {},
      getBoundingClientRect: () => ({ top: 0, bottom: 600 }),
      append(child) { child.parent = this; covers.push(child); },
      remove() { this.removed = true; },
      animate(frames, options) {
        if (failWAAPI) throw new Error('WAAPI unavailable');
        let resolve, reject;
        const animation = {
          finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
          finish: () => resolve(),
          cancelled: false,
          cancel() { this.cancelled = true; reject(new Error('cancelled')); },
        };
        calls.push({ target: this, frames, options, animation });
        return animation;
      },
    });
  }
  const heading = node();
  const lines = Array.from({ length: 4 }, () => node());
  const verse = node('.mountain-verse', { h3: [heading], 'blockquote p > span': lines });
  const img = node();
  Object.assign(img, { complete: true, naturalWidth: 800 });
  const woodcut = node('[data-woodcut-reveal]', { img: [img] });
  const incision = node('.woodcut-incision');
  const sequenceSelectors = {
    '.zunyi-questions': 'li',
    '.zunyi-departure ol': ':scope > li',
    '.command-timeline': ':scope > div',
    '.command-decisions': ':scope > article',
    '.command-last-words': ':scope > p',
  };
  const sequences = Object.entries(sequenceSelectors).map(([container, child]) => {
    const children = Array.from({ length: 3 }, () => node());
    return { target: node(container, { [child]: children }), children };
  });
  const themeLines = [node(), node()];
  const art = node();
  const thread = node();
  thread.getTotalLength = () => 720;
  const theme = node('.command-theme', {
    '[data-theme-line]': themeLines,
    '[data-theme-art]': [art],
    '.command-red-thread path': [thread],
  });
  const routes = ['1', '2', '3', '4'].map(number => Object.assign(node(), { dataset: { commandRoute: number } }));
  const map = node('', { '[data-command-route]': routes });
  map.dataset.strategy = 'judge';
  const links = ['judge', 'divert', 'initiative'].map(key => Object.assign(node(), { dataset: { strategyChoice: key } }));
  const scenes = ['judge', 'divert', 'initiative'].map(key => Object.assign(node(), { dataset: { strategyScene: key } }));
  const win = eventNode({
    innerHeight: 900, AbortController,
    matchMedia(query) {
      const matches = query.includes('reduced-motion') ? reduced : query.includes('forced-colors') ? forcedColors : compact;
      return media[query] = eventNode({ matches });
    },
    IntersectionObserver: class {
      constructor(callback, options) { Object.assign(this, { callback, options, targets: [] }); observers.push(this); }
      observe(target) { this.targets.push(target); }
      unobserve(target) { this.targets = this.targets.filter(node => node !== target); }
      disconnect() { this.disconnected = true; }
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() {} disconnect() {}
    },
  });
  const doc = eventNode({ defaultView: win, body: { dataset: { motion: mode } }, hidden: false, createElement: () => node() });
  const targets = [woodcut, incision, verse, theme, ...sequences.map(sequence => sequence.target)];
  const root = {
    ownerDocument: doc,
    querySelector: selector => ({ '.mao-exhibition': {}, '[data-command-map]': map, '[data-strategy-caption]': {} })[selector],
    querySelectorAll: selector => selector === '[data-strategy-choice]' ? links
      : selector === '[data-strategy-scene]' ? scenes : targets,
  };
  const controller = initMaoExhibition({ root });
  return {
    calls, covers, media, doc, controller, targets, heading, lines, verse, img, woodcut, incision,
    sequences, theme, themeLines, art, thread, routes, links, scenes, observers,
    enter: (...nodes) => observers[1].callback(nodes.map(target => ({ target, isIntersecting: true }))),
    select: key => links.find(link => link.dataset.strategyChoice === key).dispatch('click', { button: 0 }),
    forTarget: target => calls.filter(call => call.target === target),
  };
}

test('compact full motion reveals woodcuts in 700ms and choreographs each verse without a parent animation', () => {
  const f = motionFixture({ compact: true });
  f.enter(f.woodcut, f.verse, f.incision);
  assert.equal(f.covers.length, 1);
  const reveal = f.forTarget(f.covers[0])[0];
  assert.equal(reveal.options.duration, 700);
  assert.deepEqual(reveal.frames, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }]);
  assert.equal(f.forTarget(f.img).length, 0);
  assert.equal(f.forTarget(f.verse).length, 0);
  assert.equal(f.forTarget(f.heading)[0].frames[0].transform, 'translateY(6px)');
  assert.deepEqual(f.forTarget(f.lines[0])[0].frames[0], { transform: 'scale(1.18)', opacity: 0 });
  assert.equal(f.forTarget(f.lines[0])[0].options.duration, 360);
  f.lines.slice(1).forEach((line, index) => {
    const call = f.forTarget(line)[0];
    assert.deepEqual(call.frames[0], { opacity: 0, transform: 'translateY(6px)' });
    assert.equal(call.options.duration, 480);
    assert.equal(call.options.delay, 140 + index * 120);
    assert.equal(call.options.fill, 'backwards');
  });
  const incision = f.forTarget(f.incision)[0];
  assert.deepEqual(incision.frames, [{ transform: 'scaleX(0)', opacity: .4 }, { transform: 'scaleX(1)', opacity: 1 }]);
  assert.equal(incision.options.duration, 580);
  assert.equal(incision.options.easing, 'cubic-bezier(.16,1,.3,1)');
  f.controller.destroy();
  assert.ok(f.calls.every(call => call.animation.cancelled));
  assert.ok(f.covers.every(cover => cover.removed));
});

test('desktop entrances use 10px and all five sequence containers stagger children by 90ms', () => {
  const f = motionFixture();
  f.enter(f.woodcut, ...f.sequences.map(sequence => sequence.target));
  assert.equal(f.forTarget(f.covers[0])[0].options.duration, 850);
  for (const { target, children } of f.sequences) {
    assert.equal(f.forTarget(target).length, 0);
    children.forEach((child, index) => {
      const call = f.forTarget(child)[0];
      assert.equal(call.frames[0].transform, 'translateY(10px)');
      assert.equal(call.options.delay, index * 90);
    });
  }
  f.controller.destroy();
});

test('reduced, off, explicit reduced, forced colors, and hidden states create no animations or covers', () => {
  for (const options of [{ reduced: true }, { mode: 'off' }, { mode: 'reduced' }, { forcedColors: true }, { hidden: true }]) {
    const f = motionFixture(options);
    if (options.hidden) f.doc.hidden = true;
    f.enter(...f.targets);
    f.select('divert');
    assert.equal(f.calls.length, 0, JSON.stringify(options));
    assert.equal(f.covers.length, 0);
    assert.equal(f.thread.style.strokeDasharray, undefined);
    f.controller.destroy();
  }
});

test('settling reduced/off/hidden and destroy synchronously cancels every animation and cleans cover/thread state', () => {
  for (const state of ['reduced', 'off', 'hidden', 'destroy']) {
    const f = motionFixture();
    f.enter(...f.targets);
    f.select('divert');
    assert.equal(f.thread.style.strokeDasharray, '720');
    if (state === 'reduced') {
      const reduced = f.media['(prefers-reduced-motion: reduce)'];
      reduced.matches = true;
      reduced.dispatch('change');
    } else if (state === 'off') {
      f.doc.body.dataset.motion = 'off';
      f.doc.dispatch('chishui:motion');
    } else if (state === 'hidden') {
      f.doc.hidden = true;
      f.doc.dispatch('visibilitychange');
    } else f.controller.destroy();
    assert.ok(f.calls.every(call => call.animation.cancelled), state);
    assert.ok(f.covers.every(cover => cover.removed), state);
    assert.equal(f.thread.style.strokeDasharray, undefined, state);
    assert.equal(f.thread.style.strokeDashoffset, undefined, state);
    const count = f.calls.length;
    f.enter(...f.targets);
    f.select('initiative');
    assert.equal(f.calls.length, count, state);
    f.controller.destroy();
  }
});

test('a deferred woodcut image load cannot restart motion after reduced/off/hidden or destroy, even after resuming', () => {
  for (const state of ['reduced', 'off', 'hidden', 'destroy']) {
    const f = motionFixture();
    f.img.complete = false;
    f.enter(f.woodcut);
    if (state === 'reduced') {
      const reduced = f.media['(prefers-reduced-motion: reduce)'];
      reduced.matches = true;
      reduced.dispatch('change');
      reduced.matches = false;
    } else if (state === 'off') {
      f.doc.body.dataset.motion = 'off';
      f.doc.dispatch('chishui:motion');
      f.doc.body.dataset.motion = 'full';
    } else if (state === 'hidden') {
      f.doc.hidden = true;
      f.doc.dispatch('visibilitychange');
      f.doc.hidden = false;
    } else f.controller.destroy();
    f.img.complete = true;
    f.img.dispatch('load');
    assert.equal(f.calls.length, 0, state);
    assert.equal(f.covers.length, 0, state);
    f.controller.destroy();
  }
});

test('strategy changes emphasize only mapped routes, cancel interrupted emphasis, and ignore repeated reading keys', () => {
  const f = motionFixture();
  f.select('divert');
  const divert = [...f.calls];
  assert.deepEqual(divert.map(call => call.target.dataset.commandRoute), ['3', '4']);
  assert.ok(divert.every(call => call.frames.every(frame => Object.keys(frame).every(key => key === 'opacity'))));
  f.select('initiative');
  assert.ok(divert.every(call => call.animation.cancelled));
  assert.equal(f.calls.at(-1).target.dataset.commandRoute, '4');
  const initiative = f.calls.at(-1);
  const count = f.calls.length;
  f.select('initiative');
  f.scenes.forEach((scene, index) => {
    scene.getBoundingClientRect = () => index === 2 ? { top: 0, bottom: 600 } : { top: 1000, bottom: 1600 };
  });
  f.observers[0].callback();
  f.observers[0].callback();
  assert.equal(f.calls.length, count);
  assert.equal(initiative.animation.cancelled, false);
  f.select('judge');
  assert.equal(initiative.animation.cancelled, true);
  assert.deepEqual(f.calls.slice(-2).map(call => call.target.dataset.commandRoute), ['1', '2']);
  f.controller.destroy();
});

test('theme lines/art animate and the red thread draws only offset then removes both owned dash properties', async () => {
  const f = motionFixture();
  f.enter(f.theme);
  assert.deepEqual(f.themeLines.map(line => f.forTarget(line)[0].options.delay), [0, 170]);
  assert.equal(f.forTarget(f.art).length, 1);
  const draw = f.forTarget(f.thread)[0];
  assert.deepEqual(draw.frames, [{ strokeDashoffset: 720 }, { strokeDashoffset: 0 }]);
  assert.equal(draw.options.duration, 1100);
  assert.equal(draw.options.delay, 220);
  assert.equal(draw.options.easing, 'cubic-bezier(.37,0,.63,1)');
  assert.equal(f.thread.style.strokeDasharray, '720');
  draw.animation.finish();
  await Promise.resolve();
  assert.equal(f.thread.style.strokeDasharray, undefined);
  assert.equal(f.thread.style.strokeDashoffset, undefined);
  for (const call of f.calls) {
    for (const frame of call.frames) assert.ok(Object.keys(frame).every(key => ['transform', 'opacity', 'strokeDashoffset', 'mask'].includes(key)));
  }
  f.controller.destroy();
});

test('cover finish cleans up and WAAPI failures leave art, poems, and the thread static', async () => {
  const f = motionFixture();
  f.enter(f.woodcut);
  f.calls[0].animation.finish();
  await Promise.resolve();
  assert.ok(f.covers[0].removed);
  f.controller.destroy();
  const failed = motionFixture({ failWAAPI: true });
  assert.doesNotThrow(() => failed.enter(...failed.targets));
  assert.doesNotThrow(() => failed.select('divert'));
  assert.equal(failed.calls.length, 0);
  assert.ok(failed.covers.every(cover => cover.removed));
  assert.equal(failed.thread.style.strokeDasharray, undefined);
  assert.equal(failed.thread.style.strokeDashoffset, undefined);
  failed.controller.destroy();
});

test('CSS limits route transitions to opacity and supplies static accessibility modes', async () => {
  const css = await readFile(new URL('../src/mao-exhibition.css', import.meta.url), 'utf8');
  assert.match(css, /\.woodcut-incision\s*\{[^}]*transform-origin: left center/);
  assert.match(css, /\.command-route\s*\{[^}]*transition: opacity 240ms ease/);
  assert.doesNotMatch(css, /transition\s*:[^;}]*(?:stroke|all)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /body:is\(\[data-motion="off"\], \[data-motion="reduced"\]\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
