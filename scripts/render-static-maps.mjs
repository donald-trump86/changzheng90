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
  const title = overview ? '四渡赤水总览' : `${names[chapter - 1]} · ${chapters[chapter - 1].direction === 'west' ? '西渡' : '东渡'}`;
  const notice = overview
    ? '四条线按渡次区分，表示阶段行军概括连线，不是逐日精确路线。现代地点仅作方位参照，河道与渡河区域经概化。'
    : `${chapters[chapter - 1].date}。${geometry.notice}`;
  const marker = `${id}-arrow`;
  const paths = numbers.map(number => `<path class="static-route static-route-${number}" data-static-route="${number}" d="${e(mapData.geometry(number, mode).path)}" marker-end="url(#${marker})"/>`).join('');
  const fords = overview ? Object.keys(mapData.fords) : mapData.stages[chapter - 1].fords;
  const areas = fords.map((key, index) => {
    const { xy: [x, y], radius, name } = mapData.fords[key];
    const label = overview ? '' : `<text class="static-ford-name" x="${x}" y="${y + (index % 2 ? radius + 23 : -radius - 13)}" text-anchor="middle">${e(name)}</text>`;
    return `<ellipse class="static-ford" cx="${x}" cy="${y}" rx="${radius}" ry="${radius * 0.6}"/>${label}`;
  }).join('');
  const placeNames = overview ? ['zaxi', 'zunyi'].map(key => {
    const [x, y] = mapData.node(key);
    return `<circle class="static-place" cx="${x}" cy="${y}" r="7"/><text class="static-place-name" x="${x}" y="${y + 65}" text-anchor="${key === 'zaxi' ? 'start' : 'end'}">${e(mapData.places[key].name)}${key === 'zaxi' ? '地区' : ''}</text>`;
  }).join('') : '';
  const legend = overview ? `<ol class="static-route-key" aria-label="四渡路线与日期">${numbers.map(number => {
    const stage = chapters[number - 1];
    const places = mapData.stages[number - 1].fords.map(key => mapData.fords[key].name).join('、');
    return `<li><span class="static-line-key static-line-key-${number}" aria-hidden="true"></span><div><strong>${names[number - 1]} · ${stage.direction === 'west' ? '西渡' : '东渡'}</strong><span>${e(stage.date)}</span><span>${e(places)}</span></div></li>`;
  }).join('')}</ol>` : '';
  return `<figure class="static-map ${overview ? 'context-overview' : 'chapter-map'}" data-static-map="${overview ? 'overview' : chapter}" aria-labelledby="${id}-caption">
              <figcaption id="${id}-caption"><strong>${e(title)}</strong><p>${e(notice)}</p></figcaption>
              <svg viewBox="${geometry.viewBox.join(' ')}" role="img" aria-labelledby="${id}-title ${id}-desc" xmlns="http://www.w3.org/2000/svg">
                <title id="${id}-title">${e(title)}</title><desc id="${id}-desc">${e(notice)}</desc>
                <defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 10 5 0 10Z" fill="currentColor"/></marker></defs>
                <g aria-hidden="true"><path class="static-river" d="${e(mapData.path(mapData.river.points))}"/>${areas}${paths}${placeNames}</g>
              </svg>${legend}
            </figure>`;
}
