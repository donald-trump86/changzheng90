import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { renderStaticMap } from './render-static-maps.mjs';
import { renderMaoExhibition } from './render-mao-exhibition.mjs';

const anchors = ['one', 'two', 'three', 'four'];
const names = ['一渡', '二渡', '三渡', '四渡'];
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const direction = (chapter) => chapter.direction === 'west' ? '西渡' : '东渡';
const isoDate = ({ year, month, day }) => [year, month, day].filter((part) => part !== null && part !== undefined).map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join('-');
function shortDate([start, end]) {
  const [, month, day] = start.split('-').map(Number);
  const [, endMonth, endDay] = end.split('-').map(Number);
  return `${month}.${day}` + (start === end ? '' : `—${month === endMonth ? endDay : `${endMonth}.${endDay}`}`);
}

function replaceRegion(html, name, content) {
  const start = `<!-- history:${name}:start -->`;
  const end = `<!-- history:${name}:end -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2 || html.indexOf(start) >= html.indexOf(end)) {
    throw new Error(`Expected exactly one ordered history region: ${name}`);
  }
  return html.slice(0, html.indexOf(start) + start.length) + content + html.slice(html.indexOf(end));
}

/** Pure static renderer. Only replaces the explicit history:* regions.
 * `history` follows globalThis.ChishuiHistory; importing this module performs no I/O.
 */
export function renderHistory(html, history, mapData) {
  const { chapters, eras, epilogue } = history;
  const first = chapters[0];
  const e = escapeHTML;
  const regions = {
    ...renderMaoExhibition(mapData),
    'context-overview': renderStaticMap({ id: 'context-map', mapData, chapters }),
    timeline: `<ol class="timeline" aria-label="长征进程中的五个节点">\n${eras.map((era) => `        <li${era.id === 'sidu' ? ' class="timeline-focus"' : ''}><time datetime="${e(isoDate(era.start_date))}">${e(era.display_date)}</time><p>${e(era.description)}</p></li>`).join('\n')}\n      </ol>`,
    'chapter-nav': `<nav class="chapter-nav" aria-label="选择四渡赤水章节">\n${chapters.map((chapter, index) => `        <a class="chapter-link" href="#crossing-${anchors[index]}" data-chapter-choice="${e(chapter.id)}"${index === 0 ? ' aria-current="true"' : ''}><strong>${names[index]}</strong><time datetime="${e(chapter.dateISO[0])}">${e(shortDate(chapter.dateISO))}</time></a>`).join('\n')}\n      </nav>`,
    chapters: chapters.map((chapter, index) => `<article id="crossing-${anchors[index]}" class="chapter-panel" data-chapter="${e(chapter.id)}" data-direction-label="${direction(chapter)}" aria-labelledby="chapter-${anchors[index]}-title">
            <p class="chapter-date"><span>${names[index]}</span><time datetime="${e(chapter.dateISO[0])}">${e(chapter.date)}</time></p>
            <h3 id="chapter-${anchors[index]}-title">${e(chapter.title)}</h3>
            <p class="chapter-theme">${e(chapter.theme)}</p>
            ${renderStaticMap({ id: `chapter-map-${chapter.id}`, chapter: chapter.id, mapData, chapters })}
            <div class="situation"><h4>当时的情势</h4><p>${e(chapter.situation)}</p></div>
            <details class="disclosure story-disclosure" open data-disclosure>
              <summary><span>行动与结果</span><svg class="disclosure-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><path class="icon-vertical" d="M12 4v16"/></svg></summary>
              <div class="disclosure-body"><div class="disclosure-inner"><h4>${e(chapter.actionHeading)}</h4><p>${e(chapter.action)}</p><h4>${e(chapter.resultHeading)}</h4><p>${e(chapter.result)}</p></div></div>
            </details>
          </article>`).join('\n          '),
    'route-direction': `<p class="route-direction" id="route-direction">${names[0]} · ${direction(first)}</p>`,
    'route-date': `<p class="route-date" id="route-date">${e(first.date)}</p>`,
    'map-description': `<desc id="map-description">${e(first.mapStage.summary)}现代地点只作方位参照，渡口区域、河道和阶段连线经原创概化，不代表1935年精确测绘。</desc>`,
    'map-destination': `<text id="map-destination">${e(first.mapStage.destination)}</text>`,
    'map-chronology': `<p id="map-stage-note" class="map-stage-note">${e(first.mapStage.chronology)}</p>`,
    'map-summary': `<p id="map-stage-summary" class="map-stage-summary">${e(first.mapStage.summary)}</p>`,
    'map-history-list': `<ul>\n${chapters.map((chapter, index) => `                <li>${names[index]}：${e(chapter.mapStage.historicalText)}</li>`).join('\n')}\n              </ul>`,
    'epilogue-copy': `<h2 id="continuation-title">${e(epilogue.sectionTitle)}</h2>\n        <h3>${e(epilogue.title)}</h3>\n${epilogue.paragraphs.map((paragraph) => `        <p>${e(paragraph)}</p>`).join('\n')}`,
    'epilogue-after': `<h3>${e(epilogue.afterTitle)}</h3>\n        <ol aria-label="四渡后的部分行动">${epilogue.actions.map((action) => `<li>${e(action)}</li>`).join('')}</ol>\n        <p>${e(epilogue.body)}</p>`,
  };
  // Builds stamp asset hashes separately; retain those queries when re-rendering copy.
  const assetVersions = new Map([...html.matchAll(/(\.\/public\/images\/[a-z0-9-]+\.webp)\?v=([a-f0-9]{8})/g)].map(([, path, hash]) => [path, hash]));
  return Object.entries(regions).reduce((rendered, [name, content]) => replaceRegion(rendered, name,
    content.replace(/\.\/public\/images\/[a-z0-9-]+\.webp/g, path => assetVersions.has(path) ? `${path}?v=${assetVersions.get(path)}` : path)), html);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node scripts/render-history.mjs [--check]');
  const { readFile, writeFile } = await import('node:fs/promises');
  await import('../src/history-data.js');
  await import('../src/historical-map-data.js');
  const index = new URL('../index.html', import.meta.url);
  const html = await readFile(index, 'utf8');
  const rendered = renderHistory(html, globalThis.ChishuiHistory, globalThis.ChishuiMapData);
  if (args[0] === '--check') {
    if (rendered !== html) throw new Error('Generated history is stale. Run node scripts/render-history.mjs');
    console.log('Generated history is current.');
  } else if (rendered !== html) {
    await writeFile(index, rendered);
    console.log('Rendered historical regions in index.html.');
  } else {
    console.log('Generated history is already current.');
  }
}

// An import must never render or write the page.
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
