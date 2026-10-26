import test from 'node:test';
import assert from 'node:assert/strict';
import { createChapterRouteReveal, initEditorialMotion } from '../src/editorial-motion.js';

function fixture(stage, originalMask = null) {
  function node(name, attributes = {}) {
    const result = {
      name, attributes: new Map(Object.entries(attributes)), children: [], parent: null,
      setAttribute(key, value) { this.attributes.set(key, value); },
      getAttribute(key) { return this.attributes.get(key) ?? null; },
      removeAttribute(key) { this.attributes.delete(key); },
      appendChild(child) { this.children.push(child); child.parent = this; },
      remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; },
      get id() { return this.getAttribute('id'); },
    };
    return result;
  }
  const svg = node('svg', { 'aria-labelledby': `chapter-map-${stage}-title chapter-map-${stage}-desc` });
  svg.viewBox = { baseVal: { x: 365, y: 280, width: 290, height: 230 } };
  const pattern = ['', '10 6', '2 6', '14 5 2 5'][stage - 1];
  const path = node('path', { d: 'M 10 20 L 110 70', 'data-static-route': String(stage), 'stroke-dasharray': pattern, 'marker-end': `url(#arrow-${stage})` });
  if (originalMask) path.setAttribute('mask', originalMask);
  path.ownerSVGElement = svg;
  path.ownerDocument = { createElementNS: (_namespace, name) => node(name) };
  path.getTotalLength = () => 100;
  path.getPointAtLength = distance => ({ x: 10 + distance, y: 20 + distance / 2 });
  return { svg, path, pattern, node };
}

test('each crossing reveals through its own mask without overwriting line style or arrows', () => {
  const ids = new Set();
  for (const stage of [1, 2, 3, 4]) {
    const { path, svg, pattern } = fixture(stage);
    const reveal = createChapterRouteReveal(path);
    const [mask, head] = svg.children;
    ids.add(mask.id);
    assert.equal(path.getAttribute('mask'), `url(#${mask.id})`);
    assert.equal(mask.getAttribute('maskUnits'), 'userSpaceOnUse');
    assert.equal(mask.getAttribute('x'), '325');
    reveal.update(0);
    assert.equal(mask.children[0].getAttribute('stroke-dashoffset'), '100');
    assert.equal(head.getAttribute('transform'), 'translate(10 20)');
    reveal.update(.5);
    assert.equal(mask.children[0].getAttribute('stroke-dashoffset'), '50');
    assert.equal(head.getAttribute('transform'), 'translate(60 45)');
    assert.equal(path.getAttribute('stroke-dasharray'), pattern);
    assert.equal(path.getAttribute('marker-end'), `url(#arrow-${stage})`);
    reveal.update(1);
    assert.equal(mask.children[0].getAttribute('stroke-dashoffset'), '0');
    reveal.finish();
    assert.equal(path.getAttribute('mask'), null);
    assert.equal(svg.children.length, 0);
  }
  assert.equal(ids.size, 4);
});

test('interrupting or replaying restores the original mask and leaves no temporary SVG nodes', () => {
  const { path, svg } = fixture(2, 'url(#existing-mask)');
  for (let repeat = 0; repeat < 3; repeat++) {
    const reveal = createChapterRouteReveal(path);
    reveal.update(.3);
    reveal.finish();
    reveal.finish();
    assert.equal(path.getAttribute('mask'), 'url(#existing-mask)');
    assert.equal(svg.children.length, 0);
  }
});

test('overshooting progress cannot move the march head beyond either endpoint', () => {
  const { path, svg } = fixture(4);
  const reveal = createChapterRouteReveal(path);
  reveal.update(-.5);
  assert.equal(svg.children[1].getAttribute('transform'), 'translate(10 20)');
  reveal.update(1.5);
  assert.equal(svg.children[1].getAttribute('transform'), 'translate(110 70)');
  reveal.finish();
});

