import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters, sources, epilogue } from '../src/story.js';

const expectedDates = [
  ['1935年1月29日拂晓', ['1935-01-29', '1935-01-29']],
  ['1935年2月18—21日', ['1935-02-18', '1935-02-21']],
  ['1935年3月16—17日', ['1935-03-16', '1935-03-17']],
  ['1935年3月21—22日', ['1935-03-21', '1935-03-22']],
];

function assertDeepFrozen(value) {
  assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') assertDeepFrozen(child);
  }
}

test('four chronological chapters carry the exact dates and alternating directions', () => {
  assert.equal(chapters.length, 4);
  assert.deepEqual(chapters.map(({ id }) => id), [1, 2, 3, 4]);
  assert.deepEqual(chapters.map(({ direction }) => direction), ['west', 'east', 'west', 'east']);
  chapters.forEach((chapter, index) => {
    assert.equal(chapter.date, expectedDates[index][0]);
    assert.deepEqual(chapter.dateISO, expectedDates[index][1]);
    assert.ok(chapter.dateISO[0] <= chapter.dateISO[1]);
    if (index > 0) assert.ok(chapters[index - 1].dateISO[1] < chapter.dateISO[0]);
    chapter.dateISO.forEach((date) => {
      assert.match(date, /^1935-\d{2}-\d{2}$/);
      assert.equal(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date);
    });
  });
});

test('each chapter supplies the agreed content contract and real crossing names', () => {
  const keys = ['id', 'date', 'dateISO', 'title', 'situation', 'action', 'result', 'crossings', 'direction', 'sourceIds'];
  chapters.forEach((chapter) => {
    assert.deepEqual(Object.keys(chapter).sort(), keys.toSorted());
    for (const field of ['title', 'situation', 'action', 'result']) {
      assert.equal(typeof chapter[field], 'string');
      assert.ok(chapter[field].trim().length > 0);
    }
    assert.ok(chapter.crossings.length > 0);
    assert.ok(chapter.crossings.every((name) => typeof name === 'string' && name.length > 0));
    assert.equal(Object.hasOwn(chapter, 'insight'), false);
  });
  assert.ok(chapters[0].crossings.includes('土城'));
  assert.ok(chapters[0].crossings.includes('元厚'));
  assert.ok(chapters[1].crossings.includes('太平渡'));
  assert.ok(chapters[1].crossings.includes('二郎滩'));
  assert.ok(chapters[2].crossings.includes('茅台'));
  assert.ok(chapters[3].crossings.includes('太平渡'));
  assert.ok(chapters[3].crossings.includes('二郎滩'));
});

test('all chapter source IDs resolve uniquely to the two fetched official sources', () => {
  assert.equal(sources.length, 2);
  const sourceIds = new Set(sources.map(({ id }) => id));
  assert.equal(sourceIds.size, sources.length);
  assert.deepEqual(sources.map(({ url }) => url), [
    'https://www.news.cn/politics/2016-10/02/c_129309668.htm',
    'https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html',
  ]);
  sources.forEach((source) => {
    assert.deepEqual(Object.keys(source).sort(), ['id', 'title', 'url', 'publisher'].toSorted());
    Object.values(source).forEach((value) => assert.ok(typeof value === 'string' && value.length > 0));
  });
  chapters.forEach((chapter) => {
    assert.ok(chapter.sourceIds.length > 0);
    assert.equal(new Set(chapter.sourceIds).size, chapter.sourceIds.length);
    chapter.sourceIds.forEach((id) => assert.ok(sourceIds.has(id), `Unresolved source: ${id}`));
  });
});

test('chapters and their nested data are immutable', () => {
  assertDeepFrozen(chapters);
  assert.throws(() => { chapters[0].dateISO[0] = '2000-01-01'; }, TypeError);
  assert.throws(() => { chapters[0].direction = 'east'; }, TypeError);
});

test('epilogue separates later actions from the end of the fourth crossing', () => {
  assert.deepEqual(Object.keys(epilogue).sort(), ['title', 'body'].toSorted());
  assert.match(epilogue.body, /四渡赤水.*不等于.*长征结束/);
  for (const action of ['南渡乌江', '贵阳', '金沙江']) assert.ok(epilogue.body.includes(action));
  assert.match(epilogue.body, /随后|此后|之后/);
  assert.equal(Object.hasOwn(epilogue, 'reflection'), false);
});
