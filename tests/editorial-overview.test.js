import test from 'node:test';
import assert from 'node:assert/strict';
let caseId = 0;
function testOverview(name, run) {
  test(name, async t => {
    // A fresh module keeps Anime resolved by an earlier case from taking over.
    // The case itself stays synchronous, before this import's Anime promise settles.
    const { initEditorialMotion } = await import(`../src/editorial-motion.js?overview-case=${++caseId}`);
    run(t, initEditorialMotion);
  });
}

function overviewFixture(t, initEditorialMotion, { reduced = false, scenes = false } = {}) {
  const frames = new Map();
  const saved = ['performance', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  let time = 0;
  let nextFrame = 0;
  let disposed = false;
  let controller;
  const requestFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  const cancelFrame = id => frames.delete(id);
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => time } });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: requestFrame });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', { configurable: true, value: cancelFrame });

  function events(properties = {}) {
    const listeners = new Map();
    return Object.assign({
      listeners,
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(callback);
      },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatchEvent(event) {
        for (const callback of [...listeners.get(event.type) || []]) callback(event);
        return true;
      },
      emit(type, detail = {}) { this.dispatchEvent({ type, ...detail }); },
      listenerCount() { return [...listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0); },
    }, properties);
  }

  function node(name, attributes = {}, selectors = {}) {
    const result = events({
      name, attributes: new Map(Object.entries(attributes)), children: [], parent: null,
      style: { removeProperty(key) { delete this[key.replace(/-([a-z])/g, (_, char) => char.toUpperCase())]; } },
      setAttribute(key, value) { this.attributes.set(key, String(value)); },
      getAttribute(key) { return this.attributes.get(key) ?? null; },
      removeAttribute(key) { this.attributes.delete(key); },
      appendChild(child) { this.children.push(child); child.parent = this; return child; },
      remove() {
        if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
        this.parent = null;
      },
      contains(other) { return this === other || this.children.some(child => child.contains(other)); },
      closest: () => null,
      checkVisibility: () => true,
      getBoundingClientRect: () => ({ top: 0, bottom: 300, width: 600, height: 300 }),
      matches: () => false,
      querySelector: selector => selectors[selector]?.[0] || null,
      querySelectorAll: selector => selectors[selector] || [],
    });
    return Object.defineProperty(result, 'id', { get() { return this.getAttribute('id'); } });
  }

  const observers = [];
  const fine = events({ matches: false });
  const reducedQuery = events({ matches: reduced });
  const forced = events({ matches: false });
  const win = events({
    innerHeight: 800, scrollY: 0, location: { hash: '' },
    matchMedia: query => query.includes('forced-colors') ? forced : fine,
    requestAnimationFrame: requestFrame, cancelAnimationFrame: cancelFrame,
    IntersectionObserver: class {
      constructor(callback, options) { Object.assign(this, { callback, options, targets: [], disconnected: false }); observers.push(this); }
      observe(target) { this.targets.push(target); }
      disconnect() { this.disconnected = true; }
    },
    console: { error(message, error) { throw new Error(`${message} ${error.message}`); } },
  });
  const doc = events({
    defaultView: win, body: node('body'), hidden: false,
    documentElement: { scrollHeight: 6000 }, getElementById: () => null,
    createElementNS: (_namespace, name) => node(name), createElement: name => node(name),
  });

  let svgTop = 900;
  const svgSelectors = {};
  const svg = node('svg', { class: 'static-map-drawing' }, svgSelectors);
  svg.viewBox = { baseVal: { x: 0, y: 220, width: 1000, height: 600 } };
  svg.getBoundingClientRect = () => ({ top: svgTop, bottom: svgTop + 400, width: 600, height: 400 });
  const patterns = ['', '10 6', '2 6', '14 5 2 5'];
  const paths = [1, 2, 3, 4].map(stage => {
    const path = node('path', {
      d: `M ${stage} 20 L ${stage + 100} 70`, 'data-static-route': String(stage),
      'stroke-dasharray': patterns[stage - 1], 'marker-end': `url(#arrow-${stage})`,
    });
    if (stage === 3) path.setAttribute('mask', 'url(#original-third-mask)');
    Object.assign(path, {
      ownerSVGElement: svg, ownerDocument: doc,
      getTotalLength: () => stage * 20 + 80,
      getPointAtLength: distance => ({ x: stage + distance, y: 20 + distance / 2 }),
    });
    svg.appendChild(path);
    return path;
  });
  const badges = [1, 2, 3, 4].map(stage => node('g', { 'data-static-stage': String(stage) }));
  badges[1].setAttribute('tabindex', '3');
  badges.forEach(badge => svg.appendChild(badge));
  // Deliberately reverse query order: playback must sort by stage, not DOM lookup order.
  svgSelectors['[data-static-route]'] = [...paths].reverse();
  badges.forEach((badge, index) => { svgSelectors[`[data-static-stage="${index + 1}"]`] = [badge]; });
  const legends = [1, 2, 3, 4].map(() => node('li'));
  legends[0].setAttribute('tabindex', '-1');
  const overview = node('figure', {}, {
    'svg.static-map-drawing': [svg], '.static-route-key li': legends, '[data-static-stage]': badges,
  });
  overview.appendChild(svg);
  const timelineItems = [node('li'), node('li'), node('li')];
  const timeline = node('ol', {}, { li: timelineItems });
  const timelineFocus = timelineItems[1];
  const continuationHeading = node('h2');
  const continuationLine = node('span');
  continuationHeading.appendChild(continuationLine);
  const continuationParagraph = node('p');
  const continuationCopy = node('div', {}, {
    'h2 > span, h2, .statement, p, .quiet-link': [continuationHeading, continuationLine, continuationParagraph],
  });
  const afterItems = [node('li'), node('li'), node('li')];
  const afterRoute = node('ol', {}, { li: afterItems });
  const root = {
    ownerDocument: doc,
    querySelector: selector => ({ '.context-overview': overview, '.context .timeline-focus': scenes ? timelineFocus : null })[selector] || null,
    querySelectorAll: selector => scenes ? ({
      '.context .timeline': [timeline], '.continuation-copy': [continuationCopy], '#continuation .after-route ol': [afterRoute],
    })[selector] || [] : [],
  };

  function dispose() {
    if (disposed) return;
    disposed = true;
    try { controller?.destroy(); }
    finally {
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  }
  t.after(dispose);
  controller = initEditorialMotion({ root, reduced: reducedQuery });
  const observer = observers[0];
  return {
    frames, controller, observer, overview, svg, paths, badges, legends, fine, forced, reduced: reducedQuery, doc, win,
    timeline, timelineItems, timelineFocus, continuationCopy, continuationHeading, continuationLine,
    continuationParagraph, afterRoute, afterItems, dispose,
    setTop(value) { svgTop = value; },
    intersect(target = svg, isIntersecting = true) { observer.callback([{ target, isIntersecting }]); },
    advance(value) {
      assert.ok(value >= time, 'the test clock only moves forwards');
      time = value;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(time));
    },
    masks: () => svg.children.filter(child => child.name === 'mask'),
    heads: () => svg.children.filter(child => child.name === 'circle'),
  };
}

