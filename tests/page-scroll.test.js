import test from 'node:test';
import assert from 'node:assert/strict';
import { createPageScroll, getChapterScrollTop } from '../src/page-scroll.js';

function target() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, event = {}) { for (const fn of [...(listeners.get(type) || [])]) fn(event); },
    count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}
function environment({ fine = true, reduce = false, off = false, height = 800 } = {}) {
  const doc = Object.assign(target(), {
    hidden: false, body: { dataset: off ? { motion: 'off' } : {}, scrollHeight: 10000 },
    documentElement: { scrollHeight: 10000 },
  });
  const media = {
    fine: Object.assign(target(), { matches: fine }),
    reduce: Object.assign(target(), { matches: reduce }),
  };
  const frames = new Map(), timers = new Map(), observers = [], calls = [];
  let id = 0;
  const win = Object.assign(target(), {
    document: doc, innerHeight: height, visualViewport: { height }, scrollY: 0, scrollX: 0,
    matchMedia(query) { return query.includes('prefers-reduced-motion') ? media.reduce : media.fine; },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(key) { frames.delete(key); },
    setTimeout(fn, ms) { timers.set(++id, { fn, ms }); return id; },
    clearTimeout(key) { timers.delete(key); },
    scrollTo(options) { calls.push(options); if (options.behavior !== 'smooth') this.scrollY = options.top; },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
      observe(node, options) { this.node = node; this.options = options; }
      disconnect() { this.disconnected = true; }
    },
  });
  return {
    win, doc, media, calls, frames, timers, observers,
    element(top) { return { getBoundingClientRect: () => ({ top: top - win.scrollY }) }; },
    flushFrame() { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn()); },
    timeout() { const batch = [...timers.values()]; timers.clear(); batch.forEach(({ fn }) => fn()); },
    motion(value) { doc.body.dataset.motion = value; observers.forEach(observer => { if (!observer.disconnected) observer.fn(); }); },
  };
}
function fakeLenis() {
  const instances = [];
  class Lenis {
    constructor(options) { this.options = options; this.calls = []; this.destroyed = 0; this.stops = 0; this.starts = 0; instances.push(this); }
    scrollTo(top, options) { this.calls.push({ top, options }); }
    stop() { this.stops++; }
    start() { this.starts++; }
    destroy() { this.destroyed++; }
  }
  return { instances, loadLenis: () => Promise.resolve({ default: Lenis }) };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('short viewport destinations cross the reading line and clamp to the document', () => {
  const env = environment({ height: 390 });
  env.win.scrollY = 500;
  assert.equal(getChapterScrollTop(env.element(1200), env.win), 1176);
  assert.ok(1200 - 1176 < env.win.visualViewport.height * 0.45);
  env.win.visualViewport.height = 60;
  assert.equal(getChapterScrollTop(env.element(1200), env.win), 1189);
  assert.equal(getChapterScrollTop(env.element(5), env.win), 0);
  assert.equal(getChapterScrollTop(env.element(11000), env.win), 9940);
});

test('fine pointer loads one instance with native touch and no anchor interception', async () => {
  const env = environment(), vendor = fakeLenis();
  const driver = createPageScroll({ win: env.win, loadLenis: vendor.loadLenis });
  await tick();
  env.media.fine.emit('change'); env.media.reduce.emit('change'); await tick();
  assert.equal(vendor.instances.length, 1);
  assert.deepEqual(vendor.instances[0].options, {
    autoRaf: true, smoothWheel: true, lerp: 0.12, syncTouch: false, anchors: false, respectReducedMotion: true,
  });
  assert.equal(env.observers[0].node, env.doc.body);
  assert.deepEqual(env.observers[0].options, { attributes: true, attributeFilter: ['data-motion'] });
  driver.destroy();
});

test('coarse pointer, reduced motion and paused motion never construct Lenis', async () => {
  for (const preferences of [{ fine: false }, { reduce: true }, { off: true }]) {
    const env = environment(preferences), vendor = fakeLenis();
    let loads = 0, completed = 0;
    const driver = createPageScroll({ win: env.win, loadLenis: () => { loads++; return vendor.loadLenis(); } });
    driver.scrollTo(env.element(1200), { onComplete: () => completed++ });
    await tick();
    assert.equal(loads, 0); assert.equal(vendor.instances.length, 0);
    assert.equal(env.calls[0].top, 1176);
    if (preferences.reduce || preferences.off) { assert.equal(env.win.scrollY, 1176); assert.equal(completed, 1); }
    else assert.equal(env.calls[0].behavior, 'smooth');
    driver.destroy();
  }
});

test('failed import retains native navigation and releases completion once', async () => {
  const env = environment();
  const driver = createPageScroll({ win: env.win, loadLenis: () => Promise.reject(new Error('offline')) });
  await tick();
  const events = [];
  driver.scrollTo(env.element(1200), { onComplete: () => events.push('done'), onCancel: () => events.push('cancel') });
  assert.equal(env.calls[0].behavior, 'smooth');
  env.win.emit('scrollend'); assert.deepEqual(events, [], 'an unrelated scrollend cannot complete the target');
  env.win.scrollY = 1176; env.flushFrame(); assert.deepEqual(events, []);
  env.flushFrame(); env.win.emit('scrollend'); env.timeout();
  assert.deepEqual(events, ['done']); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  driver.destroy();
});

test('rapid navigation ignores old Lenis completion callbacks', async () => {
  const env = environment(), vendor = fakeLenis(), events = [];
  const driver = createPageScroll({ win: env.win, loadLenis: vendor.loadLenis }); await tick();
  for (const number of [1, 4, 2]) driver.scrollTo(env.element(number * 1000), {
    onComplete: () => events.push('done:' + number), onCancel: () => events.push('cancel:' + number),
  });
  const instance = vendor.instances[0];
  instance.calls[0].options.onComplete(); instance.calls[1].options.onComplete();
  assert.deepEqual(events, ['cancel:1', 'cancel:4']);
  instance.calls[2].options.onComplete(); instance.calls[2].options.onComplete(); env.timeout();
  assert.deepEqual(events, ['cancel:1', 'cancel:4', 'done:2']);
  assert.equal(instance.stops, instance.starts, 'cancelling never leaves scrolling locked');
  driver.destroy();
});

test('wheel, touch, pointer and navigation keys interrupt native navigation without pulling back', () => {
  for (const [type, event] of [['wheel', {}], ['touchstart', {}], ['touchmove', {}], ['pointerdown', {}], ['keydown', { key: 'PageUp' }]]) {
    const env = environment({ fine: false }), events = [];
    const driver = createPageScroll({ win: env.win });
    driver.scrollTo(env.element(4000), { onComplete: () => events.push('done'), onCancel: () => events.push('cancel') });
    env.win.scrollY = 800; env.win.emit(type, event);
    assert.deepEqual(events, ['cancel'], type); assert.equal(env.win.scrollY, 800);
    env.win.scrollY = 300; env.win.emit('scrollend'); env.flushFrame(); env.timeout();
    assert.equal(env.win.scrollY, 300); assert.deepEqual(events, ['cancel']);
    driver.destroy();
  }
});

test('unrelated keys preserve a pending target and timeout releases it without a new jump', () => {
  const env = environment({ fine: false }), events = [];
  const driver = createPageScroll({ win: env.win });
  driver.scrollTo(env.element(4000), { onComplete: () => events.push('done'), onCancel: () => events.push('cancel') });
  env.win.emit('keydown', { key: 'a' }); assert.deepEqual(events, []);
  env.win.scrollY = 100; env.timeout();
  assert.deepEqual(events, ['cancel']); assert.equal(env.win.scrollY, 100); assert.equal(env.frames.size, 0);
  driver.destroy();
});

test('late Lenis import cannot start after destroy and all listeners are removed', async () => {
  const env = environment(), vendor = fakeLenis(); let resolveModule;
  const driver = createPageScroll({ win: env.win, loadLenis: () => new Promise(resolve => { resolveModule = resolve; }) });
  driver.destroy(); driver.destroy();
  resolveModule({ default: class { constructor() { vendor.instances.push(this); } } }); await tick();
  assert.equal(vendor.instances.length, 0);
  assert.equal(env.win.count(), 0); assert.equal(env.doc.count(), 0);
  assert.equal(env.media.fine.count() + env.media.reduce.count(), 0);
  assert.ok(env.observers.every(observer => observer.disconnected));
  assert.equal(env.frames.size + env.timers.size, 0);
});

test('pause, visibility and BFCache suspend and restore exactly one instance', async () => {
  const env = environment(), vendor = fakeLenis();
  const driver = createPageScroll({ win: env.win, loadLenis: vendor.loadLenis }); await tick();
  env.motion('off'); assert.equal(vendor.instances[0].destroyed, 1);
  env.motion('on'); await tick(); assert.equal(vendor.instances.length, 2);
  env.doc.hidden = true; env.doc.emit('visibilitychange'); assert.equal(vendor.instances[1].destroyed, 1);
  env.doc.hidden = false; env.doc.emit('visibilitychange'); await tick(); assert.equal(vendor.instances.length, 3);
  env.win.emit('pagehide', { persisted: true }); assert.equal(vendor.instances[2].destroyed, 1);
  env.win.emit('pageshow', { persisted: true }); await tick(); assert.equal(vendor.instances.length, 4);
  assert.equal(vendor.instances.filter(instance => !instance.destroyed).length, 1);
  driver.destroy(); assert.ok(vendor.instances.every(instance => instance.destroyed === 1));
});

test('a stale import while hidden cannot create a second instance on restore', async () => {
  const env = environment(), vendor = fakeLenis(); let resolveModule;
  const driver = createPageScroll({ win: env.win, loadLenis: () => new Promise(resolve => { resolveModule = resolve; }) });
  env.doc.hidden = true; env.doc.emit('visibilitychange');
  env.doc.hidden = false; env.doc.emit('visibilitychange');
  resolveModule({ default: class {
    constructor() { vendor.instances.push(this); }
    destroy() {}
  } }); await tick();
  assert.equal(vendor.instances.length, 1); driver.destroy();
});

test('a failing vendor scroll method falls back and cannot leave a pending hold', async () => {
  const env = environment(); let destroyed = 0, done = 0;
  class BrokenLenis {
    scrollTo() { throw new Error('lost scroll engine'); }
    stop() {} start() {} destroy() { destroyed++; }
  }
  const driver = createPageScroll({ win: env.win, loadLenis: () => Promise.resolve({ default: BrokenLenis }) }); await tick();
  driver.scrollTo(env.element(1200), { onComplete: () => done++ });
  assert.equal(destroyed, 1); assert.equal(env.calls[0].top, 1176);
  env.win.scrollY = 1176; env.win.emit('scrollend');
  assert.equal(done, 1); driver.destroy();
});
