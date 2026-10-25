// One owner for explicit page navigation; reading-line selection stays separate.
export function getChapterScrollTop(element, win) {
  const height = win.visualViewport?.height || win.innerHeight || 0;
  const gap = Math.min(24, Math.max(0, 0.45 * height - 16));
  const doc = win.document;
  const maximum = Math.max(0, Math.max(doc.documentElement.scrollHeight || 0, doc.body?.scrollHeight || 0) - height);
  return Math.min(maximum, Math.max(0, element.getBoundingClientRect().top + (win.scrollY || 0) - gap));
}

export function createPageScroll({
  win = globalThis.window,
  loadLenis = () => import('../public/vendor/lenis-1.3.27.esm.js'),
} = {}) {
  const doc = win.document;
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanups = [];
  let destroyed = false, departed = false, pending = null;
  let lenis = null, modulePromise = null, loading = false, failed = false, epoch = 0;
  const motionAllowed = () => !destroyed && !departed && !doc.hidden && !reduced.matches && doc.body?.dataset.motion !== 'off';
  const eligible = () => motionAllowed() && fine.matches;
  let wasAllowed = motionAllowed(), wasEligible = eligible();

  function listen(node, type, fn, options) {
    node.addEventListener(type, fn, options);
    cleanups.push(() => node.removeEventListener(type, fn, options));
  }
  function finish(navigation, result) {
    if (pending !== navigation) return;
    pending = null;
    if (navigation.frame) win.cancelAnimationFrame(navigation.frame);
    if (navigation.timer) win.clearTimeout(navigation.timer);
    if (result === 'complete') navigation.onComplete?.();
    else navigation.onCancel?.();
  }
  function stopEngine() {
    if (!lenis) return;
    try { lenis.stop(); lenis.start(); } catch { /* destroy/fallback still owns release */ }
  }
  function cancel() {
    if (!pending) return;
    const navigation = pending;
    // Stop the browser's current smooth scroll at its current position.
    stopEngine();
    try { win.scrollTo({ top: win.scrollY || 0, left: win.scrollX || 0, behavior: 'instant' }); } catch { /* still release */ }
    finish(navigation, 'cancel');
  }
  function removeLenis() {
    const instance = lenis;
    lenis = null;
    try { instance?.destroy(); } catch { /* native scrolling remains available */ }
  }
  function sync() {
    if (destroyed) return;
    const allowed = motionAllowed(), canEnhance = eligible();
    if ((wasAllowed && !allowed) || (wasEligible && !canEnhance)) cancel();
    wasAllowed = allowed; wasEligible = canEnhance;
    if (!canEnhance) {
      epoch++; loading = false; removeLenis(); return;
    }
    if (lenis || loading || failed) return;
    const ticket = ++epoch;
    loading = true;
    try { modulePromise ||= Promise.resolve(loadLenis()); }
    catch { failed = true; loading = false; return; }
    modulePromise.then(module => {
      if (destroyed || ticket !== epoch || !eligible()) return;
      loading = false;
      try {
        lenis = new module.default({
          autoRaf: true, smoothWheel: true, lerp: 0.12,
          syncTouch: false, anchors: false, respectReducedMotion: true,
        });
      } catch { failed = true; removeLenis(); }
    }).catch(() => {
      if (ticket !== epoch || destroyed) return;
      loading = false; failed = true; removeLenis();
    });
  }
  function scrollTo(element, { immediate = false, onComplete, onCancel } = {}) {
    if (destroyed) return;
    cancel();
    sync();
    if (typeof element?.getBoundingClientRect !== 'function') { onCancel?.(); return; }
    const top = getChapterScrollTop(element, win);
    const navigation = { top, onComplete, onCancel, frame: 0, timer: 0, arrived: 0 };
    pending = navigation; // Callbacks may complete synchronously.
    navigation.timer = win.setTimeout(() => {
      if (pending !== navigation) return;
      if (Math.abs((win.scrollY || 0) - top) <= 1) finish(navigation, 'complete');
      else cancel();
    }, 1500);
    const jump = immediate || !motionAllowed();
    if (lenis) {
      try {
        lenis.scrollTo(top, { immediate: jump, onComplete: () => finish(navigation, 'complete') });
        return;
      } catch { failed = true; removeLenis(); }
    }
    try { win.scrollTo({ top, behavior: jump ? 'instant' : 'smooth' }); }
    catch { finish(navigation, 'cancel'); return; }
    if (jump) { finish(navigation, 'complete'); return; }
    function check() {
      if (pending !== navigation) return;
      navigation.frame = 0;
      navigation.arrived = Math.abs((win.scrollY || 0) - top) <= 1 ? navigation.arrived + 1 : 0;
      if (navigation.arrived >= 2) finish(navigation, 'complete');
      else navigation.frame = win.requestAnimationFrame(check);
    }
    if (win.requestAnimationFrame) navigation.frame = win.requestAnimationFrame(check);
  }
  const activity = event => { if (!event.defaultPrevented) cancel(); };
  for (const type of ['wheel', 'touchstart', 'touchmove', 'pointerdown']) listen(win, type, activity, { passive: true });
  listen(win, 'keydown', event => {
    if (!event.defaultPrevented && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'].includes(event.key)) cancel();
  });
  listen(win, 'scrollend', () => {
    if (pending && Math.abs((win.scrollY || 0) - pending.top) <= 1) finish(pending, 'complete');
  });
  listen(fine, 'change', sync); listen(reduced, 'change', sync);
  listen(doc, 'visibilitychange', sync);
  listen(win, 'pagehide', () => { departed = true; sync(); });
  listen(win, 'pageshow', () => { departed = false; sync(); });
  const observer = typeof win.MutationObserver === 'function' ? new win.MutationObserver(sync) : null;
  if (doc.body) observer?.observe(doc.body, { attributes: true, attributeFilter: ['data-motion'] });
  sync();
  return { scrollTo, cancel, destroy() {
    if (destroyed) return;
    destroyed = true; epoch++; loading = false;
    cancel(); removeLenis(); observer?.disconnect();
    cleanups.splice(0).forEach(remove => remove());
  } };
}
