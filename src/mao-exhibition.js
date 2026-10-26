const captions = {
  judge: '一渡西行，二渡东返',
  divert: '三渡再西，四渡再东',
  initiative: '四渡东返，随后南下',
};

/** Independent enhancement: static copy and SVG routes never depend on this module. */
export function initMaoExhibition({ root = document } = {}) {
  const doc = root.ownerDocument || root;
  const win = doc.defaultView;
  if (!win || !root.querySelector('.mao-exhibition')) return { destroy() {} };
  const abort = new win.AbortController();
  const { signal } = abort;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const covers = new Set();
  const observers = [];
  const map = root.querySelector('[data-command-map]');
  const caption = root.querySelector('[data-strategy-caption]');
  const links = [...root.querySelectorAll('[data-strategy-choice]')];
  let destroyed = false;
  const motion = () => doc.body?.dataset.motion === 'off' ? 'off' : reduced.matches ? 'reduced' : 'full';
  function animate(target, frames, options = {}) {
    if (destroyed || motion() === 'off' || typeof target.animate !== 'function') return;
    const animation = target.animate(frames, {
      duration: motion() === 'reduced' ? 150 : 650,
      easing: 'cubic-bezier(.22,.75,.25,1)',
      ...options,
    });
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function settle() {
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const cover of covers) cover.remove();
    covers.clear();
  }
  function revealWoodcut(target) {
    const img = target.querySelector('img');
    if (!img || destroyed || motion() === 'off') return;
    if (!img.complete) {
      img.addEventListener('load', () => {
        const box = target.getBoundingClientRect();
        if (box.bottom > 0 && box.top < win.innerHeight) revealWoodcut(target);
      }, { once: true, signal });
      return;
    }
    if (!img.naturalWidth) return;
    if (motion() === 'reduced') {
      animate(img, [{ opacity: .7 }, { opacity: 1 }]);
      return;
    }
    const cover = doc.createElement('span');
    cover.className = 'woodcut-reveal-cover';
    cover.setAttribute('aria-hidden', 'true');
    target.append(cover);
    covers.add(cover);
    const animation = animate(cover, [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 850 });
    const remove = () => { cover.remove(); covers.delete(cover); };
    if (animation) animation.finished.then(remove, remove);
    else remove();
  }
  function select(key) {
    if (!captions[key] || !map) return;
    map.dataset.strategy = key;
    if (caption) caption.textContent = captions[key];
    links.forEach(link => {
      if (link.dataset.strategyChoice === key) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
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
        // Tablet columns share a reading row; retain the reader's manual choice there.
        if (current.length === 1) select(current[0].dataset.strategyScene);
      }, { rootMargin: `-${readingLine}px 0px -${Math.max(0, win.innerHeight - readingLine - 1)}px 0px`, threshold: 0 });
      scenes.forEach(node => strategyObserver.observe(node));
    };
    observeStrategy();
    win.addEventListener('resize', observeStrategy, { signal });
    observers.push({ disconnect: () => strategyObserver?.disconnect() });

    const entranceObserver = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        entranceObserver.unobserve(target);
        if (motion() === 'off') continue;
        if (target.matches('[data-woodcut-reveal]')) {
          revealWoodcut(target);
        } else if (target.matches('.command-theme')) {
          target.querySelectorAll('[data-theme-line]').forEach((line, index) => animate(line,
            motion() === 'reduced' ? [{ opacity: .7 }, { opacity: 1 }] : [{ opacity: .25, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { delay: motion() === 'reduced' ? 0 : index * 170 }));
          const art = target.querySelector('[data-theme-art]');
          if (art) animate(art, motion() === 'reduced' ? [{ opacity: .7 }, { opacity: 1 }] : [{ opacity: .4, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }]);
        } else {
          animate(target, motion() === 'reduced' ? [{ opacity: .7 }, { opacity: 1 }] : [{ opacity: .55, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }]);
        }
      }
    }, { threshold: .12 });
    root.querySelectorAll('[data-woodcut-reveal], .mountain-verse, .command-theme').forEach(node => entranceObserver.observe(node));
    observers.push(entranceObserver);
  }
  doc.addEventListener('chishui:motion', settle, { signal });
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) settle(); }, { signal });
  reduced.addEventListener('change', settle, { signal });
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
