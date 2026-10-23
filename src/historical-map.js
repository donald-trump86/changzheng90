/* Stable SVG renderer; Anime actors belong exclusively to editorial-motion.js. */
(() => {
  'use strict';
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
    const previousRoutes = [...svg.querySelectorAll('[data-previous-route]')];
    const names = ['一渡', '二渡', '三渡', '四渡'];
    let chapter = 1;
    let view = 'overview';
    let fitting = false;
    let geometry = data.geometry(chapter, view);
    const dispatch = (name, reason) => document.dispatchEvent(new CustomEvent(name, { detail: { reason, chapter, view } }));
    const pointFor = (id) => id === 'river' ? [490, 310] : id.startsWith('ford:') ? data.fords[id.slice(5)].xy : data.node(id);
    const overlaps = (a, b, gap = 0) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

    function fit() {
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
        const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 0;
        if (!scale) return;
        const font = 14.5 / scale;
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
        svg.dataset.visibleLabels = String(labels.filter((label) => label.style.display !== 'none').length);
      } finally { fitting = false; }
    }
    function commit() {
      const stage = data.stages[chapter - 1];
      geometry = data.geometry(chapter, view);
      svg.setAttribute('viewBox', geometry.viewBox.join(' '));
      svg.dataset.chapter = String(chapter);
      svg.dataset.view = view;
      route.setAttribute('d', geometry.path);
      route.style.strokeDasharray = '';
      route.style.strokeDashoffset = '0';
      route.setAttribute('marker-end', 'url(#route-arrow)');
      start.setAttribute('cx', String(geometry.start[0]));
      start.setAttribute('cy', String(geometry.start[1]));
      head.setAttribute('visibility', 'hidden');
      previousRoutes.forEach((path, index) => {
        path.style.display = view === 'overview' && index < chapter - 1 ? '' : 'none';
        path.setAttribute('d', data.geometry(index + 1, 'overview').path);
      });
      $('map-maneuver-area').style.display = view === 'overview' && chapter >= 3 ? '' : 'none';
      $('map-title').textContent = `${names[chapter - 1]}赤水 · ${view === 'overview' ? '区域总览' : '渡河细看'}`;
      $('map-description').textContent = stage.summary + geometry.notice + '现代镇县点仅供方位参照，渡口区域和河道经原创概化。';
      $('map-stage-note').textContent = stage.chronology;
      $('map-view-note').textContent = geometry.notice;
      $('map-stage-summary').textContent = stage.summary;
      $('map-relation').hidden = ![2, 4].includes(chapter);
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapView === view)));
      fit();
    }
    function setChapter(number) {
      data.geometry(number, view); // Validate before mutation.
      dispatch('chishui:map-before', 'chapter');
      chapter = number;
      commit();
    }
    function setView(mode) {
      data.geometry(chapter, mode);
      if (mode === view) return;
      dispatch('chishui:map-before', 'view'); // Old actor/token dies before any new geometry.
      view = mode;
      commit();
      dispatch('chishui:map-after', 'view'); // Settle only: never replay or start a scroll scene.
    }
    commit();
    document.querySelector('.map-view-controls').hidden = false;
    document.querySelector('.map-details').open = false;
    document.querySelector('.map-caption').textContent = '现代地点作方位参照；渡口区域、河道与行军连线经概化，不表示1935年精确测绘。';
    return { setChapter, setView, fit };
  }
  globalThis.ChishuiHistoricalMap = { create };
})();
