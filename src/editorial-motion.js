/* 编辑动效层（exhibition motion）——「有目的的动」。
   契约：export function initEditorialMotion({ root = document, reduced })
   返回 { pause(), resume(), destroy() }。
   - anime（public/vendor/anime-4.5.0.esm.min.js）只以动态 import + try/catch 载入；
     载入失败时由内置 rAF 引擎接管，任何行为都不缺位；本模块在没有 anime 时也可安全 import。
   - 只动画 transform / opacity；唯一例外是路线的 stroke-dashoffset 与河面虚线相位
     （纯绘制，不影响布局）。
   - prefers-reduced-motion: reduce → 立即静态归位；body[data-motion="off"] → 完全静态。
   - 无脚本或出错时：所有内容静态可读（failStatic 清除全部内联样式并撤下控件）。
   动效清单（触发 → 效果 → 时长/缓动）见 .superpowers/sdd/2026-10-23-museum-redesign/task-2-report.md。 */

const ANIME_MODULE = '../public/vendor/anime-4.5.0.esm.min.js';

let animeLoaded = null; // Promise<module|null>；只建立一次
let animeModule = null; // 载入成功后由它驱动产品动效；失败则始终走 rAF 引擎
function loadAnime() {
  if (!animeLoaded) {
    animeLoaded = import(ANIME_MODULE)
      .then((module) => (module && typeof module.animate === 'function' ? module : null))
      .catch(() => null); // 载入失败静默降级：内容与交互必须照常工作
  }
  return animeLoaded;
}

/* 内置补间引擎（anime 缺席时的等价实现：延迟、错峰、缓动、循环、取消） */
const EASE = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2
};

function rafTween(targets, to, options, update, finish) {
  const ease = EASE[options.ease] || EASE.outCubic;
  const duration = Math.max(1, options.duration || 300);
  const gap = Math.max(0, options.gap || 0);
  const loop = Boolean(options.loop);
  const keys = Object.keys(to);
  const starts = targets.map((target, index) => ({
    target,
    delay: index * gap,
    from: keys.map((key) => Number(target[key]) || 0)
  }));
  const span = duration + gap * Math.max(0, targets.length - 1);
  const t0 = performance.now();
  let frame = 0;
  let stopped = false;
  const step = (now) => {
    if (stopped) return;
    const elapsed = loop ? (now - t0) % span : Math.min(now - t0, span);
    for (const start of starts) {
      const p = Math.min(1, Math.max(0, (elapsed - start.delay) / duration));
      const e = ease(p);
      keys.forEach((key, i) => {
        start.target[key] = start.from[i] + (to[key] - start.from[i]) * e;
      });
    }
    if (update) update();
    if (stopped) return;
    if (loop || elapsed < span) frame = requestAnimationFrame(step);
    else if (finish) finish();
  };
  frame = requestAnimationFrame(step);
  return {
    cancel() {
      stopped = true;
      cancelAnimationFrame(frame);
    }
  };
}

function defaultReduced() {
  if (typeof matchMedia === 'function') return matchMedia('(prefers-reduced-motion: reduce)');
  return { matches: false, addEventListener() {}, removeEventListener() {} };
}

let revealId = 0;

