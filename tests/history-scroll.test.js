import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryScroll } from '../src/history-scroll.js';

// A tiny fake window: listener registry, observer classes, rAF queue. Nothing
// in this suite needs a browser — selection is pure position arithmetic.
function makeWin(innerHeight = 800) {
  const listeners = new Map();
  const observers = [];
  const frames = [];
  const timers = new Map();
  let timerId = 0;
  class FakeObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = [];
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.targets.push(target); }
    unobserve(target) { this.targets = this.targets.filter((t) => t !== target); }
    disconnect() { this.disconnected = true; this.targets = []; }
  }
  return {
    innerHeight,
    observers,
    frames,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    emit(type, event = {}) {
      for (const handler of [...(listeners.get(type) ?? [])]) handler(event);
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    requestAnimationFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelAnimationFrame(id) {
      if (frames[id - 1]) frames[id - 1] = null;
    },
    flushFrames() {
      for (const callback of frames.splice(0)) {
        if (callback) callback();
      }
    },
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    },
    setTimeout(callback, ms) {
      timerId += 1;
      timers.set(timerId, { callback, ms });
      return timerId;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    pendingTimers() {
      return timers.size;
    },
    IntersectionObserver: FakeObserver,
    ResizeObserver: FakeObserver,
  };
}

// A step element stub: chapter number in dataset, viewport rect on the wrapper
// so layout() moves are visible to getBoundingClientRect().
function step(number, top, bottom) {
  const wrapper = {
    number,
    top,
    bottom,
    element: {
      dataset: { chapter: String(number) },
      getBoundingClientRect() {
        return {
          top: wrapper.top,
          bottom: wrapper.bottom,
          height: wrapper.bottom - wrapper.top,
          width: 800,
        };
      },
      scrollIntoView(options) {
        this.lastScroll = options;
      },
    },
  };
  return wrapper;
}

function layout(win, rects) {
  // rects: [{number, top, bottom}] — moves the stubbed steps to new positions.
  for (const rect of rects) {
    const target = win.__steps.find((s) => s.number === rect.number);
    target.top = rect.top;
    target.bottom = rect.bottom;
  }
}

