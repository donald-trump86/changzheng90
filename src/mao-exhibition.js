const captions = {
  judge: '一渡西行，二渡东返',
  divert: '三渡再西，四渡再东',
  initiative: '四渡东返，随后南下',
};
const strategyRoutes = { judge: ['1', '2'], divert: ['3', '4'], initiative: ['4'] };

/** Independent enhancement: static copy and SVG routes never depend on this module. */
export function initMaoExhibition({ root = document } = {}) {
  const doc = root.ownerDocument || root;
  const win = doc.defaultView;
  if (!win || !root.querySelector('.mao-exhibition')) return { destroy() {} };
  const abort = new win.AbortController();
  const { signal } = abort;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = win.matchMedia('(max-width: 900px), (pointer: coarse)');
  const forcedColors = win.matchMedia('(forced-colors: active)');
  const animations = new Map();
  const emphasis = new Set();
  const covers = new Set();
  const observers = [];
  const map = root.querySelector('[data-command-map]');
  const caption = root.querySelector('[data-strategy-caption]');
  const links = [...root.querySelectorAll('[data-strategy-choice]')];
  let destroyed = false;
  let revealGeneration = 0;
  const canAnimate = () => !destroyed && !doc.hidden && !reduced.matches && !forcedColors.matches
    && !['off', 'reduced'].includes(doc.body?.dataset.motion);
  function cancel(animation) {
    const cleanup = animations.get(animation);
    animations.delete(animation);
    emphasis.delete(animation);
    animation.cancel();
    cleanup?.();
  }
  function animate(target, frames, options = {}, cleanup) {
    if (!canAnimate() || typeof target.animate !== 'function') { cleanup?.(); return; }
    let animation;
    try {
      animation = target.animate(frames, {
        duration: 650,
        easing: 'cubic-bezier(.22,.75,.25,1)',
        fill: 'backwards',
        ...options,
      });
    } catch {
      cleanup?.();
      return;
    }
    animations.set(animation, cleanup);
    const complete = () => {
      if (!animations.has(animation)) return;
      animations.delete(animation);
      emphasis.delete(animation);
      cleanup?.();
    };
    animation.finished.then(complete, complete);
    return animation;
  }
  function settle() {
    revealGeneration++;
    for (const animation of animations.keys()) cancel(animation);
    for (const cover of covers) cover.remove();
    covers.clear();
  }
  function revealWoodcut(target) {
    const img = target.querySelector('img');
    if (!img || !canAnimate()) return;
    if (!img.complete) {
      const generation = revealGeneration;
      img.addEventListener('load', () => {
        if (generation !== revealGeneration || !canAnimate()) return;
        const box = target.getBoundingClientRect();
        if (box.bottom > 0 && box.top < win.innerHeight) revealWoodcut(target);
      }, { once: true, signal });
      return;
    }
    if (!img.naturalWidth) return;
    const cover = doc.createElement('span');
    cover.className = 'woodcut-reveal-cover';
    cover.setAttribute('aria-hidden', 'true');
    target.append(cover);
    covers.add(cover);
    animate(cover, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }],
      { duration: compact.matches ? 700 : 850 }, () => { cover.remove(); covers.delete(cover); });
  }
  function enter(target, delay = 0, duration = 480) {
    animate(target, [{ opacity: 0, transform: `translateY(${compact.matches ? 6 : 10}px)` },
      { opacity: 1, transform: 'translateY(0)' }], { delay, duration });
  }
  function drawThread(path) {
    if (!canAnimate() || typeof path.getTotalLength !== 'function') return;
    let length;
    try { length = path.getTotalLength(); } catch { return; }
    if (!Number.isFinite(length) || length <= 0) return;
    // Dash spacing is static; only the offset changes during the draw.
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    animate(path, [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
      { duration: 1100, delay: 220, easing: 'cubic-bezier(.37,0,.63,1)' }, () => {
        path.style.removeProperty('stroke-dasharray');
        path.style.removeProperty('stroke-dashoffset');
      });
  }
  function select(key) {
    if (!captions[key] || !map) return;
    const changed = map.dataset.strategy !== key;
    map.dataset.strategy = key;
    if (caption) caption.textContent = captions[key];
    links.forEach(link => {
      if (link.dataset.strategyChoice === key) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (!changed) return;
    for (const animation of emphasis) cancel(animation);
    for (const route of map.querySelectorAll?.('[data-command-route]') || []) {
      if (!strategyRoutes[key].includes(route.dataset.commandRoute)) continue;
      const animation = animate(route, [{ opacity: .45 }, { opacity: 1 }], { duration: 480 });
      if (animation) emphasis.add(animation);
    }
  }
  links.forEach(link => link.addEventListener('click', event => {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) select(link.dataset.strategyChoice);
  }, { signal }));

  if (typeof win.IntersectionObserver === 'function') {
    const scenes = [...root.querySelectorAll('[data-strategy-scene]')];
    let strategyObserver;
    const observeStrategy = () => {
      strategyObserver?.disconnect();
      const readingLine = Math.round(win.innerHeight * .3);
      strategyObserver = new win.IntersectionObserver(() => {
        const current = scenes.filter(node => {
          const box = node.getBoundingClientRect();
          return box.top <= readingLine && box.bottom > readingLine;
        });
        // Retain the reader's manual choice when articles share a reading row.
        if (current.length === 1) select(current[0].dataset.strategyScene);
      }, { rootMargin: `-${readingLine}px 0px -${Math.max(0, win.innerHeight - readingLine - 1)}px 0px`, threshold: 0 });
      scenes.forEach(node => strategyObserver.observe(node));
    };
    observeStrategy();
    win.addEventListener('resize', observeStrategy, { signal });
    observers.push({ disconnect: () => strategyObserver?.disconnect() });

    const sequences = {
      '.zunyi-questions': 'li',
      '.zunyi-departure ol': ':scope > li',
      '.command-timeline': ':scope > div',
      '.command-decisions': ':scope > article',
      '.command-last-words': ':scope > p',
    };
    const entranceObserver = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        entranceObserver.unobserve(target);
        if (!canAnimate()) continue;
        if (target.matches('[data-woodcut-reveal]')) {
          revealWoodcut(target);
        } else if (target.matches('.woodcut-incision')) {
          animate(target, [{ transform: 'scaleX(0)', opacity: .4 }, { transform: 'scaleX(1)', opacity: 1 }],
            { duration: 580, easing: 'cubic-bezier(.16,1,.3,1)' });
        } else if (target.matches('.mountain-verse')) {
          const heading = target.querySelector('h3');
          if (heading) enter(heading);
          target.querySelectorAll('blockquote p > span').forEach((line, index) => {
            if (index === 0) animate(line, [{ transform: 'scale(1.18)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1 }], { duration: 360 });
            else enter(line, 140 + (index - 1) * 120);
          });
        } else if (target.matches('.command-theme')) {
          target.querySelectorAll('[data-theme-line]').forEach((line, index) => enter(line, index * 170));
          const art = target.querySelector('[data-theme-art]');
          if (art) animate(art, [{ opacity: .4, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }]);
          target.querySelectorAll('.command-red-thread path').forEach(drawThread);
        } else {
          const selector = Object.keys(sequences).find(selector => target.matches(selector));
          if (selector) target.querySelectorAll(sequences[selector]).forEach((line, index) => enter(line, index * 90));
        }
      }
    }, { threshold: .12 });
    const targets = ['[data-woodcut-reveal]', '.woodcut-incision', '.mountain-verse', '.command-theme', ...Object.keys(sequences)];
    root.querySelectorAll(targets.join(', ')).forEach(node => entranceObserver.observe(node));
    observers.push(entranceObserver);
  }
  doc.addEventListener('chishui:motion', settle, { signal });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) settle(); }, { signal });
  reduced.addEventListener('change', settle, { signal });
  compact.addEventListener('change', settle, { signal });
  forcedColors.addEventListener('change', settle, { signal });
  const watch = new win.MutationObserver(settle);
  watch.observe(doc.body, { attributes: true, attributeFilter: ['data-motion'] });
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      settle();
      abort.abort();
      watch.disconnect();
      observers.forEach(observer => observer.disconnect());
    },
  };
}

if (typeof document !== 'undefined') {
  let controller;
  const mount = () => { controller?.destroy(); controller = initMaoExhibition(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  window.addEventListener('pagehide', () => controller?.destroy());
  window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
}