function assertStaticOverview(f) {
  assert.equal(f.masks().length, 0);
  assert.equal(f.heads().length, 0);
  f.paths.forEach((path, index) => {
    assert.equal(path.getAttribute('mask'), index === 2 ? 'url(#original-third-mask)' : null);
    assert.equal(path.getAttribute('stroke-dasharray'), ['', '10 6', '2 6', '14 5 2 5'][index]);
    assert.equal(path.getAttribute('marker-end'), `url(#arrow-${index + 1})`);
    assert.equal(path.style.strokeDasharray, undefined);
    assert.equal(path.style.strokeDashoffset, undefined);
  });
  f.badges.forEach(badge => {
    assert.equal(badge.style.opacity, undefined);
    assert.equal(badge.style.transform, undefined);
  });
}

function offsetFor(mask) { return Number(mask.children[0].getAttribute('stroke-dashoffset')); }

testOverview('overview observes the actual SVG, waits for 35% visibility, and plays automatically only once', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion);
  assert.ok(f.observer.targets.includes(f.svg));
  assert.ok(!f.observer.targets.includes(f.overview));
  assert.ok(f.observer.options.threshold.some(value => value >= .35 && value <= .36));
  assertStaticOverview(f);
  // The figure/legend are visible, while the SVG itself is still below the fold.
  f.intersect();
  assertStaticOverview(f);
  f.setTop(752); // 12% of the actual 400px SVG.
  f.intersect();
  assertStaticOverview(f);
  f.setTop(660.4); // 34.9% must not consume the one-shot playback.
  f.intersect();
  assertStaticOverview(f);
  f.setTop(660); // Exactly 35% starts every route mask together.
  f.intersect();
  const masks = f.masks();
  assert.equal(masks.length, 4);
  assert.equal(f.frames.size, 1);
  f.intersect();
  assert.deepEqual(f.masks(), masks, 'repeated intersections do not replace active masks');
  f.intersect(f.svg, false);
  assertStaticOverview(f);
  assert.equal(f.frames.size, 0);
  f.intersect();
  assertStaticOverview(f);
  assert.equal(f.frames.size, 0, 're-entry after interruption cannot replay the overview');
});

