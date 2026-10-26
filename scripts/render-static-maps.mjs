const names = ['一渡', '二渡', '三渡', '四渡'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

/** Build-time SVGs share the interactive map's geometry, without its mutable state. */
export function renderStaticMap({ id, chapter = null, mapData, chapters }) {
  if (typeof id !== 'string' || !/^[A-Za-z][\w-]*$/.test(id)) throw new Error('Invalid static map id');
  if (chapter !== null && ![1, 2, 3, 4].includes(chapter)) throw new Error(`Unknown static map chapter: ${chapter}`);
  if (!mapData?.geometry || !Array.isArray(chapters) || chapters.length !== 4) throw new Error('Missing map data for static map');
  const e = escapeHTML;
  const overview = chapter === null;
  const numbers = overview ? [1, 2, 3, 4] : [chapter];
  const mode = overview ? 'overview' : 'detail';
  const geometry = mapData.geometry(numbers[0], mode);
  const viewBox = overview ? mapData.overview.viewBox : geometry.viewBox;
  const title = overview ? '四渡赤水总览' : `${names[chapter - 1]} · ${chapters[chapter - 1].direction === 'west' ? '西渡' : '东渡'}`;
  const notice = overview
    ? '按编号、颜色和线型辨认四渡。阶段行军概括连线、渡河区域与河道均经概化；黑点是现代地点方位参照，不表示逐点到访。'
    : `${chapters[chapter - 1].date}。${geometry.notice}过河后：${chapters[chapter - 1].mapStage.destination}。`;
  const markers = numbers.map(n => `<marker id="${id}-arrow-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${overview ? 40 : 13}" markerHeight="${overview ? 40 : 13}" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10Z" fill="var(--stage-${n})"/></marker>`).join('');
  const paths = numbers.map(n => `<path class="static-route static-route-${n}" data-static-route="${n}" d="${e(mapData.geometry(n, mode).path)}" marker-end="url(#${id}-arrow-${n})"/>`).join('');
  const fords = overview ? Object.keys(mapData.fords) : mapData.stages[chapter - 1].fords;
  const areas = fords.map((key, index) => {
    const { xy: [x, y], radius, name } = mapData.fords[key];
    // Keep the two eastern-crossing labels away from both outgoing route shapes.
    const sideLabel = !overview && [2, 4].includes(chapter);
    const labelX = sideLabel ? (index ? 650 : 455) : x;
    const labelY = sideLabel ? 410 : y + (index % 2 ? radius + 23 : -radius - 13);
    const shortName = key === 'taiping' ? '太平渡' : key === 'erlang' ? '二郎滩' : name;
    const label = overview ? '' : `<text class="static-ford-name" x="${labelX}" y="${labelY}" text-anchor="${sideLabel ? (index ? 'end' : 'start') : 'middle'}">${e(shortName)}</text>`;
    return `<ellipse class="static-ford" cx="${x}" cy="${y}" rx="${radius}" ry="${radius * 0.6}"><title>${e(name)}（概化区域）</title></ellipse>${label}`;
  }).join('');
  const places = overview ? Object.entries(mapData.places).map(([key, place]) => {
    const [x, y] = mapData.node(key);
    return `<circle class="static-place" data-static-place="${key}" cx="${x}" cy="${y}" r="12"><title>${e(place.name)}：${e(place.note)}</title></circle>`;
  }).join('') : '';
  const labels = overview ? mapData.overview.labels.map(label => {
    const point = mapData.node(label.id);
    const end = [label.x + (label.anchor === 'end' ? 14 : -14), label.y - 20];
    return `<path class="static-label-leader" d="${mapData.path([point, ...label.via, end])}"/><text class="static-place-name" data-static-label="${e(label.id)}" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${e(label.text)}</text>`;
  }).join('') : '';
  const badges = overview ? numbers.map(n => {
    const { segment, t } = mapData.overview.badges[n - 1];
    const points = mapData.geometry(n, mode).points;
    const a = points[segment], b = points[segment + 1];
    const [x, y] = a.map((value, i) => value + (b[i] - value) * t);
    return `<g transform="translate(${x} ${y})"><g class="static-stage-badge static-stage-${n}" data-static-stage="${n}" role="img" aria-label="${names[n - 1]}路线编号"><circle r="36"/><text text-anchor="middle" dominant-baseline="central">${n}</text></g></g>`;
  }).join('') : '';
  const orientation = overview ? '<text class="static-river-name" x="420" y="170">赤水河</text><g class="static-north" transform="translate(70 180)"><text text-anchor="middle">北</text><path d="M0 30v68m-14-48 14-20 14 20"/></g>' : '';
  const legend = overview ? `<ol class="static-route-key" aria-label="四渡路线与日期">${numbers.map(n => {
    const stage = chapters[n - 1];
    const places = mapData.stages[n - 1].fords.map(key => mapData.fords[key].name).join('、');
    return `<li class="static-stage-${n}"><svg class="static-line-key" viewBox="0 0 44 12" aria-hidden="true"><path class="static-route static-route-${n}" d="M1 6H43"/></svg><div><strong>${n} · ${names[n - 1]} · ${stage.direction === 'west' ? '西渡' : '东渡'}</strong><span>${e(stage.date)}</span><span>${e(places)}</span><span>去向：${e(stage.mapStage.destination)}</span></div></li>`;
  }).join('')}</ol>` : '';
  return `<figure class="static-map ${overview ? 'context-overview' : 'chapter-map'}" data-static-map="${overview ? 'overview' : chapter}" aria-labelledby="${id}-caption">
              <figcaption id="${id}-caption"><strong>${e(title)}</strong><p>${e(notice)}</p></figcaption>
              <svg class="static-map-drawing" viewBox="${viewBox.join(' ')}" role="${overview ? 'group' : 'img'}" aria-labelledby="${id}-title ${id}-desc" xmlns="http://www.w3.org/2000/svg">
                <title id="${id}-title">${e(title)}</title><desc id="${id}-desc">${e(notice)}</desc>
                <defs>${markers}</defs>
                <g${overview ? '' : ' aria-hidden="true"'}><path class="static-river" d="${e(mapData.path(mapData.river.points))}"/>${areas}${labels}${paths}${places}${badges}${orientation}</g>
              </svg>${legend}
            </figure>`;
}
