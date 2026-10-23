import { animate, stagger } from '../public/vendor/anime-4.5.0.esm.min.js';

// Every Anime instance has one owner and a guarded callback. HTML is complete
// before this module loads; failure to import the library leaves it untouched.
function initMotion() {
  const $ = (selector) => document.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const route = $('#current-route');
  const head = $('#march-head');
  const map = $('.map-canvas');
  const toggle = $('#motion-toggle');
  const replay = $('#replay-route');
  const meter = $('#reading-progress');
  if (!route || !head || !map || !toggle || !replay || !meter || typeof IntersectionObserver !== 'function') return;

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const actors = new Map();
  const touched = new Set();
  const seen = new Set();
  const scenes = new Map();
  const cleanups = [];
  const river = $('.river-flow');
  const art = $('.hero-art img');
  let paused = false;
  let departed = false;
  let firstRoute = false;
  let routeFrame = 0;
  let scrollFrame = 0;
  let routeVersion = 0;
  let progress = 0;
  let drift = 0;
  let parallax = 0;
  let observer;
  const blocked = () => paused || departed || preference.matches || document.hidden;
  const visible = (node) => {
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0;
  };
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  }
  function cancel(key) {
    const entry = actors.get(key);
    if (!entry) return;
    actors.delete(key); // Invalidate callbacks before cancellation or final styles.
    entry.actor?.cancel();
    entry.finish();
  }
  function run(key, targets, options, update, finish) {
    cancel(key);
    if (blocked()) { finish(); return; }
    const entry = { actor: null, finish };
    actors.set(key, entry);
    const current = () => actors.get(key) === entry && !blocked();
    try {
      entry.actor = animate(targets, {
        ...options,
        onUpdate: safe(() => { if (current()) update(); }),
        onComplete: safe(() => {
          if (!current()) return;
          actors.delete(key);
          finish();
        })
      });
    } catch (error) {
      actors.delete(key);
      finish();
      throw error;
    }
  }
  function clearNode(node) {
    node.style.removeProperty('opacity');
    node.style.removeProperty('transform');
  }
  function enter(key, nodes, duration = 440, distance = 14, gap = 65) {
    nodes = nodes.filter((node) => node && node.getBoundingClientRect().width > 0);
    if (!nodes.length) return;
    nodes.forEach((node) => touched.add(node));
    const values = nodes.map((node) => ({ node, value: 0 }));
    const finish = () => nodes.forEach(clearNode);
    const update = () => values.forEach(({ node, value }) => {
      node.style.opacity = String(.45 + .55 * value);
      // Historical originals only fade; they keep their full frame and ratio.
      const photograph = node.matches('img, .image-link') || node.classList.contains('hero-archive');
      if (!photograph) node.style.transform = `translateY(${distance * (1 - value)}px)`;
    });
    run(key, values, { value: 1, duration, delay: stagger(gap), ease: 'outCubic' }, update, finish);
    if (!blocked()) update();
  }
  function finishRoute() {
    route.style.strokeDasharray = '';
    route.style.strokeDashoffset = '0';
    route.setAttribute('marker-end', 'url(#route-arrow)');
    const point = route.getPointAtLength(route.getTotalLength());
    head.setAttribute('cx', String(point.x));
    head.setAttribute('cy', String(point.y));
    head.setAttribute('visibility', 'hidden');
    map.classList.remove('is-drawing');
  }
  function invalidateRoute() {
    routeVersion++;
    cancelAnimationFrame(routeFrame);
    routeFrame = 0;
    cancel('route');
    finishRoute();
  }
  function fullMapVisible() {
    const rect = map.getBoundingClientRect();
    const ceiling = $('.study-toolbar').getBoundingClientRect().bottom + 8;
    return rect.width > 0 && rect.top >= Math.max(8, ceiling) && rect.bottom <= innerHeight - 8;
  }
  function bringMapIntoView() {
    if (fullMapVisible()) return;
    const rect = map.getBoundingClientRect();
    const toolbar = $('.study-toolbar').getBoundingClientRect().height + 8;
    const space = innerHeight - toolbar - 16;
    window.scrollBy({ top: rect.top - toolbar - Math.max(0, (space - rect.height) / 2), behavior: 'instant' });
  }
  function playRoute(manual = false) {
    invalidateRoute();
    if (blocked()) return;
    if (manual) bringMapIntoView();
    const version = routeVersion;
    routeFrame = requestAnimationFrame(() => {
      routeFrame = 0;
      if (version !== routeVersion || blocked() || !fullMapVisible()) return;
      firstRoute = true;
      const length = route.getTotalLength();
      const position = { value: 0 };
      const update = () => {
        route.style.strokeDashoffset = String(length * (1 - position.value));
        const point = route.getPointAtLength(length * position.value);
        head.setAttribute('cx', String(point.x));
        head.setAttribute('cy', String(point.y));
      };
      route.style.strokeDasharray = String(length);
      route.removeAttribute('marker-end');
      map.classList.add('is-drawing');
      head.setAttribute('visibility', 'visible');
      update();
      run('route', position, { value: 1, duration: 1800, ease: 'linear' }, update, finishRoute);
    });
  }
  function artworkPosition() {
    art.style.transform = `translate(${drift * 3}px, ${parallax + drift * 2}px) scale(1.035)`;
  }
  function syncAmbient() {
    if (blocked() || (!visible(map) && !visible(art))) {
      cancel('ambient');
      return;
    }
    if (actors.has('ambient')) return;
    const phase = { value: 0 };
    run('ambient', phase, { value: 1, duration: 12000, loop: true, ease: 'linear' }, () => {
      river.style.strokeDashoffset = String(-80 * phase.value);
      drift = Math.sin(phase.value * Math.PI * 2);
      if (visible(art)) artworkPosition();
    }, () => {
      river.style.removeProperty('stroke-dashoffset');
      art.style.removeProperty('transform');
      drift = 0;
    });
  }
  function readingPosition() {
    const total = document.documentElement.scrollHeight - innerHeight;
    return total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 1;
  }
  function renderProgress(value) {
    progress = value;
    meter.firstElementChild.style.transform = `scaleX(${value})`;
    meter.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  }
  function onScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const next = readingPosition();
      if (blocked()) renderProgress(next);
      else {
        const from = { value: progress };
        run('progress', from, { value: next, duration: 160, ease: 'outQuad' },
          () => renderProgress(from.value), () => renderProgress(readingPosition()));
        const rect = art.getBoundingClientRect();
        parallax = Math.min(6, Math.max(-6, (innerHeight / 2 - rect.top - rect.height / 2) * .018));
        if (visible(art)) artworkPosition();
        syncAmbient();
        if (!firstRoute && !routeFrame && fullMapVisible()) playRoute();
      }
    });
  }
  function settle() {
    invalidateRoute();
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    [...actors.keys()].forEach(cancel);
    touched.forEach(clearNode);
    art.style.removeProperty('transform');
    river.style.removeProperty('stroke-dashoffset');
    scenes.forEach((nodes, root) => { seen.add(root); nodes.forEach(clearNode); });
    firstRoute = true; // Resuming never replays an interrupted automatic sequence.
    renderProgress(readingPosition());
  }
  function syncState() {
    const off = blocked();
    document.body.dataset.motion = off ? 'off' : 'on';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = preference.matches ? '系统已减少动态' : paused ? '恢复动画' : '暂停动画';
    toggle.setAttribute('aria-disabled', String(preference.matches));
    document.dispatchEvent(new CustomEvent('chishui:motion'));
    if (off) settle();
    else { renderProgress(readingPosition()); syncAmbient(); }
  }
  function chapterChanged() {
    invalidateRoute();
    cancel('chapter');
    const panel = $('[data-chapter]:not([hidden])');
    if (panel) enter('chapter', all('.chapter-date, h3, .situation', panel), 340, 10, 45);
    playRoute(true);
  }
  function observeScenes() {
    observer.observe(map);
    scenes.forEach((nodes, root) => observer.observe(root));
  }
  function addScene(selector, children) {
    all(selector).forEach((root) => scenes.set(root, all(children, root)));
  }
  function failStatic(error) {
    head.setAttribute('visibility', 'hidden');
    departed = true;
    settle();
    observer?.disconnect();
    cleanups.forEach((cleanup) => cleanup());
    toggle.hidden = replay.hidden = meter.hidden = true;
    document.body.dataset.motion = 'off';
    document.dispatchEvent(new CustomEvent('chishui:motion'));
    console.error('Editorial motion stopped; complete static reading retained.', error);
  }
  // Guard event/observer failures too, so a partial enhancement cannot hide content.
  const safe = (fn) => (...args) => { try { return fn(...args); } catch (error) { failStatic(error); } };
  try {
    addScene('.context', '.context-intro h2, .context-intro p, .timeline li');
    addScene('.continuation', '.continuation-copy h2, .continuation-copy p, .quiet-link, .after-route h3, .after-route li, .after-route p');
    addScene('.archives-heading', 'h2, p');
    addScene('.archives-grid figure, .archive-art-secondary', '.image-link, img:not(.image-link img), figcaption');
    observer = new IntersectionObserver(safe((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting || blocked()) return;
        if (target === map) {
          syncAmbient();
          if (!firstRoute && !routeFrame && fullMapVisible()) playRoute();
        } else if (!seen.has(target) && visible(target)) {
          seen.add(target);
          const key = `scene-${[...scenes.keys()].indexOf(target)}`;
          enter(key, scenes.get(target), 480, target.matches('.continuation') ? 20 : 14, 70);
        }
      });
    }), { threshold: [0, .15, 1] });
    listen(document, 'chishui:chapter', safe(chapterChanged));
    listen(document, 'chishui:layout', safe(() => {
      settle();
      if (!blocked()) { syncAmbient(); onScroll(); }
    }));
    listen(toggle, 'click', safe(() => {
      if (preference.matches) return;
      paused = !paused;
      syncState();
    }));
    listen(replay, 'click', safe(() => playRoute(true)));
    listen(document, 'click', safe((event) => {
      const summary = event.target.closest('.story-disclosure > summary');
      if (summary && summary.getAttribute('aria-expanded') === 'true') playRoute(true);
    }));
    listen(window, 'scroll', safe(onScroll), { passive: true });
    listen(window, 'resize', safe(() => { invalidateRoute(); onScroll(); }));
    listen(document, 'visibilitychange', safe(syncState));
    listen(window, 'pagehide', safe(() => {
      departed = true;
      observer.disconnect();
      syncState();
    }));
    listen(window, 'pageshow', safe(() => {
      departed = false;
      observeScenes();
      syncState();
    }));
    if (preference.addEventListener) listen(preference, 'change', safe(syncState));
    else {
      const changed = safe(syncState);
      preference.addListener(changed);
      cleanups.push(() => preference.removeListener(changed));
    }
    finishRoute(); // Inline chapter initialization may already have fired.
    toggle.hidden = replay.hidden = meter.hidden = false;
    renderProgress(readingPosition());
    syncState();
    if (!blocked()) {
      enter('hero', all('.opening h1 span, .opening-meta, .opening-lead, .opening-actions, .hero-art, .hero-archive'), 620, 20, 75);
    }
    observeScenes();
  } catch (error) { failStatic(error); }
}

initMotion();