testOverview('four unique masks preserve dashed paths while 620ms routes overlap at 460ms start gaps', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion);
  f.setTop(0);
  f.intersect();
  const masks = f.masks();
  const heads = f.heads();
  assert.equal(new Set(masks.map(mask => mask.id)).size, 4);
  assert.equal(heads.length, 4);
  f.paths.forEach((path, index) => {
    const length = path.getTotalLength();
    assert.equal(path.getAttribute('mask'), `url(#${masks[index].id})`);
    assert.equal(path.getAttribute('stroke-dasharray'), ['', '10 6', '2 6', '14 5 2 5'][index]);
    assert.equal(path.getAttribute('marker-end'), `url(#arrow-${index + 1})`);
    assert.equal(masks[index].children[0].getAttribute('stroke-dasharray'), `${length} ${length}`);
    assert.equal(offsetFor(masks[index]), length);
    assert.equal(heads[index].getAttribute('transform'), `translate(${index + 1} 20)`);
  });
  f.advance(459);
  assert.ok(offsetFor(masks[0]) > 0 && offsetFor(masks[0]) < 100);
  assert.equal(offsetFor(masks[1]), 120);
  f.advance(460);
  assert.equal(offsetFor(masks[1]), 120, 'second route starts at its exact gap');
  f.advance(461);
  assert.ok(offsetFor(masks[1]) < 120);
  f.advance(619);
  assert.ok(offsetFor(masks[0]) > 0, 'first route is still drawing before 620ms');
  f.advance(620);
  assert.equal(offsetFor(masks[0]), 0);
  assert.ok(offsetFor(masks[1]) > 0 && offsetFor(masks[1]) < 120, 'routes overlap for 160ms');
  assert.equal(offsetFor(masks[2]), 140);
  assert.equal(offsetFor(masks[3]), 160);
  const expectedSecond = 120 * (1 - (1 - (1 - 160 / 620) ** 3));
  assert.ok(Math.abs(offsetFor(masks[1]) - expectedSecond) < 1e-9, 'each route uses outCubic progress');
  f.advance(920);
  assert.equal(offsetFor(masks[2]), 140);
  f.advance(921);
  assert.ok(offsetFor(masks[2]) < 140);
  f.advance(1380);
  assert.equal(offsetFor(masks[3]), 160);
  f.advance(1381);
  assert.ok(offsetFor(masks[3]) < 160);
});

