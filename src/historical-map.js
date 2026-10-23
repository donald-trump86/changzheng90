/* Stable SVG renderer; Anime actors belong exclusively to editorial-motion.js.
   The camera glide below is a plain rAF tween: eased, cancellable, and never
   an Anime actor. */
(() => {
  'use strict';
  const LABEL_PX = 14.5;
  const TWEEN_MS = 520;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const raf = (fn) => requestAnimationFrame(fn);
  const caf = (id) => cancelAnimationFrame(id);
  const defer = (fn) => (typeof queueMicrotask === 'function' ? queueMicrotask(fn) : setTimeout(fn, 0));
  const motionOff = () => Boolean(document.body?.dataset?.motion === 'off'
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  function create() {
    const data = globalThis.ChishuiMapData;
    const svg = document.getElementById('route-map');
    if (!data || !svg) throw new Error('Historical map data or static SVG unavailable');
    const $ = (id) => document.getElementById(id);
    const route = $('current-route');
    const head = $('march-head');
    const start = $('march-start');
    const canvas = svg.closest('.map-canvas');
    const riverLabel = $('map-river-label');
    riverLabel.dataset.mapLabel = 'river';
    const labels = [...svg.querySelectorAll('[data-map-label]')];
    const marks = [...svg.querySelectorAll('[data-map-point]')];
    const areas = [...svg.querySelectorAll('[data-ford]')];
    const buttons = [...document.querySelectorAll('[data-map-view]')];
    const allButtons = [...document.querySelectorAll('[data-map-all]')];
    // Four route paths total: #current-route plus faded slots. Top up if markup is thinner.
    let fadedRoutes = [...svg.querySelectorAll('[data-previous-route]')];
    while (fadedRoutes.length < 3) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.classList.add('map-previous-route');
      path.setAttribute('data-previous-route', String(fadedRoutes.length + 1));
      route.parentNode.insertBefore(path, route);
      fadedRoutes.push(path);
    }
    const crossingDots = [];
    const names = ['一渡', '二渡', '三渡', '四渡'];
    let chapter = 1;
    let view = 'overview';
    let allRoutes = false;
    let allView = null; // View to restore when the all-routes reading mode ends.
    let allRoutesBlock = null;
    let fitting = false;
    let geometry = data.geometry(chapter, view);
    let camera = null;
    let cameraToken = 0;
    const dispatch = (name, reason) => document.dispatchEvent(new CustomEvent(name, { detail: { reason, chapter, view, allRoutes } }));
    const pointFor = (id) => id === 'river' ? [490, 310] : id.startsWith('ford:') ? data.fords[id.slice(5)].xy : data.node(id);
    const overlaps = (a, b, gap = 0) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
    const readViewBox = () => (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    const sameBox = (a, b) => a.length === 4 && b.length === 4 && a.every((value, i) => Math.abs(value - b[i]) < 0.01);
    const scaleFor = (box) => {
      const rect = svg.getBoundingClientRect();
      return Math.min(rect.width / box[2], rect.height / box[3]);
    };

    function fit(overrideScale) {
      if (fitting) return;
      fitting = true;
      try {
        // Toolbar height is measured after wrapping. The canvas, not its notes,
        // is bounded so native replay can bring every moving point into view.
        const toolbar = document.querySelector('.study-toolbar');
        const available = Math.max(1, innerHeight - (toolbar?.getBoundingClientRect().height || 0) - 16);
        canvas.style.setProperty('--map-max-width', `${available * 1.22}px`);
        canvas.style.maxHeight = `${available}px`;
        const matrix = svg.getScreenCTM();
        const scale = overrideScale || (matrix ? Math.hypot(matrix.a, matrix.b) : 0);
        if (!scale) return;
        const font = LABEL_PX / scale;
        const [vx, vy, vw, vh] = geometry.viewBox;
        const padding = 9 / scale;
        const frame = { x: vx + padding, y: vy + padding, width: vw - padding * 2, height: vh - padding * 2 };
        const occupied = [{ x: vx + vw - font * 2, y: vy, width: font * 2, height: font * 3.4 }];
        const narrow = svg.getBoundingClientRect().width < 430 || available < 350;
        const stage = data.stages[chapter - 1];
        const essential = view === 'detail'
          ? stage.fords.map((id) => `ford:${id}`)
          : [stage.nodes[0], `ford:${stage.focus}`, stage.nodes.at(-1), 'river', ...(chapter === 2 ? ['tongzi'] : [])];
        const optional = view === 'overview'
          ? ['zaxi', 'zunyi', 'tongzi', 'maotai', 'yuanhou', 'tucheng', 'gulin', 'xishui', 'taiping', 'erlang', 'loushan'] : [];
        const wanted = [...new Set([...essential, ...optional])];
        const labelLimit = narrow ? (available < 350 ? 5 : 6) : Infinity;
        let placedCount = 0;
        labels.forEach((label) => { label.style.display = 'none'; });
        marks.forEach((mark) => {
          mark.setAttribute('r', String(2.7 / scale));
          const [x, y] = pointFor(mark.dataset.mapPoint);
          mark.style.display = x > vx && x < vx + vw && y > vy && y < vy + vh ? '' : 'none';
        });
        areas.forEach((area) => {
          area.classList.toggle('is-current-ford', stage.fords.includes(area.dataset.ford));
          // Broad ford area symbols remain geographic, their size is not a GPS error radius.
          area.style.display = view === 'detail' && !stage.fords.includes(area.dataset.ford) ? 'none' : '';
        });
        const routeSegments = geometry.points.slice(1).map((to, i) => [geometry.points[i], to]);
        function hitsRoute(box) {
          return routeSegments.some(([a, b]) => {
            const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (font / 3)));
            for (let n = 0; n <= steps; n++) {
              const x = a[0] + (b[0] - a[0]) * n / steps;
              const y = a[1] + (b[1] - a[1]) * n / steps;
              if (x > box.x - padding / 2 && x < box.x + box.width + padding / 2 && y > box.y - padding / 2 && y < box.y + box.height + padding / 2) return true;
            }
            return false;
          });
        }
        for (const id of wanted) {
          if (placedCount >= labelLimit) break;
          const label = labels.find((item) => item.dataset.mapLabel === id);
          if (!label) continue;
          const [x, y] = pointFor(id);
          if (x <= vx || x >= vx + vw || y <= vy || y >= vy + vh) continue;
          label.style.display = 'block';
          label.style.fontSize = `${font}px`;
          // Measure actual fallback/display glyphs, then choose a free rectangle.
          label.setAttribute('x', '0'); label.setAttribute('y', '0');
          const measured = label.getBBox();
          const w = measured.width;
          const h = measured.height;
          const offsets = [[font*.6, -font*.7], [-w-font*.6, -font*.7], [font*.6, font*1.6], [-w-font*.6, font*1.6],
            [-w/2, -font*1.5], [-w/2, font*2.4], [font*.8, -font*2.2], [-w-font*.8, -font*2.2]];
          let placed = false;
          for (const [dx, dy] of offsets) {
            const tx = Math.min(frame.x + frame.width - w, Math.max(frame.x, x + dx));
            const ty = Math.min(frame.y + frame.height - h - measured.y, Math.max(frame.y - measured.y, y + dy));
            const box = { x: tx, y: ty + measured.y, width: w, height: h };
            const hitsPoint = marks.some((mark) => {
              if (mark.style.display === 'none') return false;
              const [px, py] = pointFor(mark.dataset.mapPoint);
              return px > box.x - padding/3 && px < box.x + w + padding/3 && py > box.y - padding/3 && py < box.y + h + padding/3;
            });
            if (occupied.some((other) => overlaps(box, other, font*.25)) || hitsRoute(box) || hitsPoint) continue;
            label.setAttribute('x', String(tx)); label.setAttribute('y', String(ty));
            occupied.push(box); placed = true; placedCount++; break;
          }
          if (!placed) label.style.display = 'none'; // Full identity is always available in HTML details.
        }
        const north = $('map-north');
        north.setAttribute('transform', `translate(${vx + vw - font * 1.1} ${vy + font * 1.3})`);
        north.querySelector('text').style.fontSize = `${font}px`;
        north.querySelector('path').setAttribute('d', `M0 ${font*.5}v${font*1.2}m${-font*.25} ${-font*.9} ${font*.25} ${-font*.3} ${font*.25} ${font*.3}`);
        const arrowSize = 11 / scale;
        $('route-arrow').setAttribute('markerWidth', String(arrowSize));
        $('route-arrow').setAttribute('markerHeight', String(arrowSize));
        start.setAttribute('r', String(4 / scale));
        head.setAttribute('r', String(4 / scale));
        crossingDots.forEach((dot) => dot.setAttribute('r', String(3.4 / scale)));
        svg.dataset.visibleLabels = String(labels.filter((label) => label.style.display !== 'none').length);
      } finally { fitting = false; }
    }
    // Hold every fitted element at its settled screen size while the camera glides,
    // so labels stay readable for the whole transition.
    function pinScale(scale) {
      if (!scale) return;
      const font = LABEL_PX / scale;
      labels.forEach((label) => {
        if (label.style.display !== 'none') label.style.fontSize = `${font}px`;
      });
      marks.forEach((mark) => mark.setAttribute('r', String(2.7 / scale)));
      start.setAttribute('r', String(4 / scale));
      head.setAttribute('r', String(4 / scale));
      crossingDots.forEach((dot) => dot.setAttribute('r', String(3.4 / scale)));
      const arrowSize = 11 / scale;
      $('route-arrow').setAttribute('markerWidth', String(arrowSize));
      $('route-arrow').setAttribute('markerHeight', String(arrowSize));
    }
    function commit() {
      const stage = data.stages[chapter - 1];
      geometry = data.geometry(chapter, view);
      svg.setAttribute('viewBox', geometry.viewBox.join(' '));
      svg.dataset.chapter = String(chapter);
      svg.dataset.view = view;
      svg.dataset.allRoutes = String(allRoutes);
      route.setAttribute('d', geometry.path);
      route.style.strokeDasharray = '';
      route.style.strokeDashoffset = '0';
      route.setAttribute('marker-end', 'url(#route-arrow)');
      start.setAttribute('cx', String(geometry.start[0]));
      start.setAttribute('cy', String(geometry.start[1]));
      head.setAttribute('visibility', 'hidden');
      fadedRoutes.forEach((path, index) => {
        if (allRoutes) {
          const leg = [1, 2, 3, 4].filter((number) => number !== chapter)[index];
          path.style.display = leg ? '' : 'none';
          path.classList.toggle('is-all-route', Boolean(leg));
          if (leg) path.setAttribute('d', data.geometry(leg, 'overview').path);
        } else {
          path.style.display = view === 'overview' && index < chapter - 1 ? '' : 'none';
          path.classList.remove('is-all-route');
          path.setAttribute('d', data.geometry(index + 1, 'overview').path);
        }
      });
      crossingDots.forEach((dot) => dot.remove());
      crossingDots.length = 0;
      if (allRoutes) {
        [1, 2, 3, 4].filter((number) => number !== chapter).forEach((number) => {
          const [cx, cy] = data.geometry(number, 'overview').start;
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.classList.add('map-crossing-dot');
          dot.setAttribute('cx', String(cx));
          dot.setAttribute('cy', String(cy));
          svg.appendChild(dot);
          crossingDots.push(dot);
        });
      }
      $('map-maneuver-area').style.display = view === 'overview' && chapter >= 3 ? '' : 'none';
      $('map-title').textContent = `${names[chapter - 1]}赤水 · ${view === 'overview' ? '区域总览' : '渡河细看'}`;
      $('map-description').textContent = stage.summary + geometry.notice + '现代镇县点仅供方位参照，渡口区域和河道经原创概化。';
      $('map-stage-note').textContent = stage.chronology;
      $('map-view-note').textContent = geometry.notice;
      $('map-stage-summary').textContent = stage.summary;
      $('map-relation').hidden = ![2, 4].includes(chapter);
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapView === view)));
      allButtons.forEach((button) => button.setAttribute('aria-pressed', String(allRoutes)));
      if (allRoutesBlock) allRoutesBlock.open = allRoutes;
      fit();
    }
    /* ---- camera: eased viewBox glide, instantly cancellable ---- */
    function cancelCamera() {
      const interrupted = Boolean(camera);
      cameraToken++; // The old actor/token dies before any new geometry commits.
      if (camera) {
        caf(camera.raf);
        camera = null;
      }
      return interrupted;
    }
    function settleCamera(from, interrupted, after) {
      const to = geometry.viewBox;
      // An interruption settles straight to the latest state; so do motion-off,
      // unmapped canvases, and no-op transitions.
      const glide = !interrupted && !motionOff() && !sameBox(from, to) && scaleFor(to) > 0;
      if (!glide) {
        svg.setAttribute('viewBox', to.join(' '));
        fit();
        if (after) after();
        return;
      }
      const toScale = scaleFor(to);
      fit(toScale); // Target labels settle at their final screen size first.
      svg.setAttribute('viewBox', from.join(' ')); // commit() wrote the target; the camera departs from where we were.
      const token = cameraToken;
      const started = now();
      camera = { from, started, after, raf: 0 };
      const step = () => {
        if (token !== cameraToken || !camera) return;
        const t = Math.min(1, (now() - camera.started) / TWEEN_MS);
        const e = easeInOutCubic(t);
        const box = from.map((value, i) => value + (to[i] - value) * e);
        svg.setAttribute('viewBox', box.join(' '));
        pinScale(scaleFor(box));
        if (t >= 1) {
          const done = camera.after;
          camera = null;
          svg.setAttribute('viewBox', to.join(' '));
          fit();
          if (done) done();
          return;
        }
        camera.raf = raf(step);
      };
      camera.raf = raf(step);
    }
    function apply(reason, mutate, withAfter) {
      const from = camera ? camera.from : readViewBox();
      dispatch('chishui:map-before', reason); // Before any mutation, as always.
      const interrupted = cancelCamera();
      mutate();
      commit();
      settleCamera(from, interrupted, withAfter ? () => dispatch('chishui:map-after', reason) : null);
    }
    function setChapter(number) {
      const nextView = allRoutes && allView ? allView : view;
      data.geometry(number, nextView); // Validate before mutation, against the effective post-exit view.
      apply('chapter', () => {
        chapter = number;
        if (allRoutes) { // Chapter selection exits the all-routes reading mode.
          allRoutes = false;
          if (allView) view = allView;
          allView = null;
        }
      }, false); // No map-after: the chapter scene owns the route replay.
    }
    function setView(mode) {
      data.geometry(chapter, mode);
      // Asymmetry by design: re-selecting 'overview' keeps the all-routes reading
      // mode (it already shows the region window); 'detail' ends it explicitly.
      if (mode === view) return;
      apply('view', () => {
        view = mode;
        allRoutes = false;
        allView = null;
      }, true);
    }
    function setAllRoutes(enabled) {
      const next = Boolean(enabled);
      if (next === allRoutes) return;
      data.geometry(chapter, 'overview');
      apply('all-routes', () => {
        if (next) {
          allView = view;
          allRoutes = true;
          view = 'overview'; // The four overview legs need the region window.
        } else {
          allRoutes = false;
          if (allView) view = allView;
          allView = null;
        }
      }, true);
    }
    /* Accessible reading of the four-leg sequence, text sourced from stage data. */
    function mountOverviewDescription() {
      const block = document.createElement('details');
      block.className = 'map-all-routes';
      const sequence = data.stages.map((stage, index) => {
        const direction = (stage.chronology.match(/西渡|东渡/) || [''])[0];
        return `${names[index]}${direction}`;
      }).join('、');
      block.innerHTML = `<summary>四渡路线序列：${sequence}</summary>`
        + '<p>以下按阶段列出路线时序，方向用语取自各阶段史料摘要，不补充地图之外的地理细节。</p><ol>'
        + data.stages.map((stage, index) => `<li><strong>${names[index]}</strong>（${stage.chronology}）：${stage.summary}</li>`).join('')
        + '</ol>';
      const notes = document.querySelector('.map-notes') || canvas.parentElement;
      const host = notes || svg.parentElement;
      const existing = document.querySelector('.map-all-routes');
      if (existing) existing.remove(); // Re-entrant: a second create() replaces, never stacks.
      host.appendChild(block);
      allRoutesBlock = block;
    }
    // Fallback toggle for [data-map-all]: if the page wires its own handler that
    // runs first and flips the state, this deferred one stands down.
    allButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const before = allRoutes;
        defer(() => { if (allRoutes === before) setAllRoutes(!before); });
      });
    });
    mountOverviewDescription();
    commit();
    document.querySelector('.map-view-controls').hidden = false;
    document.querySelector('.map-details').open = false;
    document.querySelector('.map-caption').textContent = '现代地点作方位参照；渡口区域、河道与行军连线经概化，不表示1935年精确测绘。';
    return { setChapter, setView, setAllRoutes, fit };
  }
  globalThis.ChishuiHistoricalMap = { create };
})();