// Reveal through a separate stroke so each crossing keeps its original dash pattern.
export function createChapterRouteReveal(path) {
  const svg = path.ownerSVGElement;
  const doc = path.ownerDocument;
  const length = path.getTotalLength();
  const originalMask = path.getAttribute('mask');
  const make = (name, attributes) => {
    const node = doc.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const mask = make('mask', { id: `chishui-route-reveal-${++revealId}`, 'data-motion-mask': '', maskUnits: 'userSpaceOnUse' });
  const box = svg.viewBox.baseVal;
  for (const [key, value] of Object.entries({ x: box.x - 40, y: box.y - 40, width: box.width + 80, height: box.height + 80 })) mask.setAttribute(key, String(value));
  const ink = make('path', { d: path.getAttribute('d'), fill: 'none', stroke: 'white', 'stroke-width': 28, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': `${length} ${length}`, 'stroke-dashoffset': length });
  const head = make('circle', { r: 3.5, fill: `var(--stage-${path.getAttribute('data-static-route')})`, stroke: 'var(--paper)', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', 'aria-hidden': 'true', 'pointer-events': 'none' });
  mask.appendChild(ink);
  svg.appendChild(mask);
  svg.appendChild(head);
  path.setAttribute('mask', `url(#${mask.id})`);
  return {
    update(value) {
      const progress = Math.min(1, Math.max(0, value));
      ink.setAttribute('stroke-dashoffset', String(length * (1 - progress)));
      try {
        const point = path.getPointAtLength(length * progress);
        head.setAttribute('transform', `translate(${point.x} ${point.y})`);
      } catch (error) {
        this.finish();
        throw error;
      }
    },
    finish() {
      if (originalMask === null) path.removeAttribute('mask');
      else path.setAttribute('mask', originalMask);
      mask.remove();
      head.remove();
    },
  };
}

export function initEditorialMotion({ root = document, reduced = defaultReduced() } = {}) {
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || window;
  const $ = (selector, from = root) => from.querySelector(selector);
  const all = (selector, from = root) => [...from.querySelectorAll(selector)];

  /* ── 状态 ─────────────────────────────────────── */
  const actors = new Map();          // 每个动画一个属主，可整体取消
  const touched = new Set();         // 写过内联样式的节点，恢复时清空
  const scenes = new Map();          // 区块 → 可重复入场元素
  const seen = new Set();
  const cleanups = [];
  const handledEvents = new WeakSet();
  let userOff = doc.body && doc.body.getAttribute('data-motion') === 'off';
  let paused = false;
  let destroyed = false;
  let departed = false;
  let pendingPlay = true;            // 有新路线待画，进入视口即画
  let routeFrame = 0;
  let scrollFrame = 0;
  let drift = 0;
  let parallax = 0;
  let writingMotion = false;
  let observer = null;

  const route = $('#current-route');
  const head = $('#march-head');
  const mapCanvas = $('.map-canvas');
  const toggle = $('#motion-toggle');
  const replay = $('#replay-route');
  const meter = $('#reading-progress');
  const river = $('.river-flow');
  const art = $('.hero-art img');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  const forced = win.matchMedia('(forced-colors: active)');
  const overview = $('.context-overview');
  const overviewSVG = overview && $('svg.static-map-drawing', overview);
  let overviewPlayed = false;
  const chapterMaps = all('.chapter-map').map((figure, index) => ({
    figure, svg: $('svg', figure), path: $('[data-static-route]', figure), key: `chapter-map-${index}`, played: false, button: null,
  }));

  const mode = () => {
    if (destroyed || userOff || paused) return 'off';
    if ((reduced && reduced.matches) || forced.matches) return 'reduced';
    return 'full';
  };
  const blocked = () => mode() !== 'full' || departed || (doc.hidden ?? false);
  const visible = (node) => {
    if (node.checkVisibility && !node.checkVisibility()) return false;
    const closed = node.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(node)) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < win.innerHeight && rect.bottom > 0;
  };

  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  }
  /* 同一事件对象可能同时冒泡到 window 与 document：只处理一次 */
  function once(name, handler) {
    const wrapped = (event) => {
      if (handledEvents.has(event)) return;
      handledEvents.add(event);
      handler(event);
    };
    listen(doc, name, wrapped);
    if (win !== doc) listen(win, name, wrapped);
  }

  function clearNode(node) {
    node.style.removeProperty('opacity');
    node.style.removeProperty('transform');
  }

  function cancel(key) {
    const entry = actors.get(key);
    if (!entry) return;
    actors.delete(key); // 先失效回调，再取消；收尾必须仍执行（恢复静态样式）
    entry.actor?.cancel();
    if (entry.finish) entry.finish();
  }

  function cancelAll() {
    [...actors.keys()].forEach(cancel);
    if (routeFrame) win.cancelAnimationFrame(routeFrame);
    routeFrame = 0;
    if (scrollFrame) win.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    touched.forEach(clearNode);
    touched.clear();
  }

  /* run(key, targets, to, { duration, gap, ease, loop }, update, finish) */
  function run(key, targets, to, options, update, finish) {
    cancel(key);
    if (blocked()) {
      if (finish) finish();
      return;
    }
    const entry = { actor: null, finish };
    const settle = () => {
      if (actors.get(key) !== entry) return;
      actors.delete(key);
      if (finish) finish();
    };
    actors.set(key, entry);
    const guarded = (fn) => {
      if (!fn) return undefined;
      return () => {
        if (actors.get(key) !== entry || blocked()) return;
        try { fn(); } catch (error) { failStatic(error); }
      };
    };
    const module = animeModule;
    if (module) {
      try {
        entry.actor = module.animate(targets, {
          ...to,
          duration: options.duration,
          delay: options.gap ? module.stagger(options.gap) : 0,
          ease: options.ease || 'outCubic',
          loop: Boolean(options.loop),
          onUpdate: guarded(update),
          onComplete: guarded(settle)
        });
        return;
      } catch (error) {
        // anime 不可用即降级到 rAF 引擎；不允许动画问题影响内容
        actors.set(key, entry);
      }
    }
    entry.actor = rafTween(targets, to, options, guarded(update), guarded(settle));
  }

  /* ── 入场：按元素类型分形（升场 / 淡入 / 图版揭示） ── */

  function lineNodes(heading) {
    if (!heading) return [];
    const lines = all(':scope > span', heading);
    return lines.length ? lines : [heading];
  }

  function enter(key, nodes, options = {}) {
    // 叶层过滤：父标题与其行 span 不同时入场，避免 transform/opacity 双层叠加
    const picked = nodes.filter(Boolean);
    const list = [...new Set(picked)]
      .filter((node) => !picked.some((other) => other !== node && node.contains(other)))
      .filter((node) => node.getBoundingClientRect().width > 0);
    if (!list.length) return;
    list.forEach((node) => touched.add(node));
    const current = mode();
    if (current === 'off') return; // 完全静态：不写样式
    if (current !== 'full' || blocked()) return;
    const requested = options.distance ?? 12;
    const distance = fine.matches ? (options.distance ?? 16) : Math.sign(requested) * Math.min(10, Math.abs(requested));
    const duration = options.duration ?? 440;
    const gap = options.gap ?? 65;
    const values = list.map((node) => ({ node, value: 0 }));
    const apply = () => values.forEach(({ node, value }) => {
      node.style.opacity = String(value);
      if (distance) node.style.transform = `${options.axis === 'x' ? 'translateX' : 'translateY'}(${(1 - value) * distance}px)`;
    });
    let completed = false;
    const done = () => {
      list.forEach(clearNode);
      if (completed && !blocked()) options.onComplete?.();
    };
    apply();
    run(key, values, { value: 1 }, { duration, gap, ease: options.ease || 'outCubic' }, () => {
      apply();
      completed = values.every(({ value }) => value >= 1);
    }, done);
  }

  /* 图版揭示：一张衬纸自下而上揭开（transform），原图轻微落定（transform + opacity）。
     不裁切、不滤镜；减弱动态时完全静态；JS 注入的衬纸用完即删。 */
  function revealPlates(key, figures) {
    const current = mode();
    if (current !== 'full' || blocked()) return;
    const plates = figures.filter(Boolean).filter((figure) => figure.getBoundingClientRect().width > 0);
    if (!plates.length) return;
    const sheets = [];
    plates.forEach((figure) => {
      const img = figure.querySelector('img');
      const frame = img ? (img.closest('.art-window, .image-link') || img.parentElement) : null;
      if (!img || !frame) return;
      touched.add(img);
      frame.querySelectorAll(':scope > .plate-sheet').forEach((old) => old.remove());
      frame.style.position = 'relative';
      frame.style.overflow = 'clip';
      const sheet = doc.createElement('span');
      sheet.className = 'plate-sheet';
      sheet.setAttribute('aria-hidden', 'true');
      frame.appendChild(sheet);
      sheets.push({ sheet, frame, img });
    });
    const values = sheets.map(() => ({ value: 0 }));
    const apply = () => values.forEach(({ value }, index) => {
      const entry = sheets[index];
      entry.sheet.style.transform = `translateY(${-(value * 102)}%)`;
      entry.img.style.opacity = String(Math.min(1, 0.15 + value * 1.1));
      entry.img.style.transform = `scale(${1.04 - value * 0.04})`;
    });
    const done = () => sheets.forEach(({ sheet, frame, img }) => {
      sheet.remove();
      frame.style.removeProperty('position');
      frame.style.removeProperty('overflow');
      img.style.removeProperty('transform');
      img.style.removeProperty('opacity');
    });
    apply();
    run(key, values, { value: 1 }, { duration: 780, gap: 130, ease: 'outExpo' }, apply, done);
  }

  /* ── 路线：一笔画到渡口，箭头只在画完时出现，联动起点与渡口 ── */

  function clearMapAccentTransforms() {
    const startMark = $('#march-start');
    if (startMark) clearNode(startMark);
    all('.map-ford, .map-crossing-dot').forEach(clearNode);
    all('.map-previous-route').forEach((prev) => {
      prev.style.removeProperty('stroke-dasharray');
      prev.style.removeProperty('stroke-dashoffset');
    });
  }

  function finishRoute() {
    if (!route) return;
    route.style.removeProperty('stroke-dasharray');
    route.style.removeProperty('stroke-dashoffset');
    route.setAttribute('marker-end', 'url(#route-arrow)');
    if (head) {
      clearNode(head);
      head.removeAttribute('transform');
      head.setAttribute('visibility', 'hidden');
    }
    clearMapAccentTransforms();
    if (mapCanvas) mapCanvas.classList.remove('is-drawing');
  }

  function invalidateRoute() {
    if (routeFrame) win.cancelAnimationFrame(routeFrame);
    routeFrame = 0;
    cancel('route');
    cancel('map-fords');
    cancel('map-start');
    cancel('all-routes');
    finishRoute();
  }

  function mapReady() {
    if (!mapCanvas || !route || !head) return false;
    const rect = mapCanvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function mapInViewport() {
    if (!mapCanvas || !visible(mapCanvas)) return false;
    const rect = mapCanvas.getBoundingClientRect();
    return rect.width > 0 && rect.top < win.innerHeight * 0.92 && rect.bottom > win.innerHeight * 0.08;
  }

  function pulseMapMarkers() {
    if (blocked() || mode() !== 'full') return;
    const startMark = $('#march-start');
    if (startMark) {
      touched.add(startMark);
      const sVal = { value: 0 };
      const applyStart = () => {
        const v = sVal.value;
        startMark.style.opacity = String(Math.min(1, v * 1.4));
        startMark.style.transform = `scale(${0.45 + 0.55 * v})`;
      };
      applyStart();
      run('map-start', [sVal], { value: 1 }, { duration: 480, gap: 0, ease: 'outBack' }, applyStart, () => clearNode(startMark));
    }
    const fords = all('.map-ford.is-current-ford');
    if (fords.length) {
      fords.forEach((f) => touched.add(f));
      const fVals = fords.map(() => ({ value: 0 }));
      const applyFords = () => fVals.forEach(({ value }, idx) => {
        const f = fords[idx];
        f.style.opacity = String(Math.min(1, 0.25 + value * 0.75));
        f.style.transform = `scale(${0.5 + 0.5 * value})`;
      });
      applyFords();
      run('map-fords', fVals, { value: 1 }, { duration: 640, gap: 130, ease: 'outBack' }, applyFords, () => fords.forEach(clearNode));
    }
  }

  function playAllRoutes() {
    if (!mapReady() || blocked() || mode() !== 'full' || !mapInViewport()) {
      finishRoute();
      return;
    }
    cancel('all-routes');
    const prevRoutes = all('.map-previous-route.is-all-route');
    const allPaths = [...prevRoutes, route].filter(Boolean);
    if (!allPaths.length) return;
    const lengths = allPaths.map((p) => {
      try { return p.getTotalLength() || 0; } catch (e) { return 0; }
    });
    const vals = allPaths.map(() => ({ value: 0 }));
    const apply = () => vals.forEach(({ value }, i) => {
      const len = lengths[i];
      if (!len) return;
      allPaths[i].style.strokeDasharray = String(len);
      allPaths[i].style.strokeDashoffset = String(len * (1 - value));
    });
    const done = () => {
      prevRoutes.forEach((p) => {
        p.style.removeProperty('stroke-dasharray');
        p.style.removeProperty('stroke-dashoffset');
      });
      finishRoute();
    };
    apply();
    run('all-routes', vals, { value: 1 }, { duration: 920, gap: 160, ease: 'outCubic' }, apply, done);
  }

  function playRoute() {
    if (!mapReady()) return;
    invalidateRoute();
    if (blocked()) return;
    if (!mapInViewport()) {
      pendingPlay = true; // 等图面进入视口再画：不在画面外放动画
      return;
    }
    pendingPlay = false;
    if (mode() !== 'full') {
      finishRoute(); // 减弱动态 / 关闭动效：直接呈现完整路线，不描画
      return;
    }
    const length = route.getTotalLength();
    head.setAttribute('cx', '0');
    head.setAttribute('cy', '0');
    const position = { value: 0 };
    const apply = () => {
      const v = position.value;
      route.style.strokeDasharray = String(length);
      route.style.strokeDashoffset = String(length * (1 - v));
      try {
        const point = route.getPointAtLength(length * v);
        const pulse = 1 + 0.18 * Math.sin(v * Math.PI * 3);
        head.style.transform = `translate(${point.x}px, ${point.y}px) scale(${pulse})`;
      } catch (error) { /* 同上 */ }
    };
    route.removeAttribute('marker-end');
    if (mapCanvas) mapCanvas.classList.add('is-drawing');
    head.setAttribute('visibility', 'visible');
    touched.add(head);
    pulseMapMarkers();
    apply();
    run('route', [position], { value: 1 }, { duration: 1800, gap: 0, ease: 'inOutSine' }, apply, finishRoute);
  }

  /* ── 常驻微动：河水缓流 + 河谷画面的缓慢漂移与视差 ── */

  function artworkPosition() {
    if (!art) return;
    art.style.transform = `translate(${drift * 3.5}px, ${parallax + drift * 2}px) scale(1.035)`;
  }

  function syncAmbient() {
    if (blocked()) {
      cancel('ambient');
      if (art) art.style.removeProperty('transform');
      return;
    }
    const riverVisible = river && visible(river.closest('svg') || river);
    const artworkVisible = fine.matches && art && visible(art);
    const fords = all('.map-ford.is-current-ford');
    const mapVisible = riverVisible || (mapCanvas && visible(mapCanvas));
    if (!riverVisible && !artworkVisible && !mapVisible) {
      cancel('ambient');
      return;
    }
    if (actors.has('ambient')) return;
    const phase = { value: 0 };
    run('ambient', [phase], { value: 1 }, { duration: 8000, gap: 0, ease: 'linear', loop: true }, () => {
      if (river && visible(river.closest('svg') || river)) river.style.strokeDashoffset = String(-160 * phase.value);
      drift = Math.sin(phase.value * Math.PI * 2);
      if (fine.matches && art && visible(art)) artworkPosition();
      // The entrance owns the same transform until its one-shot pulse completes.
      if (!actors.has('map-fords') && mapCanvas && visible(mapCanvas)) {
        all('.map-ford.is-current-ford').forEach(ford => {
          touched.add(ford);
          ford.style.transform = `scale(${1 + 0.05 * drift})`;
        });
      }
    }, () => {
      if (river) river.style.removeProperty('stroke-dashoffset');
      if (art) art.style.removeProperty('transform');
      fords.forEach(clearNode);
      all('.map-ford').forEach(clearNode);
      drift = 0;
    });
  }

  /* ── 阅读进度：真实滚动位置，transform: scaleX ────── */

  function readingPosition() {
    const total = doc.documentElement.scrollHeight - win.innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, win.scrollY / total)) : 1;
  }

  function renderProgress(value) {
    if (!meter || !meter.firstElementChild) return;
    if (blocked()) meter.firstElementChild.style.removeProperty('transform');
    else meter.firstElementChild.style.transform = `scaleX(${value})`;
    meter.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  }

  function scrollScenes() {
    const targets = [...scenes.keys()];
    const band = Math.min(160, win.innerHeight * .2);
    if (band <= 0) return;
    for (const target of targets) {
      // Nested scene children keep their entrance transform; scroll owns only the outer container.
      if (targets.some(other => other !== target && other.contains(target))) continue;
      const box = target.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= win.innerHeight) {
        clearNode(target);
        touched.delete(target);
        continue;
      }
      const edge = box.top > win.innerHeight - band ? 1 - (win.innerHeight - box.top) / band
        : box.bottom < band ? -(1 - box.bottom / band) : 0;
      touched.add(target);
      target.style.opacity = String(1 - Math.abs(edge) * .35);
      target.style.transform = `translateY(${edge * 16}px)`;
    }
  }

  function onScroll() {
    if (blocked()) { renderProgress(readingPosition()); return; }
    if (scrollFrame) return;
    scrollFrame = win.requestAnimationFrame(() => {
      scrollFrame = 0;
      const next = readingPosition();
      renderProgress(next);
      if (!blocked()) {
        scrollScenes();
        if (fine.matches && art && visible(art)) {
          const rect = art.getBoundingClientRect();
          parallax = Math.min(6, Math.max(-6, (win.innerHeight / 2 - rect.top - rect.height / 2) * 0.018));
          artworkPosition();
        }
        syncAmbient();
      }
      if (pendingPlay && mapInViewport()) playRoute();
    });
  }

  /* 同一手势可能同时触发 chishui:chapter 与 chishui:map-before：
     合并到下一帧只开画一次，绝不在一次手势里重画两次 */
  function schedulePlay() {
    pendingPlay = true;
    if (routeFrame) return;
    routeFrame = win.requestAnimationFrame(() => {
      routeFrame = 0;
      if (pendingPlay && !blocked() && mapInViewport()) playRoute();
    });
  }

  /* ── 区块入场（离屏回收，逐区不同形） ───────────── */

  function addScene(rootSelector, childrenSelector, kind, options) {
    all(rootSelector).forEach((element) => {
      scenes.set(element, { nodes: all(childrenSelector, element), kind, options: options || {} });
    });
  }

  function leaveScene(target) {
    if (!scenes.has(target)) return;
    seen.delete(target);
    cancel(`scene-${[...scenes.keys()].indexOf(target)}`);
    const focus = $('.context .timeline-focus');
    if (focus && target.contains(focus)) cancel('timeline-focus');
    clearNode(target);
    touched.delete(target);
  }

  function playScene(target) {
    const scene = scenes.get(target);
    if (!scene || seen.has(target) || blocked()) return;
    seen.add(target);
    const index = [...scenes.keys()].indexOf(target);
    if (scene.kind === 'plate') {
      revealPlates(`scene-${index}`, all('figure', target).length ? all('figure', target) : [target]);
    } else if (scene.kind === 'fade') {
      enter(`scene-${index}`, scene.nodes, { distance: 0, duration: 320, gap: 40 });
    } else {
      enter(`scene-${index}`, scene.nodes, { duration: 440, gap: 55, distance: 14, ...scene.options });
    }
  }

  function emphasizeTimeline() {
    const focus = $('.context .timeline-focus');
    if (!focus || blocked()) return;
    touched.add(focus);
    const state = { value: 0 };
    const apply = () => { focus.style.transform = `translateX(${6 * (1 - state.value)}px)`; };
    apply();
    run('timeline-focus', [state], { value: 1 }, { duration: 480, ease: 'outCubic' }, apply, () => clearNode(focus));
  }

  function cancelOverview() {
    cancel('overview-routes');
    for (const stage of [1, 2, 3, 4]) cancel(`overview-badge-${stage}`);
  }

  function playOverview() {
    if (!overviewSVG || overviewPlayed || blocked() || !visible(overviewSVG)) return;
    const box = overviewSVG.getBoundingClientRect();
    if (Math.min(win.innerHeight, box.bottom) - Math.max(0, box.top) < box.height * .35) return;
    const paths = all('[data-static-route]', overviewSVG).sort((a, b) => Number(a.getAttribute('data-static-route')) - Number(b.getAttribute('data-static-route')));
    if (!paths.length) return;
    overviewPlayed = true;
    const reveals = [];
    const badges = [];
    const started = new Set();
    const cleanup = () => {
      reveals.forEach(reveal => reveal.finish());
      badges.forEach(badge => { if (badge) clearNode(badge); });
    };
    try {
      paths.forEach(path => {
        const reveal = createChapterRouteReveal(path);
        reveals.push(reveal);
        reveal.update(0);
        const badge = $(`[data-static-stage="${path.getAttribute('data-static-route')}"]`, overviewSVG);
        badges.push(badge);
        if (badge) { touched.add(badge); badge.style.opacity = '0'; }
      });
      const clock = { value: 0 };
      const duration = 620 + (paths.length - 1) * 460;
      const apply = () => {
        reveals.forEach((reveal, index) => {
          const progress = Math.min(1, Math.max(0, (clock.value * duration - index * 460) / 620));
          reveal.update(EASE.outCubic(progress));
          const badge = badges[index];
          if (progress < 1 || started.has(index) || !badge) return;
          started.add(index);
          const pop = { value: 0 };
          const draw = () => {
            badge.style.opacity = String(Math.min(1, pop.value));
            badge.style.transform = `scale(${0.45 + 0.55 * pop.value})`;
          };
          draw();
          run(`overview-badge-${index + 1}`, [pop], { value: 1 }, { duration: 420, ease: 'outBack' }, draw, () => clearNode(badge));
        });
      };
      run('overview-routes', [clock], { value: 1 }, { duration, ease: 'linear' }, apply, () => {
        reveals.forEach(reveal => reveal.finish());
        // Do not erase the final badge's still-running pop on normal completion.
        badges.forEach((badge, index) => { if (badge && !actors.has(`overview-badge-${index + 1}`)) clearNode(badge); });
      });
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  function bindOverviewFocus() {
    if (!overview) return;
    const items = all('.static-route-key li', overview);
    const badges = all('[data-static-stage]', overview);
    let pointer = null;
    let focus = null;
    const stageFor = node => node?.getAttribute('data-static-stage') || String(items.indexOf(node) + 1);
    const sync = () => {
      const active = focus || pointer;
      if (active) overview.setAttribute('data-focus-stage', stageFor(active));
      else overview.removeAttribute('data-focus-stage');
    };
    [...items, ...badges].forEach(node => {
      const original = node.getAttribute('tabindex');
      node.setAttribute('tabindex', '0');
      cleanups.push(() => {
        if (original === null) node.removeAttribute('tabindex');
        else node.setAttribute('tabindex', original);
      });
      listen(node, 'pointerenter', () => { pointer = node; sync(); });
      listen(node, 'pointerleave', () => { if (pointer === node) pointer = null; sync(); });
      listen(node, 'focusin', () => { focus = node; sync(); });
      listen(node, 'focusout', event => {
        if (node.contains(event.relatedTarget)) return;
        if (focus === node) focus = null;
        sync();
      });
    });
  }

  function playChapterMap(item, replay = false) {
    if (!item.path || blocked() || mode() !== 'full' || !visible(item.svg) || (item.played && !replay)) return;
    const box = item.svg.getBoundingClientRect();
    const shown = Math.min(win.innerHeight, box.bottom) - Math.max(0, box.top);
    if (!replay && shown < box.height * .35) return;
    cancel(item.key);
    item.played = true;
    const reveal = createChapterRouteReveal(item.path);
    const position = { value: 0 };
    reveal.update(0);
    run(item.key, [position], { value: 1 }, { duration: 1800, gap: 0, ease: 'inOutSine' },
      () => reveal.update(position.value), () => reveal.finish());
  }

  function observeScenes() {
    if (!observer) return;
    chapterMaps.forEach(item => observer.observe(item.svg));
    if (overviewSVG) observer.observe(overviewSVG);
    if (mapCanvas) observer.observe(mapCanvas);
    scenes.forEach((scene, element) => observer.observe(element));
    if (art) observer.observe(art);
  }

  /* ── 章节切换：DOM 先行，动效 300–500ms 跟上 ─────── */

  /* 四个 chapter-panel 常驻可见：以 data-current 标记当前章
     （红色只留当前章的渡次名；初始取 hash → 第一章） */
  function markCurrentPanel(preferred) {
    const panels = all('.chapter-panel');
    if (!panels.length) return;
    let panel = preferred && panels.includes(preferred) ? preferred : null;
    if (!panel && win.location && win.location.hash) {
      const byId = doc.getElementById(win.location.hash.slice(1));
      if (byId && panels.includes(byId)) panel = byId;
    }
    if (!panel) panel = panels[0];
    panels.forEach((element) => {
      if (element === panel) element.setAttribute('data-current', '');
      else element.removeAttribute('data-current');
    });
  }

  function pulseChapterFocus(key, panel) {
    if (!panel || blocked() || mode() !== 'full' || !fine.matches) return;
    const targets = [$('.chapter-date', panel), $('h3', panel), $('#route-direction'), $('#route-date')].filter(Boolean);
    if (!targets.length) return;
    targets.forEach((node) => touched.add(node));
    const vals = targets.map(() => ({ value: 0 }));
    const apply = () => vals.forEach(({ value }, i) => {
      const node = targets[i];
      node.style.opacity = String(0.35 + 0.65 * value);
      node.style.transform = `translateX(${(1 - value) * 10}px)`;
    });
    const done = () => targets.forEach(clearNode);
    apply();
    run(key, vals, { value: 1 }, { duration: 380, gap: 45, ease: 'outCubic' }, apply, done);
  }

  function chapterChanged(event) {
    const detail = (event && event.detail) || {};
    invalidateRoute();
    const number = String(detail.number || '');
    const panels = all('.chapter-panel');
    let panel = panels.find((element) => element.getAttribute('data-chapter') === number) || null;
    if (panel) markCurrentPanel(panel);
    else {
      markCurrentPanel();
      panel = $('[data-chapter][data-current]') || panels[0];
    }
    if (panel) {
      pulseChapterFocus(`chapter-${number || panel.getAttribute('data-chapter') || 'x'}`, panel);
    }
    if (detail.mapReady === false) return; // 地图几何未就绪：等 chishui:map-before 之后再画
    schedulePlay();
  }

  function mapBefore(event) {
    invalidateRoute();
    const reason = event && event.detail && event.detail.reason;
    if (reason === 'chapter') {
      // commit() 在事件后同步完成；下一帧几何已稳定，即可开画
      schedulePlay();
    }
  }

  /* ── 状态同步与开关 ─────────────────────────────── */

  function syncState() {
    if (!doc.body) return;
    writingMotion = true;
    doc.body.setAttribute('data-motion', mode() === 'off' ? 'off' : 'on');
    writingMotion = false;
    if (toggle) {
      const fixed = Boolean(reduced && reduced.matches);
      toggle.hidden = false;
      toggle.setAttribute('aria-pressed', String(paused || userOff));
      toggle.setAttribute('aria-disabled', String(fixed));
      toggle.textContent = fixed ? '系统已减少动态' : (paused || userOff) ? '恢复动画' : '暂停动画';
    }
    chapterMaps.forEach(item => { if (item.button) item.button.hidden = blocked() || mode() !== 'full'; });
    doc.dispatchEvent(new CustomEvent('chishui:motion'));
    if (blocked() || mode() === 'reduced') settle();
    else {
      renderProgress(readingPosition());
      syncAmbient();
      chapterMaps.forEach(item => playChapterMap(item));
    }
  }

  function settle() {
    seen.clear();
    cancelAll();
    all('.plate-sheet').forEach((sheet) => {
      const parent = sheet.parentElement;
      sheet.remove();
      if (parent) {
        parent.style.removeProperty('position');
        parent.style.removeProperty('overflow');
      }
    });
    if (art) art.style.removeProperty('transform');
    if (river) river.style.removeProperty('stroke-dashoffset');
    finishRoute(); // 恢复完整路线（含箭头与行军点状态）
    overview?.removeAttribute('data-focus-stage');
    // Keep the progress value for AT without retaining an inline animated state.
    meter?.firstElementChild?.style.removeProperty('transform');
  }

  function failStatic(error) {
    destroyed = true;
    settle();
    if (observer) observer.disconnect();
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
    if (toggle) toggle.hidden = true;
    if (replay) replay.hidden = true;
    if (meter) meter.hidden = true;
    if (doc.body) doc.body.setAttribute('data-motion', 'off');
    doc.dispatchEvent(new CustomEvent('chishui:motion'));
    if (win.console && win.console.error) {
      win.console.error('Editorial motion stopped; complete static reading retained.', error);
    }
  }

  const safe = (fn) => (...args) => {
    if (destroyed) return;
    try {
      fn(...args);
    } catch (error) {
      failStatic(error);
    }
  };

  /* ── 接线 ─────────────────────────────────────── */

  try {
    loadAnime().then((module) => { animeModule = module; });

    addScene('.context-intro', 'h2 > span, h2, .context-lead, .context-note', 'rise');
    addScene('.context .timeline', 'li', 'rise', { onComplete: emphasizeTimeline });
    addScene('.crossings > .section-heading, .crossings .section-heading', 'h2 > span, h2, p', 'rise', { distance: 12 });
    addScene('.crossings .chapter-nav', '[data-chapter-choice], .chapter-link', 'rise', { distance: 10 });
    addScene('.chapter-panel', '.chapter-date, h3, .situation > p', 'rise', { distance: 12 });
    addScene('.archives-grid', 'figure', 'plate');
    addScene('.continuation-plate', 'img', 'plate');
    addScene('.continuation-copy', 'h2 > span, h2, .statement, p, .quiet-link', 'rise', { distance: 18 });
    addScene('#continuation .after-route', 'h3, p', 'rise', { distance: 12 });
    addScene('#continuation .after-route ol', 'li', 'rise', { axis: 'x', distance: -16, gap: 140 });
    addScene('.era-strip', 'li', 'rise', { distance: 12 });
    addScene('.sources', '.disclosure > summary, .licence', 'fade');

    if (typeof win.IntersectionObserver === 'function') {
      observer = new win.IntersectionObserver(safe((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (target === mapCanvas) {
            if (!isIntersecting) invalidateRoute();
            syncAmbient();
            if (isIntersecting && pendingPlay && mapInViewport()) playRoute();
          } else if (target === art) {
            syncAmbient();
          } else if (target === overviewSVG) {
            if (isIntersecting) playOverview();
            else cancelOverview();
          } else if (target.matches('.chapter-map > svg')) {
            const item = chapterMaps.find(item => item.svg === target);
            if (isIntersecting) playChapterMap(item);
            else cancel(item.key);
          } else if (isIntersecting) {
            playScene(target);
          } else {
            leaveScene(target);
          }
        });
      }), { threshold: [0, 0.12, 0.36] });
    }

    bindOverviewFocus();

    chapterMaps.forEach(item => {
      if (!item.path || !observer) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'motion-control chapter-map-replay';
      button.textContent = '重播路线';
      button.setAttribute('aria-label', `重播第${item.figure.getAttribute('data-static-map')}渡路线`);
      item.figure.appendChild(button);
      item.button = button;
      cleanups.push(() => button.remove());
      listen(button, 'click', safe(() => playChapterMap(item, true)));
    });

    all('details[data-disclosure]').forEach((details, idx) => {
      listen(details, 'toggle', safe(() => {
        if (!details.open || blocked() || mode() !== 'full') return;
        const inner = $('.disclosure-inner', details);
        if (inner) enter(`disclosure-${idx}`, [inner], { duration: 300, gap: 0, distance: 8 });
      }));
    });

    once('chishui:map-before', safe(mapBefore));
    once('chishui:map-after', safe((event) => {
      const detail = (event && event.detail) || {};
      pendingPlay = false;
      if (detail.reason === 'all-routes' && detail.allRoutes) {
        playAllRoutes();
      } else {
        finishRoute();
      }
    }));
    once('chishui:chapter', safe(chapterChanged));
    once('chishui:layout', safe(() => {
      settle();
      if (!blocked()) {
        syncAmbient();
        onScroll();
      }
    }));

    if (toggle) {
      listen(toggle, 'click', safe(() => {
        if (reduced && reduced.matches) return;
        if (mode() === 'off') {
          paused = false;
          userOff = false;
        } else {
          paused = true;
        }
        syncState();
      }));
    }
    if (replay) {
      listen(replay, 'click', safe(() => {
        // Inline chapter events and this request coalesce into one route draw.
        schedulePlay();
      }));
    }

    const explorer = mapCanvas && mapCanvas.closest('details');
    if (explorer) listen(explorer, 'toggle', safe(() => {
      if (!explorer.open) invalidateRoute();
      syncAmbient();
      if (explorer.open && pendingPlay) schedulePlay();
    }));
    listen(win, 'scroll', safe(onScroll), { passive: true });
    listen(win, 'resize', safe(() => {
      invalidateRoute();
      onScroll();
    }));
    listen(doc, 'visibilitychange', safe(syncState));
    listen(fine, 'change', safe(() => { settle(); syncState(); }));
    listen(win, 'pagehide', safe(() => {
      departed = true;
      if (observer) observer.disconnect();
      syncState();
    }));
    listen(win, 'pageshow', safe(() => {
      departed = false;
      observeScenes();
      syncState();
    }));
    if (reduced && reduced.addEventListener) listen(reduced, 'change', safe(syncState));
    listen(forced, 'change', safe(syncState));

    /* 页面上的 body[data-motion] 开关（内联脚本或按钮直接改属性）同样生效 */
    if (win.MutationObserver && doc.body) {
      const watch = new win.MutationObserver(safe(() => {
        if (writingMotion || !doc.body) return;
        const off = doc.body.getAttribute('data-motion') === 'off';
        if (off !== userOff) {
          userOff = off;
          paused = false;
          syncState();
        }
      }));
      watch.observe(doc.body, { attributes: true, attributeFilter: ['data-motion'] });
      cleanups.push(() => watch.disconnect());
    }

    if (meter) {
      meter.hidden = false;
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
    }
    if (replay) replay.hidden = false;
    markCurrentPanel(); // 初始当前章（hash → 第一章），供渡次名红色收敛
    finishRoute(); // 内联脚本可能已先行初始化地图
    renderProgress(readingPosition());
    syncState();
    observeScenes();

    if (!blocked()) {
      // 开篇分层入场：徽标先落定，题词逐行升起，导语与配乐控制跟上，木刻画幅拉幕展开
      const emblem = $('.hero-emblem-backing');
      if (emblem && mode() === 'full') {
        touched.add(emblem);
        const eVal = { value: 0 };
        const applyEmblem = () => {
          emblem.style.opacity = String(Math.min(1, eVal.value * 1.2));
          emblem.style.transform = `scale(${0.82 + 0.18 * eVal.value})`;
        };
        applyEmblem();
        run('hero-emblem', [eVal], { value: 1 }, { duration: 520, gap: 0, ease: 'outBack' }, applyEmblem, () => clearNode(emblem));
      }
      {
        enter('hero-line', all('.opening h1 > span'), { duration: 560, gap: 95, distance: 26, ease: 'outExpo' });
        enter('hero-meta', all('.opening-meta'), { duration: 480, gap: 0, distance: 14 });
        enter('hero-lead', all('.opening-lead, .opening-actions, .opening-audio'), { duration: 500, gap: 80, distance: 14 });
      }
      revealPlates('hero-art', all('.hero-art, .hero-archive'));
      pendingPlay = true;
    }
  } catch (error) {
    failStatic(error);
  }

  return {
    pause() {
      paused = true;
      syncState();
    },
    resume() {
      paused = false;
      userOff = false;
      syncState();
      if (!blocked()) {
        syncAmbient();
        onScroll();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      settle();
      if (observer) observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
      cleanups.length = 0;
      scenes.forEach((scene) => scene.nodes.forEach(clearNode));
      if (toggle) toggle.hidden = true;
      if (replay) replay.hidden = true;
      if (meter) meter.hidden = true;
      all('.plate-sheet').forEach((sheet) => sheet.remove());
    },
    get mode() {
      return mode();
    }
  };
}

/* 页面自启动：本模块是唯一的 module script，加载即接管；
   在没有 DOM 的环境（测试、SSR）import 本模块不做任何事。 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const boot = () => {
    if (globalThis.ChishuiMotion && typeof globalThis.ChishuiMotion.pause === 'function') return;
    try {
      globalThis.ChishuiMotion = initEditorialMotion({});
      document.dispatchEvent(new CustomEvent('chishui:motion'));
    } catch (error) {
      if (window.console && window.console.error) {
        window.console.error('Editorial motion unavailable; static reading retained.', error);
      }
    }
  };
  const start = () => {
    loadAnime().then((module) => {
      animeModule = module;
      boot();
    }).catch(() => {
      boot();
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
