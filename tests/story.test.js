import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters, sources, epilogue, questions, initialState, transition } from '../src/story.js';

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
  const keys = ['id', 'date', 'dateISO', 'title', 'situation', 'action', 'result', 'insight', 'crossings', 'direction', 'sourceIds'];
  chapters.forEach((chapter) => {
    assert.deepEqual(Object.keys(chapter).sort(), keys.toSorted());
    for (const field of ['title', 'situation', 'action', 'result', 'insight']) {
      assert.equal(typeof chapter[field], 'string');
      assert.ok(chapter[field].trim().length > 0);
    }
    assert.ok(chapter.crossings.length > 0);
    assert.ok(chapter.crossings.every((name) => typeof name === 'string' && name.length > 0));
    assert.match(chapter.insight, /^作者解读：/);
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
  assert.deepEqual(Object.keys(epilogue).sort(), ['title', 'body', 'reflection'].toSorted());
  assert.match(epilogue.body, /四渡赤水.*不等于.*长征结束/);
  for (const action of ['南渡乌江', '贵阳', '金沙江']) assert.ok(epilogue.body.includes(action));
  assert.match(epilogue.body, /随后|此后|之后/);
  assert.match(epilogue.reflection, /^作者解读：/);
});

test('two comprehension questions offer valid answers and useful explanations', () => {
  assert.equal(questions.length, 2);
  questions.forEach((question) => {
    assert.deepEqual(Object.keys(question).sort(), ['prompt', 'options', 'answer', 'explanation'].toSorted());
    assert.ok(question.prompt.length > 0 && question.explanation.length > 0);
    assert.ok(question.options.length >= 2);
    assert.equal(new Set(question.options).size, question.options.length);
    assert.ok(question.options.every((option) => typeof option === 'string' && option.length > 0));
    assert.ok(Number.isInteger(question.answer));
    assert.ok(question.answer >= 0 && question.answer < question.options.length);
  });
  assert.match(questions[0].options[questions[0].answer], /形势|局势/);
  assert.match(questions[1].options[questions[1].answer], /乌江/);
});

test('initialState returns a fresh unrevealed cover state', () => {
  assert.deepEqual(initialState(), { chapter: 0, revealed: false });
  assert.notEqual(initialState(), initialState());
});

test('START and RESTART always reset the reading position and reveal', () => {
  for (let chapter = 0; chapter <= 5; chapter += 1) {
    const state = Object.freeze({ chapter, revealed: true });
    assert.deepEqual(transition(state, { type: 'START' }), { chapter: 1, revealed: false });
    assert.deepEqual(transition(state, { type: 'RESTART' }), initialState());
    assert.deepEqual(state, { chapter, revealed: true });
  }
});

test('REVEAL only reveals chapters 1–4 and repeated REVEAL is idempotent', () => {
  for (let chapter = 0; chapter <= 5; chapter += 1) {
    const state = Object.freeze({ chapter, revealed: false });
    const result = transition(state, { type: 'REVEAL' });
    assert.deepEqual(result, { chapter, revealed: chapter >= 1 && chapter <= 4 });
    assert.deepEqual(transition(Object.freeze(result), { type: 'REVEAL' }), result);
    assert.deepEqual(state, { chapter, revealed: false });
  }
});

test('NEXT and PREV clamp at both bounds and always reset reveal', () => {
  for (let chapter = 0; chapter <= 5; chapter += 1) {
    for (const revealed of [true, false]) {
      const state = Object.freeze({ chapter, revealed });
      assert.deepEqual(transition(state, { type: 'NEXT' }), { chapter: Math.min(5, chapter + 1), revealed: false });
      assert.deepEqual(transition(state, { type: 'PREV' }), { chapter: Math.max(0, chapter - 1), revealed: false });
      assert.deepEqual(state, { chapter, revealed });
    }
  }
});

test('GOTO accepts every integer chapter, including the current chapter, and resets reveal', () => {
  for (let chapter = 0; chapter <= 5; chapter += 1) {
    const state = Object.freeze({ chapter, revealed: true });
    for (let target = 0; target <= 5; target += 1) {
      assert.deepEqual(transition(state, Object.freeze({ type: 'GOTO', chapter: target })), { chapter: target, revealed: false });
    }
    assert.deepEqual(state, { chapter, revealed: true });
  }
});

test('invalid GOTO values preserve the previous state', () => {
  const state = Object.freeze({ chapter: 3, revealed: true });
  for (const chapter of [NaN, '2', 2.5, -1, 6, Infinity, -Infinity, null, undefined, {}, true]) {
    assert.deepEqual(transition(state, { type: 'GOTO', chapter }), state);
  }
  assert.deepEqual(state, { chapter: 3, revealed: true });
});

test('unknown or missing events preserve the previous state', () => {
  const state = Object.freeze({ chapter: 2, revealed: true });
  for (const event of [{ type: 'UNKNOWN' }, {}, null, undefined]) {
    assert.deepEqual(transition(state, event), state);
  }
});

test('jump, back, reveal and restart sequences never retain another chapter reveal', () => {
  let state = initialState();
  for (const [event, expected] of [
    [{ type: 'START' }, { chapter: 1, revealed: false }],
    [{ type: 'REVEAL' }, { chapter: 1, revealed: true }],
    [{ type: 'GOTO', chapter: 4 }, { chapter: 4, revealed: false }],
    [{ type: 'REVEAL' }, { chapter: 4, revealed: true }],
    [{ type: 'PREV' }, { chapter: 3, revealed: false }],
    [{ type: 'REVEAL' }, { chapter: 3, revealed: true }],
    [{ type: 'RESTART' }, { chapter: 0, revealed: false }],
  ]) {
    const previous = Object.freeze(state);
    const snapshot = { ...previous };
    state = transition(previous, event);
    assert.deepEqual(state, expected);
    assert.deepEqual(previous, snapshot);
  }
});
