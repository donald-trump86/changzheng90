import test from 'node:test';
import assert from 'node:assert/strict';
import { initImageViewer } from '../src/image-viewer.js';

// Exercise the public enhancement against native EventTarget dispatch. Layout is
// supplied explicitly; scrolling, focus and pointer capture remain observable.
class Element extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = { ...dataset };
    this.style = {};
    this.attributes = new Map();
    this.isConnected = true;
    this.focuses = 0;
  }
  getAttribute(name) {
    const key = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return name.startsWith('data-') ? this.dataset[key] ?? null : this.attributes.get(name) ?? null;
  }
  setAttribute(name, value) {
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    else this.attributes.set(name, value);
  }
  removeAttribute(name) {
    if (name.startsWith('data-')) delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
    else this.attributes.delete(name);
  }
  focus() { this.focuses++; }
}
function fire(node, type, fields = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [name, value] of Object.entries(fields)) Object.defineProperty(event, name, { value });
  node.dispatchEvent(event);
  return event;
}
function setup() {
  const viewport = new Element();
  Object.assign(viewport, { clientWidth: 500, clientHeight: 400, scrollLeft: 0, scrollTop: 0 });
  viewport.scrollTo = (x, y) => { viewport.scrollLeft = x; viewport.scrollTop = y; };
  const captures = new Set();
  viewport.setPointerCapture = (id) => captures.add(id);
  viewport.hasPointerCapture = (id) => captures.has(id);
  viewport.releasePointerCapture = (id) => {
    captures.delete(id);
    fire(viewport, 'lostpointercapture', { pointerId: id });
  };
  const dialog = new Element();
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; fire(dialog, 'close'); };
  dialog.querySelector = () => viewport;
  dialog.querySelectorAll = () => [];
  dialog.getBoundingClientRect = () => ({left:100, top:100, right:600, bottom:500});
  viewport.getBoundingClientRect = () => ({left:0,top:0,right:500,bottom:400});
  const image = new Element();
  image.naturalWidth = 2000;
  image.naturalHeight = 1000;
  image.decode = () => new Promise(() => {});
  const link = new Element({ imageTitle: '完整原图', imageCaption: '档案说明' });
  link.href = '/original.jpg';
  link.querySelector = () => ({ alt: '历史地图' });
  const title = new Element();
  const caption = new Element();
  const nodes = { 'image-dialog': dialog, 'dialog-image': image, 'dialog-title': title, 'dialog-caption': caption };
  const root = { getElementById: (id) => nodes[id], querySelectorAll: () => [link] };
  const win = new EventTarget();
  let disconnected = false;
  win.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  const api = initImageViewer(root, win);
  const click = (node, fields = {}) => fire(node, 'click', { button: 0, ...fields });
  const open = () => { click(link); fire(image, 'load'); };
  const down = (fields = {}) => fire(viewport, 'pointerdown', {
    pointerType: 'mouse', isPrimary: true, button: 0, pointerId: 7, clientX: 250, clientY: 150, ...fields
  });
  const move = (fields = {}) => fire(viewport, 'pointermove', { pointerId: 7, clientX: 200, clientY: 110, ...fields });
  return { api, viewport, dialog, image, link, caption, captures, click, open, down, move,
    wheel: (deltaY) => fire(viewport, 'wheel', {deltaY, deltaMode:0, clientX:0, clientY:0}),
    key: (key) => fire(dialog, 'keydown', {key}),
    disconnected: () => disconnected };
}

test('viewer pans only a zoomed mouse pointer and releases capture after pointer completion', () => {
  const env = setup();
  env.open();
  assert.equal(env.image.dataset.zoom, '1');
  assert.equal(env.down().defaultPrevented, false);
  env.wheel(-Math.log(1.5) / .002);
  assert.equal(env.image.dataset.zoom, '1.5');
  assert.equal(env.viewport.dataset.pannable, 'true');
  assert.equal(env.down({ pointerType: 'touch' }).defaultPrevented, false);
  assert.equal(env.down({ pointerType: 'pen' }).defaultPrevented, false);
  assert.equal(env.down({ button: 2 }).defaultPrevented, false);
  assert.equal(env.captures.size, 0);
  assert.equal(env.down().defaultPrevented, true);
  assert.equal(env.viewport.dataset.dragging, 'true');
  env.move({ pointerId: 9 });
  assert.equal(env.viewport.scrollLeft, 0);
  assert.equal(env.move().defaultPrevented, true);
  assert.equal(env.viewport.scrollLeft, 50);
  assert.equal(env.viewport.scrollTop, 40);
  fire(env.viewport, 'pointerup', { pointerId: 7 });
  assert.equal(env.captures.size, 0);
  assert.equal(env.viewport.dataset.dragging, 'false');
  env.move();
  assert.equal(env.viewport.scrollLeft, 50);
  env.api.destroy();
});

