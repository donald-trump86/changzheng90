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
    title: '一渡：从土城撤出',
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
    title: '二渡：重返黔北',
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
    title: '三渡：再向河西',
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
    title: '四渡：折返东岸',
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

/**
 * 历史分期。含数字起止日期与展示串，供时间线渲染与 Phase 3 地图共用。
 * @type {ReadonlyArray<{ id: string, title: string, start_date: { year: number, month: number, day: number|null, display_date: string }, end_date: { year: number, month: number, day: number|null, display_date: string }, display_date: string, sourceIds: string[] }>}
 */
export const eras = deepFreeze([
  {
    id: 'changzheng',
    title: '长征开始',
    start_date: { year: 1934, month: 10, day: null, display_date: '1934年10月' },
    end_date: { year: 1935, month: 1, day: null, display_date: '1935年1月' },
    display_date: '1934年10月—1935年1月',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
  {
    id: 'sidu',
    title: '四渡赤水',
    start_date: { year: 1935, month: 1, day: 29, display_date: '1935年1月29日' },
    end_date: { year: 1935, month: 3, day: 22, display_date: '1935年3月22日' },
    display_date: '1935年1—3月',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
  {
    id: 'tuichu',
    title: '巧渡金沙江，跳出包围',
    start_date: { year: 1935, month: 3, day: 31, display_date: '1935年3月31日' },
    end_date: { year: 1935, month: 5, day: null, display_date: '1935年5月' },
    display_date: '1935年3月末—5月',
    sourceIds: ['dswxyjy-2026'],
  },
  {
    id: 'shengli',
    title: '到达陕北',
    start_date: { year: 1935, month: 10, day: null, display_date: '1935年10月' },
    end_date: { year: 1935, month: 10, day: null, display_date: '1935年10月' },
    display_date: '1935年10月',
    sourceIds: ['xinhua-2016'],
  },
  {
    id: 'huishi',
    title: '三大主力会师',
    start_date: { year: 1936, month: 10, day: null, display_date: '1936年10月' },
    end_date: { year: 1936, month: 10, day: null, display_date: '1936年10月' },
    display_date: '1936年10月',
    sourceIds: ['xinhua-2016', 'dswxyjy-2026'],
  },
]);

/**
 * 时间线事件，借 TimelineJS3 形状：{start_date:{year,month,day,display_date},
 * text:{headline,text}, media:{url,caption,credit}|null, group, unique_id}。
 * text 文本只写已核事实；media 为 null 表示该节点不配图，避免把照片误挂到事件上。
 */
export const timeline = deepFreeze([
  {
    unique_id: 'event-1934-10-changzheng',
    group: 'changzheng',
    start_date: { year: 1934, month: 10, day: null, display_date: '1934年10月' },
    text: { headline: '长征开始', text: '中央红军开始长征。' },
    media: null,
  },
  {
    unique_id: 'event-1935-01-beidu',
    group: 'changzheng',
    start_date: { year: 1935, month: 1, day: null, display_date: '1935年1月' },
    text: {
      headline: '遵义会议后原拟北渡长江 / 土城战斗',
      text: '遵义会议后，中央红军原拟北渡长江。土城战斗未能取得预期战果。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-01-tucheng',
    group: 'changzheng',
    start_date: { year: 1935, month: 1, day: null, display_date: '1935年1月' },
    text: {
      headline: '需要改变方向',
      text: '继续在这里作战面临被堵追的危险。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-01-29-yidu',
    group: 'sidu',
    start_date: { year: 1935, month: 1, day: 29, display_date: '1935年1月29日拂晓' },
    text: {
      headline: '一渡：从土城撤出',
      text: '红军脱离土城一带的堵追，随后到达川滇边的扎西地区，并进行整编。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-02-18-erdu',
    group: 'sidu',
    start_date: { year: 1935, month: 2, day: 18, display_date: '1935年2月18—21日' },
    text: {
      headline: '二渡：重返黔北',
      text: '红军随后攻取桐梓、娄山关，再占遵义，取得遵义战役的胜利。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-03-16-sandu',
    group: 'sidu',
    start_date: { year: 1935, month: 3, day: 16, display_date: '1935年3月16—17日' },
    text: {
      headline: '三渡：再向河西',
      text: '敌方判断红军又要北渡长江，调动重兵围堵，敌军再次向赤水河以西地区集中。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-03-21-sidu',
    group: 'sidu',
    start_date: { year: 1935, month: 3, day: 21, display_date: '1935年3月21—22日' },
    text: {
      headline: '四渡：折返东岸',
      text: '红军重回黔北并向南行动。之后的南渡乌江、威逼贵阳、巧渡金沙江，继续改变了围追堵截的局面。',
    },
    media: null,
  },
  {
    unique_id: 'event-1935-03-31-wujiang',
    group: 'tuichu',
    start_date: { year: 1935, month: 3, day: 31, display_date: '1935年3月31日' },
    text: { headline: '南渡乌江、威逼贵阳', text: '此后，中央红军南渡乌江、威逼贵阳，继而向云南机动。' },
    media: null,
  },
  {
    unique_id: 'event-1935-05-jinshajiang',
    group: 'tuichu',
    start_date: { year: 1935, month: 5, day: null, display_date: '1935年5月初' },
    text: { headline: '巧渡金沙江', text: '并于5月初巧渡金沙江，逐步跳出敌军的包围。' },
    media: null,
  },
  {
    unique_id: 'event-1935-10-shanbei',
    group: 'shengli',
    start_date: { year: 1935, month: 10, day: null, display_date: '1935年10月' },
    text: { headline: '到达陕北', text: '中央红军到达陕北。' },
    media: null,
  },
  {
    unique_id: 'event-1936-10-huishi',
    group: 'huishi',
    start_date: { year: 1936, month: 10, day: null, display_date: '1936年10月' },
    text: { headline: '三大主力会师', text: '红军三大主力会师，长征胜利结束。' },
    media: null,
  },
]);

/**
 * 浏览器全局接口：与历史地图数据（globalThis.ChishuiMapData）同为「window 上的
 * 历史数据全局」，供时间线渲染与 Phase 3 地图共用。因 package.json 为 "type":
 * "module" 且 tests/story.test.js 依赖 ES module 导出，本文件以 ESM 方式在浏览器
 * 加载（<script type="module">），无法同时是 classic script——详见 Phase 2 报告。
 */
globalThis.ChishuiHistory = Object.freeze({
  sources,
  chapters,
  epilogue,
  eras,
  timeline,
});