test('selects the chapter crossing the reading line', () => {
  const win = makeWin(800);
  const steps = [step(1, -500, 0), step(2, 0, 500), step(3, 500, 1000), step(4, 1000, 1500)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  // Reading line = 0.45 * 800 = 360 → inside chapter 2 (0..500).
  controller.refresh();
  assert.deepEqual(calls, [2]);
  assert.equal(controller.refresh(), 2, 'refresh reports the current chapter');
});

test('forwards only changed numbers', () => {
  const win = makeWin(800);
  const steps = [step(1, -500, 0), step(2, 0, 500), step(3, 500, 1000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  controller.refresh();
  controller.refresh();
  controller.refresh();
  assert.deepEqual(calls, [2], 'same position never re-emits');
  layout(win, [{ number: 2, top: -800, bottom: -300 }, { number: 3, top: -300, bottom: 200 }]);
  controller.refresh();
  assert.deepEqual(calls, [2, 3]);
});

test('reverse scrolling moves the selection back', () => {
  const win = makeWin(800);
  const steps = [step(1, -1000, -500), step(2, -500, 0), step(3, 0, 500), step(4, 500, 1000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  controller.refresh();
  assert.deepEqual(calls, [3]);
  // Scroll back up: chapter 1 now crosses the reading line.
  layout(win, [
    { number: 1, top: 100, bottom: 600 },
    { number: 2, top: 600, bottom: 1100 },
    { number: 3, top: 1100, bottom: 1600 },
    { number: 4, top: 1600, bottom: 2100 },
  ]);
  controller.refresh();
  assert.deepEqual(calls, [3, 1]);
});

test('large jump: latest position wins with no stale intermediate calls', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 500), step(2, 500, 1000), step(3, 1000, 1500), step(4, 1500, 2000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  // Drag the scrollbar from top to bottom: two scroll events inside one frame.
  win.emit('scroll');
  layout(win, [
    { number: 1, top: -3000, bottom: -2500 },
    { number: 2, top: -2500, bottom: -2000 },
    { number: 3, top: -2000, bottom: -1500 },
    { number: 4, top: -1500, bottom: -1000 },
  ]);
  win.emit('scroll');
  win.flushFrames();
  assert.deepEqual(calls, [4], 'one call, at the final position');
});

test('gap, before-first and after-last fall back to the nearest passed chapter', () => {
  const win = makeWin(800);
  const steps = [step(1, -200, 200), step(2, 260, 700), step(3, 760, 1200)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  // Line 360 sits in the gap 200..260? No — 360 is inside chapter 2 (260..700).
  controller.refresh();
  assert.deepEqual(calls, [2]);
  // Gap 700..760: most recently passed chapter is 2? Move line into gap.
  layout(win, [{ number: 2, top: -400, bottom: 200 }, { number: 3, top: 260, bottom: 700 }]);
  controller.refresh(); // line 360 inside chapter 3 now? 260..700 → 3
  assert.deepEqual(calls, [2, 3]);
  layout(win, [
    { number: 1, top: -900, bottom: -500 },
    { number: 2, top: -440, bottom: -40 }, // line 360 is above its bottom? no
    { number: 3, top: 20, bottom: 460 },
  ]);
  controller.refresh(); // 360 inside chapter 3
  assert.deepEqual(calls, [2, 3]);
  // Line in a gap (chapter 3 ends 200, chapter 4 starts 500) → stays at 3.
  layout(win, [{ number: 2, top: -1000, bottom: -600 }, { number: 3, top: -600, bottom: 200 }]);
  controller.refresh(); // 360 below chapter 3 (bottom 200): last passed = 3
  assert.deepEqual(calls, [2, 3], 'still chapter 3 while between chapters');
  // Before all steps → first chapter.
  layout(win, [
    { number: 1, top: 500, bottom: 900 },
    { number: 2, top: 900, bottom: 1300 },
    { number: 3, top: 1300, bottom: 1700 },
  ]);
  controller.refresh();
  assert.deepEqual(calls, [2, 3, 1], 'before the first step selects chapter 1');
  // After all steps → last chapter.
  layout(win, [
    { number: 1, top: -3000, bottom: -2600 },
    { number: 2, top: -2600, bottom: -2200 },
    { number: 3, top: -2200, bottom: -1800 },
  ]);
  controller.refresh();
  assert.deepEqual(calls, [2, 3, 1, 3], 'past the last step keeps the last chapter');
});

test('ignores invalid numbers without changing state', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 500), step(2, 500, 1000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  for (const bad of [0, -1, 3, 1.5, '2', null, undefined, NaN, {}]) {
    controller.select(bad);
  }
  assert.deepEqual(calls, [], 'invalid numbers never emit');
  controller.refresh();
  assert.deepEqual(calls, [1], 'state machine still works after invalid input');
});

test('select(number, {scroll}) scrolls the step into view only when asked', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 500), step(2, 500, 1000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  controller.select(2);
  assert.deepEqual(calls, [2]);
  assert.equal(steps[1].element.lastScroll, undefined, 'no scrolling by default');
  controller.select(1, { scroll: true });
  assert.deepEqual(calls, [2, 1]);
  assert.equal(steps[0].element.lastScroll?.block, 'start');
});

test('holds the selection during a programmatic scroll', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 500), step(2, 500, 1000), step(3, 1000, 1500)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  controller.select(3, { scroll: true });
  assert.deepEqual(calls, [3]);
  // Intermediate frames of the smooth scroll still see chapter 1 at the line.
  win.emit('scroll');
  win.flushFrames();
  assert.deepEqual(calls, [3], 'no stale intermediate call during the scroll');
  // The scroll arrives: chapter 3 crosses the line and the hold clears.
  layout(win, [
    { number: 1, top: -2500, bottom: -2000 },
    { number: 2, top: -2000, bottom: -1500 },
    { number: 3, top: -1500, bottom: -1000 },
  ]);
  win.emit('scroll');
  win.flushFrames();
  assert.deepEqual(calls, [3]);
  // Position truth wins again afterwards.
  layout(win, [{ number: 1, top: -5000, bottom: -4500 }, { number: 2, top: -4500, bottom: -4000 }, { number: 3, top: -4000, bottom: -3500 }]);
  controller.refresh();
  assert.deepEqual(calls, [3], 'still 3: past the last step keeps the last chapter');
  controller.select(2, { scroll: true });
  layout(win, [{ number: 1, top: -100, bottom: 400 }, { number: 2, top: 400, bottom: 900 }, { number: 3, top: 900, bottom: 1400 }]);
  controller.refresh();
  assert.deepEqual(calls, [3, 2]);
});

test('destroy removes listeners and observers and stops callbacks', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 500), step(2, 500, 1000)];
  win.__steps = steps;
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
    win,
  });
  assert.equal(win.listenerCount('scroll'), 1);
  assert.equal(win.listenerCount('resize'), 1);
  assert.equal(win.observers.length, 4, 'IntersectionObserver + ResizeObserver per step');
  assert.ok(win.observers.every((o) => o.targets.length > 0));
  // A pending scheduled update must be cancelled too.
  win.emit('scroll');
  controller.destroy();
  assert.equal(win.listenerCount('scroll'), 0);
  assert.equal(win.listenerCount('resize'), 0);
  assert.ok(win.observers.every((o) => o.disconnected), 'all observers disconnected');
  assert.equal(win.pendingTimers(), 0, 'no timers left behind');
  win.flushFrames();
  assert.deepEqual(calls, [], 'nothing emits after destroy');
  controller.refresh();
  controller.select(2, { scroll: true });
  assert.deepEqual(calls, [], 'refresh and select are inert after destroy');
  controller.destroy(); // idempotent
});