testOverview('badge pops last 420ms, clean their inline styles, and the last pop survives route completion', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion);
  f.setTop(0);
  f.intersect();
  assert.deepEqual(f.badges.map(badge => badge.style.opacity), ['0', '0', '0', '0']);
  f.advance(620);
  assert.equal(f.badges[0].style.transform, 'scale(0.45)');
  f.advance(830);
  assert.equal(f.badges[0].style.opacity, '1');
  assert.ok(Number(f.badges[0].style.transform.slice(6, -1)) > 1, 'outBack gives the badge a visible overshoot');
  f.advance(1039);
  assert.ok(f.badges[0].style.transform);
  f.advance(1040);
  assert.equal(f.badges[0].style.transform, undefined);
  assert.equal(f.badges[0].style.opacity, undefined);
  f.advance(1080);
  assert.equal(f.badges[1].style.transform, 'scale(0.45)');
  f.advance(1500);
  assert.equal(f.badges[1].style.transform, undefined);
  f.advance(1540);
  assert.equal(f.badges[2].style.transform, 'scale(0.45)');
  f.advance(1960);
  assert.equal(f.badges[2].style.transform, undefined);
  f.advance(1999);
  assert.equal(f.masks().length, 4);
  f.advance(2000);
  assert.equal(f.masks().length, 0);
  assert.equal(f.heads().length, 0);
  assert.equal(f.badges[3].style.transform, 'scale(0.45)', 'normal route cleanup must preserve the running final pop');
  assert.equal(f.frames.size, 1);
  f.advance(2419);
  assert.ok(f.badges[3].style.transform);
  f.advance(2420);
  assertStaticOverview(f);
  assert.equal(f.frames.size, 0);
  f.intersect();
  assertStaticOverview(f);
  assert.equal(f.frames.size, 0);
});

testOverview('pause, reduced motion, hidden state, and destroy cancel every overview frame and clear temporary states', (t, initEditorialMotion) => {
  for (const state of ['pause', 'reduced', 'forced', 'hidden', 'destroy']) {
    const f = overviewFixture(t, initEditorialMotion);
    f.setTop(0);
    f.intersect();
    f.advance(620); // Both a route clock and a badge actor are active.
    f.legends[1].emit('pointerenter');
    assert.equal(f.overview.getAttribute('data-focus-stage'), '2');
    assert.equal(f.masks().length, 4);
    assert.equal(f.frames.size, 2);
    if (state === 'pause') f.controller.pause();
    else if (state === 'reduced') { f.reduced.matches = true; f.reduced.emit('change'); }
    else if (state === 'forced') { f.forced.matches = true; f.forced.emit('change'); }
    else if (state === 'hidden') { f.doc.hidden = true; f.doc.emit('visibilitychange'); }
    else f.controller.destroy();
    assertStaticOverview(f);
    assert.equal(f.overview.getAttribute('data-focus-stage'), null, state);
    assert.equal(f.frames.size, 0, state);
    f.intersect();
    assertStaticOverview(f);
    assert.equal(f.frames.size, 0, `${state}: an observer delivery cannot restart settled playback`);
    f.dispose();
  }
});

