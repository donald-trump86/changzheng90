import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const historySrc = await readFile(new URL('../src/history-data.js', import.meta.url), 'utf8');
const dataSrc = await readFile(new URL('../src/historical-map-data.js', import.meta.url), 'utf8');
const mapSrc = await readFile(new URL('../src/historical-map.js', import.meta.url), 'utf8');

const expectedContext = {};
runInNewContext(historySrc, expectedContext);
runInNewContext(dataSrc, expectedContext);
const data = expectedContext.ChishuiMapData;
const overviewPaths = [1, 2, 3, 4].map((n) => data.geometry(n, 'overview').path);

/* Minimal fake SVG environment: no browser, no jsdom. Elements carry only the
   surface historical-map.js touches (attributes, dataset, style, layout boxes). */
const rect = (width, height) => ({ x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height });

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.dataset = {};
    this.style = {
      setProperty(name, value) { this[name] = value; },
      removeProperty(name) { delete this[name]; }
    };
    this.classes = new Set();
    this.children = [];
    this.parentNode = null;
    this.textContent = '';
    this.hidden = false;
    this.open = false;
    this.innerHTML = '';
    this.id = '';
    this.rect = rect(100, 20);
    this.bbox = { x: 0, y: 0, width: 64, height: 18 };
    this.listeners = new Map();
  }
  get classList() {
    const classes = this.classes;
    return {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !classes.has(name) : Boolean(force);
        if (on) classes.add(name); else classes.delete(name);
        return on;
      }
    };
  }
  set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classes].join(' '); }
  setAttribute(name, value) {
    const text = String(value);
    if (name === 'class') { this.className = text; return; }
    this.attributes.set(name, text);
  }
  getAttribute(name) {
    if (name === 'class') return this.className;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, ref) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = this.children.indexOf(ref);
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  removeEventListener(type, fn) {
    const list = this.listeners.get(type) || [];
    const index = list.indexOf(fn);
    if (index >= 0) list.splice(index, 1);
  }
  getScreenCTM() {
    const box = (this.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if (box.length !== 4 || !box[2] || !box[3]) return null;
    const scale = Math.min(this.rect.width / box[2], this.rect.height / box[3]);
    return { a: scale, b: 0, c: 0, d: scale, e: 0, f: 0 };
  }
  getBoundingClientRect() { return { ...this.rect }; }
  getBBox() { return { ...this.bbox }; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { return descendants(this).filter((el) => matches(el, selector)); }
  closest(selector) {
    let node = this;
    while (node) {
      if (matches(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }
}

function descendants(node, out = []) {
  for (const child of node.children) {
    out.push(child);
    descendants(child, out);
  }
  return out;
}

function matches(el, selector) {
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (selector.startsWith('.')) return el.classes.has(selector.slice(1));
  const attr = /^\[([a-z0-9-]+)(?:="([^"]*)")?\]$/i.exec(selector);
  if (attr) {
    const key = attr[1].replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = el.attributes.has(attr[1]) ? el.attributes.get(attr[1]) : el.dataset[key];
    if (value === undefined) return false;
    return attr[2] === undefined || String(value) === attr[2];
  }
  return el.tagName === selector.toUpperCase();
}

function buildEnv({ reduce = false, motionOff = false, previousRoutes = 3 } = {}) {
  const env = { clock: 0, frames: new Map(), nextFrame: 1, byId: new Map() };
  const make = (tag, { id, className, dataset, parent } = {}) => {
    const el = new FakeElement(tag);
    if (id) { el.id = id; env.byId.set(id, el); }
    if (className) el.className = className;
    if (dataset) Object.assign(el.dataset, dataset);
    if (parent) parent.appendChild(el);
    return el;
  };
  const root = make('root');
  const body = make('body', { parent: root });
  if (motionOff) body.dataset.motion = 'off';
  make('div', { className: 'study-toolbar', parent: body }).rect = rect(560, 56);
  const figure = make('figure', { className: 'route-sheet', parent: body });
  const canvas = make('div', { className: 'map-canvas', parent: figure });
  const svg = make('svg', { id: 'route-map', parent: canvas });
  svg.rect = rect(560, 459);
  svg.setAttribute('viewBox', '0 220 1000 600');
  for (let i = 1; i <= previousRoutes; i++) {
    make('path', { className: 'map-previous-route', dataset: { previousRoute: String(i) }, parent: svg });
  }
  const route = make('path', { id: 'current-route', className: 'march-line', parent: svg });
  const start = make('circle', { id: 'march-start', className: 'march-start', parent: svg });
  const head = make('circle', { id: 'march-head', parent: svg });
  make('marker', { id: 'route-arrow', parent: svg });
  make('ellipse', { id: 'map-maneuver-area', parent: svg });
  const north = make('g', { id: 'map-north', parent: svg });
  make('text', { parent: north });
  make('path', { parent: north });
  make('title', { id: 'map-title', parent: svg });
  make('desc', { id: 'map-description', parent: svg });
  for (const name of Object.keys(data.fords)) {
    make('ellipse', { className: 'map-ford', dataset: { ford: name }, parent: svg });
  }
  for (const name of Object.keys(data.places)) {
    make('circle', { className: 'map-place', dataset: { mapPoint: name }, parent: svg });
    make('text', { className: 'map-type', dataset: { mapLabel: name }, parent: svg });
  }
  for (const name of Object.keys(data.fords)) {
    make('text', { className: 'map-type', dataset: { mapLabel: `ford:${name}` }, parent: svg });
  }
  for (const name of ['loushan', 'chuannan', 'south', 'approach']) {
    make('text', { className: 'map-type', dataset: { mapLabel: name }, parent: svg });
  }
  make('text', { id: 'map-river-label', className: 'map-type river-name', parent: svg });
  make('figcaption', { className: 'map-caption', parent: figure });
  const notes = make('details', { id: 'map-method', className: 'map-notes', parent: body });
  make('p', { id: 'map-stage-note', parent: notes });
  make('p', { id: 'map-view-note', parent: notes });
  make('p', { id: 'map-stage-summary', parent: notes });
  make('p', { id: 'map-relation', parent: notes });
  make('details', { className: 'map-details', parent: notes });
  const controls = make('div', { className: 'map-view-controls', parent: notes });
  make('button', { dataset: { mapView: 'overview' }, parent: controls });
  make('button', { dataset: { mapView: 'detail' }, parent: controls });
  const allButton = make('button', { dataset: { mapAll: '' }, parent: controls });

  const events = [];
  const document = {
    body,
    events,
    getElementById: (id) => env.byId.get(id) || null,
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
    dispatchEvent: (event) => { events.push(event); return true; }
  };
  const context = {
    document,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    innerHeight: 800,
    matchMedia: (query) => ({
      matches: Boolean(reduce) && query.includes('prefers-reduced-motion'),
      addEventListener() {},
      addListener() {}
    }),
    performance: { now: () => env.clock },
    requestAnimationFrame: (fn) => {
      const id = env.nextFrame++;
      env.frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => { env.frames.delete(id); },
    queueMicrotask: (fn) => queueMicrotask(fn),
    setTimeout,
    clearTimeout
  };
  runInNewContext(historySrc, context);
  runInNewContext(dataSrc, context);
  runInNewContext(mapSrc, context);
  Object.assign(env, {
    context, document, events, svg, route, start, head, allButton,
    viewBox: () => svg.getAttribute('viewBox'),
    scaleFor: (box) => Math.min(svg.rect.width / box[2], svg.rect.height / box[3]),
    displayedFaded: () => svg.querySelectorAll('[data-previous-route]')
      .filter((path) => path.style.display !== 'none')
      .map((path) => path.getAttribute('d')),
    visibleLabels: () => svg.querySelectorAll('[data-map-label]')
      .filter((label) => label.style.display !== 'none'),
    pump: (dt = 100, times = 1) => {
      for (let i = 0; i < times; i++) {
        env.clock += dt;
        const batch = [...env.frames.values()];
        env.frames.clear();
        for (const fn of batch) fn(env.clock);
      }
    },
    flush: async () => { await Promise.resolve(); await Promise.resolve(); },
    fire: (el, type, extra = {}) => (el.listeners.get(type) || []).slice()
      .forEach((fn) => fn({ type, target: el, ...extra })),
    create: () => context.ChishuiHistoricalMap.create()
  });
  return env;
}

test('setAllRoutes renders the four sourced overview legs with the selected leg emphasized', () => {
  const env = buildEnv();
  const map = env.create();
  assert.equal(env.svg.dataset.allRoutes, 'false', 'all-routes mode defaults to off');
  map.setAllRoutes(true);
  assert.equal(env.svg.dataset.allRoutes, 'true');
  const legs = [env.route.getAttribute('d'), ...env.displayedFaded()];
  assert.deepEqual(new Set(legs), new Set(overviewPaths), 'all four legs are data.geometry(n, "overview").path');
  assert.equal(env.route.getAttribute('d'), data.geometry(1, 'overview').path, 'emphasized leg is the selected chapter');
  const dots = env.svg.querySelectorAll('.map-crossing-dot');
  assert.equal(dots.length, 3, 'one crossing dot per non-selected leg');
  const starts = dots.map((dot) => [Number(dot.getAttribute('cx')), Number(dot.getAttribute('cy'))]);
  for (const number of [2, 3, 4]) {
    assert.ok(starts.some(([x, y]) => x === data.geometry(number, 'overview').start[0]
      && y === data.geometry(number, 'overview').start[1]), `crossing dot at leg ${number} start`);
  }
});

test('the selected chapter keeps the emphasized route invariant in all-routes mode', () => {
  const env = buildEnv();
  const map = env.create();
  for (let chapter = 1; chapter <= 4; chapter++) {
    map.setChapter(chapter);
    map.setAllRoutes(true);
    assert.equal(env.route.getAttribute('d'), data.geometry(chapter, 'overview').path,
      `chapter ${chapter} emphasized route is its sourced overview path`);
    const faded = env.displayedFaded();
    assert.deepEqual(new Set(faded),
      new Set([1, 2, 3, 4].filter((n) => n !== chapter).map((n) => data.geometry(n, 'overview').path)),
      `chapter ${chapter} fades exactly the other three sourced legs`);
    for (const path of env.svg.querySelectorAll('[data-previous-route]')) {
      if (path.style.display !== 'none') assert.ok(path.classList.contains('is-all-route'));
    }
  }
});

test('setChapter exits all-routes mode and restores previous-leg rendering', () => {
  const env = buildEnv();
  const map = env.create();
  map.setAllRoutes(true);
  map.setChapter(2);
  assert.equal(env.svg.dataset.allRoutes, 'false', 'chapter selection clears all-routes mode');
  assert.equal(env.allButton.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(env.displayedFaded(), [data.geometry(1, 'overview').path],
    'overview mode again shows only earlier legs');
  map.setAllRoutes(true);
  map.setView('overview');
  assert.equal(env.svg.dataset.allRoutes, 'true', 're-selecting overview keeps the mode (documented asymmetry)');
  map.setView('detail');
  map.setAllRoutes(true);
  map.setAllRoutes(false);
  assert.equal(env.svg.dataset.allRoutes, 'false', 'explicit off returns to single-route rendering');
  assert.equal(env.route.getAttribute('d'), data.geometry(2, 'detail').path, 'current route keeps its own geometry');
  map.setAllRoutes(true);
  map.setChapter(3);
  assert.equal(env.svg.dataset.view, 'detail', 'chapter selection exits into the remembered view');
  assert.equal(env.route.getAttribute('d'), data.geometry(3, 'detail').path,
    'the post-exit view is validated and committed');
});

test('camera commits the sourced window instantly without animating layout properties', () => {
  const env = buildEnv();
  const map = env.create();
  map.setView('detail');
  assert.equal(env.frames.size, 0);
  assert.equal(env.viewBox(), data.geometry(1, 'detail').viewBox.join(' '));
  const matrix = env.svg.getScreenCTM();
  for (const label of env.visibleLabels()) assert.equal(label.style.fontSize, `${16 / Math.hypot(matrix.a, matrix.b)}px`);
  for (const chapter of [2, 4, 3]) map.setChapter(chapter);
  assert.equal(env.frames.size, 0);
  assert.equal(env.viewBox(), data.geometry(3, 'detail').viewBox.join(' '));
  assert.equal(env.route.getAttribute('d'), data.geometry(3, 'detail').path);
  assert.equal(env.events.filter(event => event.type === 'chishui:map-after').length, 1,
    'chapter changes retain their existing before-only event contract');
});

test('reduced motion and motion-off jump instantly without animation frames', () => {
  for (const options of [{ reduce: true }, { motionOff: true }]) {
    const env = buildEnv(options);
    const map = env.create();
    map.setView('detail');
    assert.equal(env.viewBox(), data.geometry(1, 'detail').viewBox.join(' '), 'viewBox commits immediately');
    assert.equal(env.frames.size, 0, 'no tween is scheduled');
    assert.equal(env.events.filter((event) => event.type === 'chishui:map-after').length, 1,
      'map-after still settles immediately');
  }
});

test('map-before precedes every mutation and view mode settles with map-after', async () => {
  const env = buildEnv();
  const map = env.create();
  map.setView('detail');
  const before = env.events.filter((event) => event.type === 'chishui:map-before');
  assert.equal(before.length, 1);
  assert.equal(before[0].detail.reason, 'view');
  assert.equal(env.events.filter((event) => event.type === 'chishui:map-after').length, 1);
  env.pump(100, 8);
  const after = env.events.filter((event) => event.type === 'chishui:map-after');
  assert.equal(after.length, 1);
  assert.equal(after[0].detail.reason, 'view');
  map.setAllRoutes(true);
  assert.equal(env.events.filter((event) => event.type === 'chishui:map-before').length, 2);
  assert.equal(env.events.filter((event) => event.type === 'chishui:map-after').length, 2,
    'all-routes geometry settles synchronously');
  env.pump(100, 8);
  assert.equal(env.events.filter((event) => event.type === 'chishui:map-after').length, 2,
    'all-routes mode change settles like a view change');
});

test('the data-map-all button toggles the mode and tolerates an extra wiring', async () => {
  const env = buildEnv();
  const map = env.create();
  const button = env.allButton;
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  env.fire(button, 'click');
  await env.flush();
  assert.equal(env.svg.dataset.allRoutes, 'true', 'built-in deferred toggle turns the mode on');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  env.fire(button, 'click');
  await env.flush();
  assert.equal(env.svg.dataset.allRoutes, 'false', 'second click turns the mode off');
  button.addEventListener('click', () => map.setAllRoutes(true));
  env.fire(button, 'click');
  await env.flush();
  assert.equal(env.svg.dataset.allRoutes, 'true');
  env.fire(button, 'click');
  await env.flush();
  assert.equal(env.svg.dataset.allRoutes, 'false',
    'the deferred toggle stands down when another listener already changed the state');
});

test('an accessible four-leg west/east description is mounted near the map from stage data', () => {
  const env = buildEnv();
  const map = env.create();
  const block = env.document.querySelector('.map-all-routes');
  assert.ok(block, 'description block is mounted near the map');
  const html = block.innerHTML;
  for (const stage of data.stages) assert.ok(html.includes(stage.summary), 'leg text comes from stage summaries');
  assert.match(html, /一渡西渡、二渡东渡、三渡西渡、四渡东渡/, 'the west/east/west/east sequence is described');
  assert.equal(block.tagName, 'SECTION');
  map.setAllRoutes(true);
  assert.equal(env.document.getElementById('map-method').open, false, 'all-routes mode keeps supplemental sources closed');
  env.create();
  assert.equal(env.document.querySelectorAll('.map-all-routes').length, 1,
    'a second create() replaces the description instead of stacking it');
});

test('map places and ford references expose sourced notes through pointer, touch and keyboard', () => {
  const env = buildEnv();
  const map = env.create();
  const note = env.document.getElementById('map-view-note');
  const point = env.svg.querySelector('[data-map-point="zunyi"]');
  const ford = env.svg.querySelector('[data-ford="tucheng"]');
  assert.equal(point.getAttribute('role'), 'button');
  assert.equal(point.getAttribute('tabindex'), '0');
  assert.equal(point.getAttribute('aria-label'), data.places.zunyi.name);
  assert.equal(point.getAttribute('aria-describedby'), 'map-view-note');
  const sourced = id => `${data.places[id].name}：${data.places[id].note}`;
  env.fire(point, 'pointerenter'); assert.equal(note.textContent, sourced('zunyi'));
  env.fire(point, 'pointerleave'); assert.equal(note.textContent, data.geometry(1, 'overview').notice);
  env.fire(ford, 'click'); assert.equal(note.textContent, sourced(data.fords.tucheng.reference));
  env.fire(ford, 'pointerleave');
  env.fire(point, 'focusin'); assert.equal(note.textContent, sourced('zunyi'));
  env.fire(point, 'pointerleave'); assert.equal(note.textContent, sourced('zunyi'), 'focus remains selected when pointer leaves');
  env.fire(point, 'focusout'); assert.equal(note.textContent, data.geometry(1, 'overview').notice);
  for (const key of ['Enter', ' ']) {
    let prevented = false;
    env.fire(point, 'keydown', { key, preventDefault() { prevented = true; } });
    assert.ok(prevented); assert.equal(note.textContent, sourced('zunyi'));
  }
  map.setChapter(2); assert.equal(note.textContent, data.geometry(2, 'overview').notice);
  env.fire(point, 'click'); map.setView('detail');
  assert.equal(note.textContent, data.geometry(2, 'detail').notice);
  for (const node of env.svg.querySelectorAll('[data-map-point]')) {
    if (node.style.display === 'none') assert.equal(node.getAttribute('tabindex'), '-1');
  }
  map.destroy();
  assert.equal(point.getAttribute('role'), null); assert.equal(point.getAttribute('tabindex'), null);
  const text = note.textContent; env.fire(point, 'click'); assert.equal(note.textContent, text);
  assert.ok([...point.listeners.values()].every(list => list.length === 0));
});
