/* 编辑动效层（exhibition motion）——「有目的的动」。
   契约：export function initEditorialMotion({ root = document, reduced })
   返回 { pause(), resume(), destroy() }。
   - anime（public/vendor/anime-4.5.0.esm.min.js）只以动态 import + try/catch 载入；
     载入失败时由内置 rAF 引擎接管，任何行为都不缺位；本模块在没有 anime 时也可安全 import。
   - 只动画 transform / opacity；唯一例外是路线的 stroke-dashoffset 与河面虚线相位
     （纯绘制，不影响布局）。
   - prefers-reduced-motion: reduce → 只做 180ms 淡入；body[data-motion="off"] → 完全静态。
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
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
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

export function initEditorialMotion({ root = document, reduced = defaultReduced() } = {}) {
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || window;
  const $ = (selector, from = root) => from.querySelector(selector);
  const all = (selector, from = root) => [...from.querySelectorAll(selector)];

  /* ── 状态 ─────────────────────────────────────── */
  const actors = new Map();          // 每个动画一个属主，可整体取消
  const touched = new Set();         // 写过内联样式的节点，恢复时清空
  const scenes = new Map();          // 区块 → 待入场元素（一次触发）
  const seen = new Set();
  const cleanups = [];
  const handledEvents = new WeakSet();
  let userOff = doc.body && doc.body.getAttribute('data-motion') === 'off';
  let paused = false;
  let destroyed = false;
  let departed = false;
  let pendingPlay = true;            // 有新路线待画，进入视口即画
  let playScheduled = false;         // schedulePlay() 的 rAF 合并标志
  let routeFrame = 0;
  let scrollFrame = 0;
  let progressValue = 0;
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

  const mode = () => {
    if (destroyed || userOff || paused) return 'off';
    if (reduced && reduced.matches) return 'reduced';
    return 'full';
  };
  const blocked = () => mode() === 'off' || departed || (doc.hidden ?? false);
  const visible = (node) => {
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
    entry.actor.cancel();
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
        fn();
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
    const cross = current === 'reduced';
    const distance = cross ? 0 : (options.distance ?? 16);
    const duration = cross ? 180 : (options.duration ?? 440);
    const gap = cross ? 0 : (options.gap ?? 65);
    const values = list.map((node) => ({ node, value: 0 }));
    const apply = () => values.forEach(({ node, value }) => {
      node.style.opacity = String(value);
      if (distance) node.style.transform = `translateY(${(1 - value) * distance}px)`;
    });
    const done = () => list.forEach(clearNode);
    apply();
    run(key, values, { value: 1 }, { duration, gap, ease: options.ease || 'outCubic' }, apply, done);
  }

  /* 图版揭示：一张衬纸自下而上揭开（transform），原图轻微落定（transform + opacity）。
     不裁切、不滤镜；减弱动态时只做 180ms 淡入；JS 注入的衬纸用完即删。 */
  function revealPlates(key, figures) {
    const current = mode();
    if (current === 'off') return;
    const plates = figures.filter(Boolean).filter((figure) => figure.getBoundingClientRect().width > 0);
    if (!plates.length) return;
    if (current === 'reduced') {
      enter(key, plates.map((figure) => figure.querySelector('img') || figure), { distance: 0, duration: 180, gap: 0 });
      return;
    }
    const sheets = [];
    plates.forEach((figure) => {
      const img = figure.querySelector('img');
      const frame = img ? img.parentElement : null;
      if (!img || !frame) return;
      touched.add(img);
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
      entry.sheet.style.transform = `translateY(${-(value * 101)}%)`;
      entry.img.style.opacity = String(Math.min(1, value * 1.25));
      entry.img.style.transform = `scale(${1.025 - value * 0.025})`;
    });
    const done = () => sheets.forEach(({ sheet, frame, img }) => {
      sheet.remove();
      frame.style.removeProperty('position');
      frame.style.removeProperty('overflow');
      img.style.removeProperty('transform');
      img.style.removeProperty('opacity');
    });
    apply();
    run(key, values, { value: 1 }, { duration: 760, gap: 120, ease: 'outExpo' }, apply, done);
  }

  /* ── 路线：一笔画到渡口，箭头只在画完时出现 ─────── */

  function finishRoute() {
    if (!route) return;
    route.style.strokeDasharray = '';
    route.style.strokeDashoffset = '0';
    route.setAttribute('marker-end', 'url(#route-arrow)');
    if (head) {
      try {
        const point = route.getPointAtLength(route.getTotalLength());
        head.setAttribute('cx', String(point.x));
        head.setAttribute('cy', String(point.y));
      } catch (error) { /* 路径几何不可用时保持原位 */ }
      head.setAttribute('visibility', 'hidden');
    }
    if (mapCanvas) mapCanvas.classList.remove('is-drawing');
  }

  function invalidateRoute() {
    if (routeFrame) win.cancelAnimationFrame(routeFrame);
    routeFrame = 0;
    cancel('route');
    finishRoute();
  }

  function mapReady() {
    if (!mapCanvas || !route || !head) return false;
    const rect = mapCanvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function mapInViewport() {
    if (!mapCanvas) return false;
    const rect = mapCanvas.getBoundingClientRect();
    return rect.width > 0 && rect.top < win.innerHeight * 0.92 && rect.bottom > win.innerHeight * 0.08;
  }

  function bringMapIntoView() {
    if (!mapCanvas || mapInViewport()) return;
    const rect = mapCanvas.getBoundingClientRect();
    win.scrollBy({ top: rect.top - (win.innerHeight - rect.height) / 2, behavior: 'auto' });
  }

  function playRoute(manual = false) {
    if (!mapReady()) return;
    invalidateRoute();
    if (blocked()) return;
    if (manual) bringMapIntoView();
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
    const position = { value: 0 };
    const apply = () => {
      route.style.strokeDasharray = String(length);
      route.style.strokeDashoffset = String(length * (1 - position.value));
      try {
        const point = route.getPointAtLength(length * position.value);
        head.setAttribute('cx', String(point.x));
        head.setAttribute('cy', String(point.y));
      } catch (error) { /* 同上 */ }
    };
    route.removeAttribute('marker-end');
    if (mapCanvas) mapCanvas.classList.add('is-drawing');
    head.setAttribute('visibility', 'visible');
    apply();
    run('route', [position], { value: 1 }, { duration: 1800, gap: 0, ease: 'linear' }, apply, finishRoute);
  }

  /* ── 常驻微动：河水缓流 + 河谷画面的缓慢漂移与视差 ── */

  function artworkPosition() {
    if (!art) return;
    art.style.transform = `translate(${drift * 3}px, ${parallax + drift * 2}px) scale(1.035)`;
  }

  function syncAmbient() {
    if (blocked() || mode() !== 'full') {
      cancel('ambient');
      return;
    }
    if (actors.has('ambient')) return;
    if (!river && !art) return;
    const targets = river && visible(river.closest('svg') || river) ? [river] : [];
    if (!targets.length && !(art && visible(art))) {
      cancel('ambient');
      return;
    }
    const phase = { value: 0 };
    run('ambient', [phase], { value: 1 }, { duration: 12000, gap: 0, ease: 'linear', loop: true }, () => {
      if (river) river.style.strokeDashoffset = String(-80 * phase.value);
      drift = Math.sin(phase.value * Math.PI * 2);
      if (art && visible(art)) artworkPosition();
    }, () => {
      if (river) river.style.removeProperty('stroke-dashoffset');
      if (art) art.style.removeProperty('transform');
      drift = 0;
    });
  }

  /* ── 阅读进度：真实滚动位置，transform: scaleX ────── */

  function readingPosition() {
    const total = doc.documentElement.scrollHeight - win.innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, win.scrollY / total)) : 1;
  }

  function renderProgress(value) {
    progressValue = value;
    if (!meter || !meter.firstElementChild) return;
    meter.firstElementChild.style.transform = `scaleX(${value})`;
    meter.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  }

  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = win.requestAnimationFrame(() => {
      scrollFrame = 0;
      const next = readingPosition();
      if (blocked() || mode() === 'reduced') {
        renderProgress(next);
      } else {
        const from = { value: progressValue };
        run('progress', [from], { value: next }, { duration: 160, gap: 0, ease: 'outQuad' },
          () => renderProgress(from.value), () => renderProgress(readingPosition()));
        if (art && visible(art)) {
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
    if (playScheduled) return;
    playScheduled = true;
    win.requestAnimationFrame(() => {
      playScheduled = false;
      if (pendingPlay && !blocked() && mapInViewport()) playRoute();
    });
  }

  /* ── 区块入场（一次触发，逐区不同形） ───────────── */

  function addScene(rootSelector, childrenSelector, kind, options) {
    all(rootSelector).forEach((element) => {
      scenes.set(element, { nodes: all(childrenSelector, element), kind, options: options || {} });
    });
  }

  function playScene(target) {
    const scene = scenes.get(target);
    if (!scene || seen.has(target)) return;
    seen.add(target);
    const index = [...scenes.keys()].indexOf(target);
    if (scene.kind === 'plate') {
      revealPlates(`scene-${index}`, all('figure', target).length ? all('figure', target) : [target]);
    } else if (scene.kind === 'fade') {
      enter(`scene-${index}`, scene.nodes, { distance: 0, duration: 320, gap: 40 });
    } else {
      enter(`scene-${index}`, scene.nodes, { duration: 480, gap: 70, distance: scene.options.distance ?? 14 });
    }
  }

  function observeScenes() {
    if (!observer) return;
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

  function chapterChanged(event) {
    const detail = (event && event.detail) || {};
    invalidateRoute();
    // 常驻可见的四章里，只让 detail.number 指定的当前章入场
    const number = String(detail.number || '');
    const panels = all('.chapter-panel');
    let panel = panels.find((element) => element.getAttribute('data-chapter') === number) || null;
    if (panel) markCurrentPanel(panel);
    else {
      markCurrentPanel();
      panel = $('[data-chapter][data-current]') || panels[0];
    }
    if (panel) {
      const heading = $('h3', panel);
      enter(`chapter-${number || panel.getAttribute('data-chapter') || 'x'}`,
        [$('.chapter-date', panel), ...(heading ? lineNodes(heading) : []), ...all('.situation p, .situation h4', panel).slice(0, 6)],
        { duration: 420, gap: 45, distance: 10 });
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
    doc.dispatchEvent(new CustomEvent('chishui:motion'));
    if (blocked()) settle();
    else {
      renderProgress(readingPosition());
      syncAmbient();
    }
  }

  function settle() {
    cancelAll();
    if (art) art.style.removeProperty('transform');
    if (river) river.style.removeProperty('stroke-dashoffset');
    finishRoute(); // 恢复完整路线（含箭头与行军点状态）
    renderProgress(readingPosition());
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

    addScene('.context', '.context-intro h2 > span, .context-intro h2, .context-lead, .context-note, .timeline li', 'rise');
    addScene('.crossings > .section-heading, .crossings .section-heading', 'h2 > span, h2, p', 'rise', { distance: 12 });
    addScene('.crossings .chapter-nav', '[data-chapter-choice], .chapter-link', 'rise', { distance: 10 });
    addScene('.archives-grid', 'figure', 'plate');
    addScene('.continuation-plate', 'img', 'plate');
    addScene('.continuation-copy', 'h2 > span, h2, .statement, p, .quiet-link', 'rise', { distance: 18 });
    addScene('.after-route', 'h3, li, p', 'rise', { distance: 12 });
    addScene('.era-strip', 'li', 'rise', { distance: 12 });
    addScene('.sources', '.disclosure > summary, .licence', 'fade');
    addScene('.footer', '.footer-name', 'rise', { distance: 24 });

    if (typeof win.IntersectionObserver === 'function') {
      observer = new win.IntersectionObserver(safe((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          if (target === mapCanvas) {
            syncAmbient();
            if (pendingPlay && mapInViewport()) playRoute();
          } else if (target === art) {
            syncAmbient();
          } else {
            playScene(target);
          }
        });
      }), { threshold: [0, 0.15] });
    }

    once('chishui:map-before', safe(mapBefore));
    once('chishui:map-after', safe(() => {
      // 视图切换只收束，不重放
      pendingPlay = false;
      finishRoute();
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
        bringMapIntoView();
        // 内联脚本随后重发 chishui:chapter；schedulePlay 把两路触发合并为一次开画
        schedulePlay();
      }));
    }

    listen(win, 'scroll', safe(onScroll), { passive: true });
    listen(win, 'resize', safe(() => {
      invalidateRoute();
      onScroll();
    }));
    listen(doc, 'visibilitychange', safe(syncState));
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
      // 开篇分层入场：画面先亮，题词逐行升起，导语与行动跟上——总时长 ≤ 1.2s
      enter('hero-line', all('.opening h1 > span'), { duration: 520, gap: 90, distance: 26 });
      enter('hero-meta', all('.opening-meta'), { duration: 460, gap: 0, distance: 14 });
      enter('hero-lead', all('.opening-lead, .opening-actions, .scroll-hint'), { duration: 460, gap: 80, distance: 14 });
      enter('hero-art', all('.hero-art, .hero-archive'), { duration: 620, gap: 120, distance: 0 });
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
  const start = () => {
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
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
