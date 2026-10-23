// src/history-scroll.js
// Position-based reading-line chapter selection for the continuous narrative.
//
// The controller answers one question: "which chapter crosses the reading
// line?" — a horizontal line at `offset` × viewport height. Everything is
// computed from current positions at evaluation time, so reverse scrolling and
// scrollbar drags across many chapters behave identically to slow scrolling:
// the latest position wins and intermediate numbers are never replayed.
//
// Selection logic is plain arithmetic over {number, top, bottom} spans and runs
// in Node without a browser: steps may be DOM elements (measured with
// getBoundingClientRect) or a `positions` provider may be injected directly.
// The optional `win` injection point carries event targets and observer
// constructors so tests can verify listener/observer cleanup exactly.

// Strict: select() accepts real numbers only ('2', 1.5, NaN are invalid input).
function strictNumber(value) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

// Permissive on type, strict on shape: dataset/position metadata may arrive as
// numeric strings, but Number(null)/Number('')/Number([]) all collapse to 0 and
// must not steal step numbering — anything that is not a number or a non-empty
// numeric string falls through to the next candidate instead.
function indexFrom(value) {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  }
  return null;
}

function normalizeSteps(steps, hasPositions) {
  const entries = [];
  const seen = new Set();
  (Array.isArray(steps) ? steps : []).forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const wrapped = 'element' in entry;
    const element = wrapped ? entry.element : entry;
    if (!element || typeof element !== 'object') return;
    if (!hasPositions && typeof element.getBoundingClientRect !== 'function') return;
    const number = (wrapped ? indexFrom(entry.number) : null)
      ?? indexFrom(element.dataset?.chapter)
      ?? index + 1;
    if (seen.has(number)) return;
    seen.add(number);
    entries.push({ number, element });
  });
  return entries;
}

// Order-independent: a chapter "crosses" the line when the line falls inside
// its span; otherwise the most recently passed chapter (largest top ≤ line)
// wins, and before every chapter the topmost one does.
function selectAtLine(spans, line) {
  let crossing = null;
  let passed = null;
  let topmost = null;
  for (const span of spans) {
    if (span.top <= line && line < span.bottom
      && (!crossing || span.top > crossing.top)) crossing = span;
    if (span.top <= line && (!passed || span.top > passed.top)) passed = span;
    if (!topmost || span.top < topmost.top) topmost = span;
  }
  return (crossing ?? passed ?? topmost)?.number ?? null;
}

export function createHistoryScroll({
  steps,
  onChapter,
  offset = 0.45,
  positions,
  getViewportHeight,
  win,
  observe = true,
  holdMs = 700,
} = {}) {
  const entries = normalizeSteps(steps, typeof positions === 'function');
  const byNumber = new Map(entries.map((entry) => [entry.number, entry]));
  const windowRef = win ?? (typeof globalThis !== 'undefined' ? globalThis.window : undefined);
  const viewportHeight = () => {
    if (typeof getViewportHeight === 'function') return Number(getViewportHeight()) || 0;
    const raw = windowRef?.innerHeight ?? (typeof globalThis !== 'undefined' ? globalThis.innerHeight : 0);
    return Number(raw) || 0;
  };

  let current = null;
  let destroyed = false;
  let frame = 0;
  let hold = null; // { number, deadline } while a programmatic scroll is in flight
  const cleanups = [];

  function measure() {
    if (typeof positions === 'function') {
      return (positions() || []).map((span) => ({
        number: indexFrom(span?.number),
        top: Number(span?.top),
        bottom: Number(span?.bottom),
      })).filter((span) => span.number !== null && span.top <= span.bottom);
    }
    return entries.map((entry) => {
      const rect = entry.element.getBoundingClientRect();
      return { number: entry.number, top: Number(rect.top), bottom: Number(rect.bottom) };
    }).filter((span) => span.top <= span.bottom);
  }

  function emit(number) {
    if (number === null || number === current) return current;
    current = number;
    if (typeof onChapter === 'function') onChapter(number);
    return current;
  }

  function refresh() {
    if (destroyed) return current;
    const computed = selectAtLine(measure(), offset * viewportHeight());
    if (hold) {
      if (computed === hold.number) {
        hold = null; // the programmatic scroll arrived; position truth resumes
        return emit(computed);
      }
      if (Date.now() < hold.deadline) return current; // smooth scroll in flight
      hold = null;
    }
    return emit(computed);
  }

  function schedule() {
    if (destroyed || frame) return;
    const raf = windowRef?.requestAnimationFrame;
    if (typeof raf !== 'function') {
      refresh();
      return;
    }
    frame = raf.call(windowRef, () => {
      frame = 0;
      refresh();
    });
  }

  function select(number, { scroll = false } = {}) {
    if (destroyed) return current;
    const target = strictNumber(number);
    if (target === null || !byNumber.has(target)) return current; // invalid numbers ignored
    const entry = byNumber.get(target);
    if (scroll) {
      const reduce = Boolean(windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      if (typeof entry.element.scrollIntoView === 'function') {
        entry.element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
      hold = { number: target, deadline: Date.now() + Math.max(0, holdMs) };
    } else {
      hold = null;
    }
    return emit(target);
  }

  if (observe && windowRef && typeof windowRef.addEventListener === 'function') {
    const onActivity = () => schedule();
    windowRef.addEventListener('scroll', onActivity, { passive: true });
    windowRef.addEventListener('resize', onActivity);
    cleanups.push(() => windowRef.removeEventListener('scroll', onActivity, { passive: true }));
    cleanups.push(() => windowRef.removeEventListener('resize', onActivity));
    // Collapse the observer root to the reading line, so entry changes fire
    // exactly when a chapter crosses it; positions still decide the winner.
    const top = (offset * 100).toFixed(3);
    const bottom = ((1 - offset) * 100).toFixed(3);
    const IntersectionObserverRef = windowRef.IntersectionObserver;
    if (typeof IntersectionObserverRef === 'function') {
      for (const entry of entries) {
        const observer = new IntersectionObserverRef(onActivity, {
          rootMargin: `-${top}% 0px -${bottom}% 0px`,
        });
        observer.observe(entry.element);
        cleanups.push(() => observer.disconnect());
      }
    }
    const ResizeObserverRef = windowRef.ResizeObserver;
    if (typeof ResizeObserverRef === 'function') {
      for (const entry of entries) {
        const observer = new ResizeObserverRef(onActivity);
        observer.observe(entry.element);
        cleanups.push(() => observer.disconnect());
      }
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (frame && typeof windowRef?.cancelAnimationFrame === 'function') windowRef.cancelAnimationFrame(frame);
    frame = 0;
    hold = null;
    cleanups.splice(0).forEach((cleanup) => cleanup());
  }

  return { select, refresh, destroy };
}
