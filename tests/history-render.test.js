import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';

const indexURL = new URL('../index.html', import.meta.url);
const rendererURL = new URL('../scripts/render-history.mjs', import.meta.url);
const canonicalURL = new URL('../src/history-data.js', import.meta.url);
const load = async () => {
  const context = {};
  runInNewContext(await readFile(canonicalURL, 'utf8'), context);
  return context.ChishuiHistory;
};
const outsideRegions = (html) => html.replace(/<!-- history:([\w-]+):start -->[\s\S]*?<!-- history:\1:end -->/g, '<generated>');

test('checked-in HTML equals the pure renderer and rendering is idempotent', async () => {
  const { renderHistory } = await import(rendererURL);
  const history = await load();
  const html = await readFile(indexURL, 'utf8');
  assert.equal(renderHistory(html, history), html);
  assert.equal(renderHistory(renderHistory(html, history), history), html);
  assert.equal((html.match(/class="chapter-panel"/g) || []).length, 4);
  assert.equal((html.match(/class="timeline-focus"/g) || []).length, 1);
  assert.ok(html.includes(history.epilogue.body));
  for (const chapter of history.chapters) {
    for (const key of ['date', 'title', 'situation', 'action', 'result']) assert.ok(html.includes(chapter[key]), `${chapter.id}/${key}`);
    assert.ok(html.includes(chapter.mapStage.historicalText), `${chapter.id}/mapStage/historicalText`);
  }
  for (const key of ['summary', 'chronology']) assert.ok(html.includes(history.chapters[0].mapStage[key]), `first-stage/${key}`);
});

test('edited chapter dates/action, eras and map facts propagate without touching the page shell', async () => {
  const { renderHistory } = await import(rendererURL);
  const history = JSON.parse(JSON.stringify(await load()));
  const html = await readFile(indexURL, 'utf8');
  history.chapters[0].date = '测试日期<&"';
  history.chapters[0].dateISO = ['1935-01-30', '1935-01-31'];
  history.chapters[0].action = '修改后的行动<&"';
  history.chapters[0].mapStage.summary = '修改后的地图说明';
  history.chapters[0].mapStage.chronology = '修改后的地图日期';
  history.chapters[0].mapStage.historicalText = '修改后的历史列表';
  history.eras[0].display_date = '修改后的分期';
  history.eras[0].description = '修改后的分期正文';
  history.epilogue.body = '修改后的尾声';
  const rendered = renderHistory(html, history);
  assert.notEqual(rendered, html);
  for (const text of ['测试日期&lt;&amp;&quot;', '修改后的行动&lt;&amp;&quot;', 'datetime="1935-01-30"', '1.30—31', '修改后的地图说明', '修改后的地图日期', '修改后的历史列表', '修改后的分期', '修改后的分期正文', '修改后的尾声']) assert.ok(rendered.includes(text), text);
  assert.equal(outsideRegions(rendered), outsideRegions(html));
  assert.equal(renderHistory(rendered, history), rendered);
  assert.equal(renderHistory(rendered, await load()), html, 'canonical rendering repairs stale generated text');
});

test('missing or duplicated generated boundaries fail instead of silently leaving stale facts', async () => {
  const { renderHistory } = await import(rendererURL);
  const html = await readFile(indexURL, 'utf8');
  const history = await load();
  assert.throws(() => renderHistory(html.replace('<!-- history:timeline:start -->', ''), history), /timeline/);
  assert.throws(() => renderHistory(html + '<!-- history:timeline:start --><!-- history:timeline:end -->', history), /timeline/);
});

test('renderer import and --check leave index untouched; canonical precedes map scripts', async () => {
  const before = await stat(indexURL);
  const html = await readFile(indexURL, 'utf8');
  await import(rendererURL);
  const result = spawnSync(process.execPath, [rendererURL.pathname, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal((await stat(indexURL)).mtimeMs, before.mtimeMs);
  assert.equal(await readFile(indexURL, 'utf8'), html);
  assert.ok(html.indexOf('src/history-data.js') < html.indexOf('src/historical-map-data.js'));
  assert.match(html, /const chapter = globalThis\.ChishuiHistory\?\.chapters\[number - 1\]/);
  assert.match(html, /routeDate\.textContent = chapter\.date/);
});

test('hero emblem, single valley woodcut plate, and readable source links are present', async () => {
  const html = await readFile(indexURL, 'utf8');
  assert.match(html, /<figure class="hero-emblem"[\s\S]*?<img class="hero-emblem-mark" src="\.\/public\/party-emblem\.svg" alt="中国共产党党徽"/);
  assert.doesNotMatch(html, /class="hero-archive"/);
  assert.doesNotMatch(html, /class="continuation-plate"/);
  assert.equal((html.match(/href="\.\/design-study\/chishui-valley-study\.png"/g) || []).length, 1);
  assert.equal((html.match(/href="\.\/design-study\/long-march-gathering\.jpg"/g) || []).length, 1);
  assert.match(html, /黑白朱砂木刻风格/);
  assert.doesNotMatch(html, />https?:\/\//);
});