test('double click toggles fit and 2x; fit reset releases an active drag', () => {
  const env = setup();
  env.open();
  fire(env.viewport, 'dblclick', { button: 0 });
  assert.equal(env.image.dataset.zoom, '2');
  assert.equal(env.image.style.width, '1000px');
  env.down();
  env.move();
  fire(env.viewport, 'dblclick', { button: 0 });
  assert.equal(env.image.dataset.zoom, '1');
  assert.equal(env.viewport.scrollLeft, 0);
  assert.equal(env.captures.size, 0);
  assert.equal(env.viewport.dataset.pannable, 'false');
  env.wheel(-Math.log(1.5) / .002);
  env.down();
  env.key('0');
  assert.equal(env.captures.size, 0);
  assert.equal(env.image.dataset.zoom, '1');
  env.api.destroy();
});

for (const finish of ['pointercancel', 'lostpointercapture', 'close', 'error', 'destroy']) {
  test(`viewer clears drag state on ${finish} and ignores later movement`, () => {
    const env = setup();
    env.open();
    env.wheel(-Math.log(1.5) / .002);
    env.down();
    if (finish === 'close') env.dialog.close();
    else if (finish === 'error') fire(env.image, 'error');
    else if (finish === 'destroy') env.api.destroy();
    else fire(env.viewport, finish, { pointerId: 7 });
    const left = env.viewport.scrollLeft;
    env.move();
    assert.equal(env.viewport.scrollLeft, left);
    assert.equal(env.captures.size, 0);
    if (finish === 'destroy') {
      assert.equal(env.viewport.getAttribute('data-dragging'), null);
      assert.equal(env.disconnected(), true);
    } else assert.equal(env.viewport.dataset.dragging, 'false');
    if (finish === 'close') assert.equal(env.link.focuses, 1);
    if (finish === 'error') assert.match(env.caption.textContent, /无法载入/);
    env.api.destroy();
  });
}

test('modified clicks remain native and destroy restores ordinary image links', () => {
  const env = setup();
  assert.equal(env.click(env.link, { ctrlKey: true }).defaultPrevented, false);
  assert.equal(env.click(env.link, { metaKey: true }).defaultPrevented, false);
  assert.equal(env.dialog.open, false);
  env.api.destroy();
  assert.equal(env.click(env.link).defaultPrevented, false);
  assert.equal(env.dialog.open, false);
  assert.equal(env.click(env.link, { ctrlKey: true }).defaultPrevented, false);
});

test('wheel zoom preserves the cursor point, clamps scale, and dialog follows image ratio', () => {
  const env = setup(); env.open();
  assert.equal(parseFloat(env.dialog.style.width) / parseFloat(env.dialog.style.height), 2);
  const event = fire(env.viewport, 'wheel', {deltaY:-Math.log(2)/.002, deltaMode:0, clientX:120, clientY:90});
  assert.equal(event.defaultPrevented, true);
  assert.equal(env.image.dataset.zoom, '2');
  assert.equal(env.viewport.scrollLeft, 120);
  assert.equal(env.viewport.scrollTop, 90);
  env.wheel(-10000); assert.equal(env.image.dataset.zoom, '4');
  env.wheel(10000); assert.equal(env.image.dataset.zoom, '1');
  assert.equal(env.viewport.scrollLeft, 0);
  env.image.naturalWidth = 1000; env.image.naturalHeight = 2000;
  fire(env.image, 'load');
  assert.equal(parseFloat(env.dialog.style.width) / parseFloat(env.dialog.style.height), .5);
  env.api.destroy();
});

test('only a complete outside click closes the dialog and restores focus', () => {
  const env=setup();env.open();
  fire(env.dialog,'pointerdown',{clientX:200,clientY:200});
  env.click(env.dialog,{clientX:20,clientY:20});
  assert.equal(env.dialog.open,true,'dragging out never closes');
  fire(env.dialog,'pointerdown',{clientX:20,clientY:20});
  env.click(env.dialog,{clientX:20,clientY:20});
  assert.equal(env.dialog.open,false);
  assert.equal(env.link.focuses,1);
  env.api.destroy();
});