test('chapter playback waits for the SVG and cancels cleanly across its lifecycle', t => {
  const { svg, path, node } = fixture(1);
  const frames = new Map();
  let frameId = 0, controller;
  const saved = ['requestAnimationFrame', 'cancelAnimationFrame']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  t.after(() => {
    controller?.destroy();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  // Keep the real tween pending so each event must cancel its actor and cleanup.
  globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const fine = Object.assign(new EventTarget(), { matches: false });
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const observers = [];
  const win = Object.assign(new EventTarget(), {
    innerHeight: 800, scrollY: 0, location: { hash: '' }, matchMedia: query => query.includes('forced-colors') ? reduced : fine,
    requestAnimationFrame, cancelAnimationFrame,
    IntersectionObserver: class {
      constructor(callback, options) { Object.assign(this, { callback, options, targets: [] }); observers.push(this); }
      observe(target) { this.targets.push(target); }
      disconnect() {}
    },
  });
  const doc = Object.assign(new EventTarget(), {
    defaultView: win, hidden: false, body: node('body'), documentElement: { scrollHeight: 6000 },
    createElement: name => Object.assign(new EventTarget(), node(name)), getElementById: () => null,
  });
  let svgTop = 900;
  Object.assign(svg, {
    checkVisibility: () => true, closest: () => null,
    getBoundingClientRect: () => ({ top: svgTop, bottom: svgTop + 320, width: 400, height: 320 }),
    matches: selector => selector === '.chapter-map > svg',
  });
  const figure = Object.assign(node('figure', { 'data-static-map': '1' }), {
    querySelector: selector => ({ svg, '[data-static-route]': path })[selector] || null,
    checkVisibility: () => true, closest: () => null,
    getBoundingClientRect: () => ({ top: 799, bottom: 1300, width: 400, height: 501 }),
  });
  const root = {
    ownerDocument: doc, querySelector: () => null,
    querySelectorAll: selector => selector === '.chapter-map' ? [figure] : [],
  };
  controller = initEditorialMotion({ root, reduced });
  const observer = observers[0];
  const intersect = isIntersecting => observer.callback([{ target: svg, isIntersecting }]);
  const cleared = () => { assert.equal(path.getAttribute('mask'), null); assert.equal(svg.children.length, 0); };
  const drawing = () => {
    assert.equal(path.getAttribute('mask'), `url(#${svg.children[0]?.id})`);
    assert.deepEqual(svg.children.map(child => child.name), ['mask', 'circle']);
  };
  // The caption is visible, but the map itself remains below the viewport.
  cleared();
  assert.ok(observer.targets.includes(svg));
  assert.ok(!observer.targets.includes(figure));
  assert.ok(observer.options.threshold.some(value => value >= .35 && value <= .36));
  svgTop = 761.6; intersect(true); cleared(); // 12% visible must not consume played.
  svgTop = 684.8; intersect(true); drawing(); // 36% visible starts the first play.
  const button = figure.children[0];
  const replay = () => { button.dispatchEvent(new Event('click')); drawing(); };
  for (let repeat = 0; repeat < 3; repeat++) replay();
  svgTop = 900; intersect(false); cleared();
  svgTop = 684.8; intersect(true); cleared(); // Automatic playback remains once-only.
  replay(); controller.pause(); cleared(); assert.equal(button.hidden, true);
  controller.resume(); cleared();
  replay(); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); cleared();
  doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
  replay(); reduced.matches = true; reduced.dispatchEvent(new Event('change')); cleared();
  reduced.matches = false; reduced.dispatchEvent(new Event('change'));
  replay(); fine.matches = true; fine.dispatchEvent(new Event('change')); cleared();
  replay(); win.dispatchEvent(new Event('pagehide')); cleared();
  win.dispatchEvent(new Event('pageshow'));
  replay(); controller.destroy(); cleared();
  assert.equal(figure.children.length, 0);
  assert.equal(frames.size, 0);
});
