import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chapters } from '../src/story.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const expectedContext = {};
runInNewContext(await readFile(join(root, 'src/history-data.js'), 'utf8'), expectedContext);
runInNewContext(await readFile(join(root, 'src/historical-map-data.js'), 'utf8'), expectedContext);
const map = expectedContext.ChishuiMapData;

// 唯一事实源之间必须不矛盾：story.js 的日期、方向、渡口
// 与 historical-map-data.js 的 stage.chronology、fords、relations 对得上。
// 只断言 story ⊆ map（补充材料允许比正文更细），不做全等比较。

function monthDayRange(dateISO) {
  const [start, end] = dateISO;
  const month = Number(start.slice(5, 7));
  const firstDay = Number(start.slice(8, 10));
  const lastDay = Number(end.slice(8, 10));
  return firstDay === lastDay ? `${month}月${firstDay}日` : `${month}月${firstDay}—${lastDay}日`;
}

function stageNamesForChapter(number) {
  const stage = map.stages[number - 1];
  const fords = stage.fords.map((id) => map.fords[id].name);
  const relations = Object.entries(map.relations)
    .filter(([, entry]) => (entry.stages ?? []).includes(number))
    .map(([, entry]) => entry.name);
  return [...fords, ...relations];
}

test('story dates lead the matching map chronology without contradiction', () => {
  assert.equal(chapters.length, map.stages.length);
  for (const [index, chapter] of chapters.entries()) {
    const chronology = map.stages[index].chronology;
    const prefix = monthDayRange(chapter.dateISO);
    assert.ok(
      chronology.startsWith(prefix),
      `chapter ${index + 1} date ${chapter.dateISO.join('..')} vs chronology "${chronology}"`,
    );
  }
});

test('story crossing directions match the map chronology verbs', () => {
  for (const [index, chapter] of chapters.entries()) {
    const lead = map.stages[index].chronology.split('；')[0];
    const expected = chapter.direction === 'west' ? '西渡' : '东渡';
    const opposite = chapter.direction === 'west' ? '东渡' : '西渡';
    assert.ok(lead.includes(expected), `chapter ${index + 1} ${chapter.direction} vs "${lead}"`);
    assert.ok(!lead.includes(opposite), `chapter ${index + 1} "${lead}" mixes crossing directions`);
  }
});

test('every story crossing is named by map fords or relations for that chapter', () => {
  for (const [index, chapter] of chapters.entries()) {
    const names = stageNamesForChapter(index + 1);
    for (const crossing of chapter.crossings) {
      assert.ok(
        names.some((name) => name.includes(crossing)),
        `chapter ${index + 1} crossing "${crossing}" missing from map names ${names.join(' / ')}`,
      );
    }
  }
});