testOverview('overview legend and badge focus/pointer interaction restores tabindex and removes listeners on destroy', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion);
  const nodes = [...f.legends, ...f.badges];
  assert.ok(nodes.every(node => node.getAttribute('tabindex') === '0'));
  assert.ok(nodes.every(node => node.listenerCount() === 4));
  f.legends[0].emit('pointerenter');
  assert.equal(f.overview.getAttribute('data-focus-stage'), '1');
  f.badges[2].emit('focusin');
  assert.equal(f.overview.getAttribute('data-focus-stage'), '3', 'keyboard focus takes precedence over pointer hover');
  f.legends[0].emit('pointerleave');
  f.legends[1].emit('pointerenter');
  assert.equal(f.overview.getAttribute('data-focus-stage'), '3');
  const badgeLabel = { contains: other => other === badgeLabel };
  f.badges[2].appendChild(badgeLabel);
  f.badges[2].emit('focusout', { relatedTarget: badgeLabel });
  assert.equal(f.overview.getAttribute('data-focus-stage'), '3', 'focus movement within a badge keeps its stage');
  f.badges[2].emit('focusout', { relatedTarget: f.legends[1] });
  assert.equal(f.overview.getAttribute('data-focus-stage'), '2', 'leaving keyboard focus falls back to the hovered legend');
  f.legends[1].emit('pointerleave');
  assert.equal(f.overview.getAttribute('data-focus-stage'), null);
  f.badges[3].emit('pointerenter');
  assert.equal(f.overview.getAttribute('data-focus-stage'), '4');
  f.controller.destroy();
  assert.equal(f.overview.getAttribute('data-focus-stage'), null);
  assert.deepEqual(nodes.map(node => node.getAttribute('tabindex')), ['-1', null, null, null, null, '3', null, null]);
  assert.ok(nodes.every(node => node.listenerCount() === 0));
  assert.equal(f.win.listenerCount(), 0);
  assert.equal(f.doc.listenerCount(), 0);
  assert.equal(f.fine.listenerCount(), 0);
  assert.equal(f.reduced.listenerCount(), 0);
  assert.ok(f.observer.disconnected);
  f.legends[3].emit('pointerenter');
  f.badges[0].emit('focusin');
  assert.equal(f.overview.getAttribute('data-focus-stage'), null, 'detached listeners cannot mutate the figure');
  assert.equal(f.frames.size, 0);
});

testOverview('coarse timeline and continuation scenes animate leaf nodes, horizontal lists, and clean their styles', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion, { scenes: true });
  f.intersect(f.timeline);
  f.intersect(f.continuationCopy);
  f.intersect(f.afterRoute);
  assert.ok(f.timelineItems.every(node => node.style.transform === 'translateY(10px)'));
  assert.equal(f.continuationHeading.style.transform, undefined, 'a heading and its child line do not animate twice');
  assert.equal(f.continuationLine.style.transform, 'translateY(10px)');
  assert.equal(f.continuationParagraph.style.transform, 'translateY(10px)');
  assert.ok(f.afterItems.every(node => node.style.transform === 'translateX(-10px)'));
  f.advance(220);
  assert.notEqual(f.timelineItems[0].style.opacity, f.timelineItems[1].style.opacity, 'timeline items are staggered');
  assert.notEqual(f.afterItems[0].style.opacity, f.afterItems[1].style.opacity, 'continuation items are staggered');
  const count = f.frames.size;
  f.intersect(f.timeline);
  f.intersect(f.continuationCopy);
  f.intersect(f.afterRoute);
  assert.equal(f.frames.size, count, 'seen scenes do not create duplicate actors');
  f.advance(550);
  assert.equal(f.timelineItems[0].style.transform, undefined);
  assert.equal(f.timelineFocus.style.transform, 'translateX(6px)', 'timeline focus receives its final emphasis');
  f.advance(720);
  assert.ok(f.afterItems.every(node => node.style.transform === undefined && node.style.opacity === undefined));
  assert.equal(f.continuationLine.style.transform, undefined);
  assert.equal(f.continuationParagraph.style.transform, undefined);
  f.advance(1030);
  assert.ok(f.timelineItems.every(node => node.style.transform === undefined && node.style.opacity === undefined));
  assert.equal(f.frames.size, 0);
});

testOverview('initial reduced motion keeps overview, badges, timeline, and continuation fully static', (t, initEditorialMotion) => {
  const f = overviewFixture(t, initEditorialMotion, { reduced: true, scenes: true });
  assert.equal(f.controller.mode, 'reduced');
  f.setTop(0);
  for (const target of [f.svg, f.timeline, f.continuationCopy, f.afterRoute]) f.intersect(target);
  assertStaticOverview(f);
  for (const node of [...f.timelineItems, f.continuationHeading, f.continuationLine, f.continuationParagraph, ...f.afterItems]) {
    assert.equal(node.style.opacity, undefined);
    assert.equal(node.style.transform, undefined);
  }
  assert.equal(f.frames.size, 0);
});
