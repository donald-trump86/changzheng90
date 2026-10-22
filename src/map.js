import { chapters } from './story.js';

// Schematic relationships, not surveyed coordinates or reconstructed march tracks.
const routes = [
  { path: 'M480 176C425 155 365 155 320 177S217 210 187 260S130 338 104 385', label: [180, 143] },
  { path: 'M104 385C150 350 193 306 253 276S338 269 381 277S495 312 560 345', label: [458, 250] },
  { path: 'M572 464C512 480 454 474 403 449S310 420 275 377S224 285 207 235', label: [206, 479] },
  { path: 'M207 235C244 235 285 273 321 315S391 340 445 355S526 454 542 548', label: [466, 397] },
];

export function createMap(container) {
  container.innerHTML = `<svg viewBox="0 0 720 580" role="img" aria-labelledby="river-title river-summary" xmlns="http://www.w3.org/2000/svg">
    <title id="river-title">四渡赤水概略路线图</title><desc id="river-summary"></desc>
    <defs><marker id="march-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
    <g class="mountains" aria-hidden="true">
      <path class="ridge-far" d="M0 139 57 66 99 95 152 19 207 91 251 53 322 136 380 83 454 104 499 31 557 88 617 48 720 148V580H0Z"/>
      <path class="ridge-mid" d="M0 283 74 187 126 229 190 125 251 224 303 179 378 267 453 165 503 222 560 135 631 231 675 192 720 265V580H0Z"/>
      <path class="ridge-near" d="M0 449 67 348 135 386 197 286 276 416 349 338 409 427 481 314 560 399 620 283 720 415V580H0Z"/>
      <g class="ridge-folds"><path d="m57 66 17 87-32 69m110-203 18 89-34 80m363-157-13 86 28 58m103-127-12 103 33 81M190 125l-8 95 30 69m348-154-15 108 29 55M197 286l-13 90 32 74m404-167-17 115 33 65"/></g>
    </g>
    <g class="map-clouds" aria-hidden="true"><path d="M20 105q85-30 170 0t170 0"/><path d="M410 180q80-30 160 0t160 0"/></g>
    <path class="river-bank" d="M432-20C480 66 360 69 329 149S418 224 384 281 337 341 377 401 420 442 430 502 393 559 413 610"/>
    <path class="river" d="M432-20C480 66 360 69 329 149S418 224 384 281 337 341 377 401 420 442 430 502 393 559 413 610"/>
    <g class="land-labels"><text x="42" y="52">西岸 · 川南方向</text><text x="475" y="52">东岸 · 黔北方向</text><text class="river-name" x="440" y="127" transform="rotate(-24 440 127)">赤水河</text></g>
    <g class="places">
      <g><circle cx="400" cy="80" r="5"/><text x="418" y="89">元厚</text></g>
      <g><circle cx="327" cy="167" r="5"/><text x="345" y="158">土城</text></g>
      <g><circle cx="387" cy="275" r="5"/><text x="403" y="235">太平渡</text></g>
      <g><circle cx="360" cy="317" r="5"/><text x="247" y="326">二郎滩</text></g>
      <g><circle cx="354" cy="350" r="5"/><text x="372" y="378">九溪口</text></g>
      <g><circle cx="405" cy="450" r="5"/><text x="427" y="441">茅台</text></g>
      <g><circle cx="104" cy="385" r="5"/><text x="37" y="421">扎西方向</text></g>
      <g><circle cx="560" cy="345" r="5"/><text x="573" y="337">桐梓</text></g>
      <g><circle cx="572" cy="464" r="5"/><text x="587" y="474">遵义</text></g>
    </g>
    <g class="routes">${routes.map((route, i) => `<g data-route="${i + 1}" hidden><path class="march-line" pathLength="1" d="${route.path}" marker-end="url(#march-arrow)"/><circle class="march-point" r="7" aria-hidden="true"/><text class="route-label" x="${route.label[0]}" y="${route.label[1]}">${['一渡 ← 西', '二渡 → 东', '三渡 ← 西', '四渡 → 东'][i]}</text></g>`).join('')}</g>
    <text class="south-label" x="548" y="558">南下 ↓</text>
  </svg>`;
  const svg = container.querySelector('svg');
  const summary = svg.querySelector('#river-summary');
  const groups = [...svg.querySelectorAll('[data-route]')];
  let frame = 0;
  let generation = 0;
  const motionAllowed = () => document.body.dataset.motion === 'on' && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Every render invalidates pending positioning/paint/draw work, including rapid navigation.
  function complete() {
    generation++;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const group of groups) {
      group.classList.remove('is-drawing');
      group.querySelector('.march-line').style.strokeDashoffset = '0';
    }
  }

  function play() {
    complete();
    const group = groups.find((node) => node.classList.contains('current-route') && !node.hasAttribute('hidden'));
    if (!group || !motionAllowed()) return;
    const line = group.querySelector('.march-line');
    const point = group.querySelector('.march-point');
    const length = line.getTotalLength();
    const token = generation;
    const valid = () => token === generation && !group.hasAttribute('hidden') && motionAllowed();
    group.classList.add('is-drawing');
    line.style.strokeDashoffset = '1';
    const origin = line.getPointAtLength(0);
    point.setAttribute('cx', origin.x);
    point.setAttribute('cy', origin.y);
    const bounds = svg.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > innerHeight) {
      // The application positions the WHOLE map before drawing; focus stays on the trigger.
      container.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    // Two paint opportunities keep a hidden/unpainted route from consuming its animation.
    frame = requestAnimationFrame(() => {
      if (!valid()) return;
      frame = requestAnimationFrame(() => {
        if (!valid()) return;
        const painted = svg.getBoundingClientRect();
        if (painted.top < 0 || painted.bottom > innerHeight) return complete();
        const started = performance.now();
        function draw(now) {
          if (!valid()) return;
          const progress = Math.min(1, (now - started) / 1900);
          line.style.strokeDashoffset = String(1 - progress);
          const head = line.getPointAtLength(length * progress);
          point.setAttribute('cx', head.x);
          point.setAttribute('cy', head.y);
          if (progress < 1) frame = requestAnimationFrame(draw);
          else complete();
        }
        frame = requestAnimationFrame(draw);
      });
    });
  }

  // media.js remains the authority for motion preference; turning it off finishes, not freezes.
  const motionObserver = new MutationObserver(() => { if (!motionAllowed()) complete(); });
  motionObserver.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener('visibilitychange', () => { if (document.hidden) complete(); });
  window.addEventListener('pagehide', complete);

  function render(state) {
    complete();
    const overview = state.chapter === 0 || state.chapter === 5;
    groups.forEach((group, index) => {
      const current = index + 1 === state.chapter;
      group.toggleAttribute('hidden', !(overview || index + 1 < state.chapter || (current && state.revealed)));
      group.setAttribute('class', overview ? 'overview-route' : current ? 'current-route' : 'past-route');
    });
    svg.querySelector('.south-label').toggleAttribute('hidden', !(overview || (state.chapter === 4 && state.revealed)));
    const chapter = chapters[state.chapter - 1];
    summary.textContent = overview
      ? '一渡、三渡西渡，二渡、四渡东渡；四渡后南下。渡口由北向南概略排列。路线和山形均为原创示意，不代表精确行军轨迹或真实地形。'
      : `${chapter.title}，${chapter.date}。${state.revealed ? `${chapter.direction === 'west' ? '西渡' : '东渡'}，渡口：${chapter.crossings.join('、')}。${chapter.action}` : '本次路线尚未展开。'}此前各渡以虚线留痕。路线为概略示意。`;
  }
  render({ chapter: 0, revealed: false });
  return { render, play, complete, svg };
}