test('a positions provider replaces DOM measurement', () => {
  const win = makeWin(800);
  const steps = [step(1, 0, 1), step(2, 0, 1)]; // stub rects are ignored
  win.__steps = steps;
  const calls = [];
  let positions = [
    { number: 1, top: -800, bottom: -300 },
    { number: 2, top: -300, bottom: 200 },
    { number: 3, top: 200, bottom: 700 },
  ];
  const controller = createHistoryScroll({
    steps: [{ number: 1, element: steps[0].element }, { number: 2, element: steps[1].element }, { number: 3, element: {} }],
    onChapter: (number) => calls.push(number),
    positions: () => positions,
    win,
  });
  controller.refresh();
  assert.deepEqual(calls, [3], '360 is inside the provider span 200..700');
  positions = [
    { number: 1, top: 100, bottom: 600 },
    { number: 2, top: 600, bottom: 1100 },
    { number: 3, top: 1100, bottom: 1600 },
  ];
  controller.refresh();
  assert.deepEqual(calls, [3, 1]);
});

test('custom offset moves the reading line', () => {
  const win = makeWin(1000);
  const steps = [step(1, -100, 400), step(2, 400, 700), step(3, 700, 1400)];
  win.__steps = steps;
  const lowCalls = [];
  const highCalls = [];
  createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => lowCalls.push(number),
    win,
  }).refresh();
  createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => highCalls.push(number),
    offset: 0.8,
    win,
  }).refresh();
  assert.deepEqual(lowCalls, [2], 'line 450 is inside chapter 2 (400..700)');
  assert.deepEqual(highCalls, [3], 'line 800 is inside chapter 3 (700..1400)');
});

test('works without a window: manual refresh and select only', () => {
  const steps = [step(1, -500, 0), step(2, 0, 500)];
  const calls = [];
  const controller = createHistoryScroll({
    steps: steps.map((s) => s.element),
    onChapter: (number) => calls.push(number),
  });
  controller.refresh();
  assert.deepEqual(calls, [2], 'selection logic is pure position math');
  controller.destroy();
});

test('null/empty chapter metadata falls back to position numbering, never 0', () => {
  const win = makeWin(800);
  const first = step(1, 0, 500);
  first.element.dataset.chapter = ''; // Number('') === 0 — must not steal numbering
  const second = step(2, 500, 1000);
  second.element.dataset.chapter = null; // Number(null) === 0 — same
  win.__steps = [first, second];
  const calls = [];
  const controller = createHistoryScroll({
    steps: [
      { number: null, element: first.element },
      { number: '', element: second.element },
    ],
    onChapter: (number) => calls.push(number),
    win,
  });
  // Reading line 360 is inside the first span; with both metadata slots
  // rejected it resolves to position number 1, not the coerced 0, and the
  // second step keeps its own position number 2 instead of being dropped.
  controller.refresh();
  assert.deepEqual(calls, [1]);
  assert.equal(controller.refresh(), 1);
  controller.destroy();
});
