// Dates use ISO 8601 calendar dates, always [start, end]. A single day repeats.
// The sources do not establish precise crossing times for all four chapters.
function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

export const sources = deepFreeze([
  {
    id: 'xinhua-2016',
    title: '【镜头·长征路上】四渡赤水出奇兵',
    url: 'https://www.news.cn/politics/2016-10/02/c_129309668.htm',
    publisher: '新华网（来源：中央纪委监察部网站）',
  },
  {
    id: 'dswxyjy-2026',
    title: '四渡赤水，以少胜多的光辉典范',
    url: 'https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html',
    publisher: '中共中央党史和文献研究院网站（来源：《光明日报》）',
  },
]);

export const chapters = deepFreeze([
  {
    id: 1,
    date: '1935年1月29日拂晓',
    dateISO: ['1935-01-29', '1935-01-29'],
    title: '一渡：先脱离堵追',
    situation: '遵义会议后，中央红军原拟北渡长江。土城战斗未能取得预期战果，继续在这里作战面临被堵追的危险。',
    action: '中央红军调整行动，从土城、元厚等渡口西渡赤水河，向川南转移。',
    result: '红军脱离土城一带的堵追，随后到达川滇边的扎西地区，并进行整编。',
    crossings: ['土城', '元厚'],
    direction: 'west',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
  {
    id: 2,
    date: '1935年2月18—21日',
    dateISO: ['1935-02-18', '1935-02-21'],
    title: '二渡：回到黔北寻找战机',
    situation: '敌军被吸引到川滇边境，黔北兵力相对空虚；川滇敌军又向扎西逼近，北渡长江的计划暂缓执行。',
    action: '中央红军从太平渡、二郎滩等渡口东渡赤水河，回师黔北，向桐梓方向前进。',
    result: '红军随后攻取桐梓、娄山关，再占遵义，取得遵义战役的胜利。',
    crossings: ['太平渡', '二郎滩'],
    direction: 'east',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
  {
    id: 3,
    date: '1935年3月16—17日',
    dateISO: ['1935-03-16', '1935-03-17'],
    title: '三渡：转向河西，寻求机动',
    situation: '遵义战役后，敌军重新组织围攻，企图把中央红军围在遵义、鸭溪一带。红军需要跳出新的合围。',
    action: '中央红军转兵西进，从茅台及其附近地区西渡赤水河，再入川南，寻求新的机动。',
    result: '敌方判断红军又要北渡长江，调动重兵围堵，敌军再次向赤水河以西地区集中。',
    crossings: ['茅台'],
    direction: 'west',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
  {
    id: 4,
    date: '1935年3月21—22日',
    dateISO: ['1935-03-21', '1935-03-22'],
    title: '四渡：折返东岸，迅速南下',
    situation: '敌军再次向赤水河以西地区集中。中央红军决定隐蔽、迅速地折返东岸，争取新的机动机会。',
    action: '中央红军从太平渡、二郎滩、九溪口等渡口东渡赤水河，随后迅速转向南方。',
    result: '红军重回黔北并向南行动。之后的南渡乌江、威逼贵阳、巧渡金沙江，继续改变了围追堵截的局面。',
    crossings: ['太平渡', '二郎滩', '九溪口'],
    direction: 'east',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
]);

export const epilogue = deepFreeze({
  title: '渡过赤水，路还在前方',
  body: '四渡赤水结束，不等于长征结束，也不意味着红军在渡河当天就完全摆脱了所有围堵。此后，中央红军南渡乌江、威逼贵阳，继而向云南机动，并于5月初巧渡金沙江，逐步跳出敌军的包围。',
});

export const questions = deepFreeze([
  {
    prompt: '为什么中央红军多次调整渡河方向？',
    options: [
      '根据敌军部署和实际形势，寻找机动与作战的机会。',
      '因为四次渡河的顺序和结果早已全部安排好。',
      '因为来回渡河本身就是最终目标。',
    ],
    answer: 0,
    explanation: '土城战斗的结果、黔北兵力的变化和敌军新的围堵，都影响了后续行动。四次渡河是在变化的形势中作出的调整。',
  },
  {
    prompt: '四渡赤水结束之后，中央红军还进行了哪些行动？',
    options: [
      '渡河当天就结束长征。',
      '随后南渡乌江、威逼贵阳，再向云南机动，巧渡金沙江。',
      '一直停留在赤水河岸，不再转移。',
    ],
    answer: 1,
    explanation: '四渡赤水之后，中央红军继续南下，经过南渡乌江、威逼贵阳等行动，于5月初巧渡金沙江。四渡结束与长征结束是不同的时间节点。',
  },
]);

/** @returns {{ chapter: number, revealed: boolean }} */
export function initialState() {
  return { chapter: 0, revealed: false };
}

/**
 * @param {{ chapter: number, revealed: boolean }} state
 * @param {{ type: 'START'|'REVEAL'|'NEXT'|'PREV'|'GOTO'|'RESTART', chapter?: number }} event
 * @returns {{ chapter: number, revealed: boolean }}
 */
export function transition(state, event) {
  switch (event?.type) {
    case 'START':
      return { chapter: 1, revealed: false };
    case 'REVEAL':
      return state.chapter >= 1 && state.chapter <= 4
        ? { chapter: state.chapter, revealed: true }
        : state;
    case 'NEXT':
      return { chapter: Math.min(5, state.chapter + 1), revealed: false };
    case 'PREV':
      return { chapter: Math.max(0, state.chapter - 1), revealed: false };
    case 'GOTO':
      return Number.isInteger(event.chapter) && event.chapter >= 0 && event.chapter <= 5
        ? { chapter: event.chapter, revealed: false }
        : state;
    case 'RESTART':
      return initialState();
    default:
      return state;
  }
}
