/* Canonical historical facts. Loads as a classic script and as an ESM side effect.
 * Dates are ISO 8601 [start, end]; the sources do not establish precise times
 * for all crossings. Geometry and modern coordinate references live in map data.
 */
(() => {
  'use strict';
  function deepFreeze(value) {
    for (const child of Object.values(value)) {
      if (child !== null && typeof child === 'object') deepFreeze(child);
    }
    return Object.freeze(value);
  }
  const sources = [
  {
    "id": "xinhua-2016",
    "title": "【镜头·长征路上】四渡赤水出奇兵",
    "url": "https://www.news.cn/politics/2016-10/02/c_129309668.htm",
    "publisher": "新华网（来源：中央纪委监察部网站）"
  },
  {
    "id": "dswxyjy-2026",
    "title": "四渡赤水，以少胜多的光辉典范",
    "url": "https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html",
    "publisher": "中共中央党史和文献研究院网站（来源：《光明日报》）"
  }
];
  const chapters = [
  {
    "id": 1,
    "date": "1935年1月29日拂晓",
    "dateISO": [
      "1935-01-29",
      "1935-01-29"
    ],
    "title": "一渡：从土城撤出",
    "situation": "遵义会议后，中央红军原拟北渡长江。土城战斗未能取得预期战果，继续在这里作战面临被堵追的危险。",
    "action": "中央红军调整行动，从土城、元厚等渡口西渡赤水河，向川南转移。",
    "result": "红军脱离土城一带的堵追，随后到达川滇边的扎西地区，并进行整编。",
    "crossings": [
      "土城",
      "元厚"
    ],
    "direction": "west",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "theme": "先脱离堵追",
    "actionHeading": "从土城、元厚等渡口西渡",
    "resultHeading": "脱离土城一带的堵追",
    "mapStage": {
      "summary": "土城、猿猴场（今元厚）地区分路西渡，向川南机动，随后在扎西地区集中。连线概括阶段顺序，不是1月29日当天全程。",
      "destination": "扎西地区",
      "chronology": "1月29日西渡；2月上旬向扎西集中。",
      "historicalText": "土城南北、猿猴场（今元厚）地区西渡，向川南转移，随后在川滇边扎西地区集中。"
    }
  },
  {
    "id": 2,
    "date": "1935年2月18—21日",
    "dateISO": [
      "1935-02-18",
      "1935-02-21"
    ],
    "title": "二渡：重返黔北",
    "situation": "敌军被吸引到川滇边境，黔北兵力相对空虚；川滇敌军又向扎西逼近，北渡长江的计划暂缓执行。",
    "action": "中央红军从太平渡、二郎滩等渡口东渡赤水河，回师黔北，向桐梓方向前进。",
    "result": "红军随后攻取桐梓、娄山关，再占遵义，取得遵义战役的胜利。",
    "crossings": [
      "太平渡",
      "二郎滩"
    ],
    "direction": "east",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "theme": "回到黔北寻找战机",
    "actionHeading": "从太平渡、二郎滩等渡口东渡",
    "resultHeading": "攻取桐梓、娄山关，再占遵义",
    "mapStage": {
      "summary": "自扎西东返，在太平渡、二郎滩、九溪口等渡口分路东渡；继而经桐梓、娄山关至遵义。渡口并列，不表示依次经过。",
      "destination": "遵义地区",
      "chronology": "2月18—21日东渡；24日桐梓，25—26日娄山关战斗，28日再占遵义。",
      "historicalText": "太平渡、二郎滩、九溪口等分路东渡；2月24日桐梓，25—26日娄山关战斗，28日再占遵义。"
    }
  },
  {
    "id": 3,
    "date": "1935年3月16—17日",
    "dateISO": [
      "1935-03-16",
      "1935-03-17"
    ],
    "title": "三渡：再向河西",
    "situation": "遵义战役后，敌军重新组织围攻，企图把中央红军围在遵义、鸭溪一带。红军需要跳出新的合围。",
    "action": "中央红军转兵西进，从茅台及其附近地区西渡赤水河，再入川南，寻求新的机动。",
    "result": "敌方判断红军又要北渡长江，调动重兵围堵，敌军再次向赤水河以西地区集中。",
    "crossings": [
      "茅台"
    ],
    "direction": "west",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "theme": "转向河西，寻求机动",
    "actionHeading": "从茅台及其附近地区西渡",
    "resultHeading": "敌军再次向河西集中",
    "mapStage": {
      "summary": "由遵义地区向西，经茅台及附近西渡，再向川南镇龙山、大村、铁厂等地区机动。终点标宽泛机动区，不指古蔺县城。",
      "destination": "川南机动区（概略）",
      "chronology": "3月16—17日西渡；随后在川南地区机动。",
      "historicalText": "遵义地区西进，茅台及附近西渡，再向镇龙山、大村、铁厂等川南地区机动。“川南机动区”是宽泛区域，不表示进入古蔺县城。"
    }
  },
  {
    "id": 4,
    "date": "1935年3月21—22日",
    "dateISO": [
      "1935-03-21",
      "1935-03-22"
    ],
    "title": "四渡：折返东岸",
    "situation": "敌军再次向赤水河以西地区集中。中央红军决定隐蔽、迅速地折返东岸，争取新的机动机会。",
    "action": "中央红军从太平渡、二郎滩、九溪口等渡口东渡赤水河，随后迅速转向南方。",
    "result": "红军重回黔北并向南行动。之后的南渡乌江、威逼贵阳、巧渡金沙江，继续改变了围追堵截的局面。",
    "crossings": [
      "太平渡",
      "二郎滩",
      "九溪口"
    ],
    "direction": "east",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "theme": "折返东岸，迅速南下",
    "actionHeading": "从太平渡、二郎滩、九溪口等渡口东渡",
    "resultHeading": "继续改变围追堵截的局面",
    "mapStage": {
      "summary": "从川南折返，经太平渡、二郎滩、九溪口等渡口东渡，随后向南。南渡乌江属于之后的行动，主线不在遵义城结束。",
      "destination": "向南机动",
      "chronology": "3月21—22日东渡；3月31日南渡乌江是后续行动。",
      "historicalText": "从川南折返，经太平渡、二郎滩、九溪口等东渡，随后向南；3月31日南渡乌江属于后续行动。"
    }
  }
];
  const eras = [
  {
    "id": "changzheng",
    "title": "长征开始",
    "start_date": {
      "year": 1934,
      "month": 10,
      "day": null,
      "display_date": "1934年10月"
    },
    "end_date": {
      "year": 1935,
      "month": 1,
      "day": null,
      "display_date": "1935年1月"
    },
    "display_date": "1934年10月—1935年1月",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "description": "中央红军开始长征。"
  },
  {
    "id": "sidu",
    "title": "四渡赤水",
    "start_date": {
      "year": 1935,
      "month": 1,
      "day": 29,
      "display_date": "1935年1月29日"
    },
    "end_date": {
      "year": 1935,
      "month": 3,
      "day": 22,
      "display_date": "1935年3月22日"
    },
    "display_date": "1935年1—3月",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "description": "四渡赤水，在川黔滇边机动作战。"
  },
  {
    "id": "tuichu",
    "title": "巧渡金沙江，跳出包围",
    "start_date": {
      "year": 1935,
      "month": 3,
      "day": 31,
      "display_date": "1935年3月31日"
    },
    "end_date": {
      "year": 1935,
      "month": 5,
      "day": null,
      "display_date": "1935年5月"
    },
    "display_date": "1935年3月末—5月",
    "sourceIds": [
      "dswxyjy-2026"
    ],
    "description": "巧渡金沙江，跳出包围。"
  },
  {
    "id": "shengli",
    "title": "到达陕北",
    "start_date": {
      "year": 1935,
      "month": 10,
      "day": null,
      "display_date": "1935年10月"
    },
    "end_date": {
      "year": 1935,
      "month": 10,
      "day": null,
      "display_date": "1935年10月"
    },
    "display_date": "1935年10月",
    "sourceIds": [
      "xinhua-2016"
    ],
    "description": "中央红军到达陕北。"
  },
  {
    "id": "huishi",
    "title": "三大主力会师",
    "start_date": {
      "year": 1936,
      "month": 10,
      "day": null,
      "display_date": "1936年10月"
    },
    "end_date": {
      "year": 1936,
      "month": 10,
      "day": null,
      "display_date": "1936年10月"
    },
    "display_date": "1936年10月",
    "sourceIds": [
      "xinhua-2016",
      "dswxyjy-2026"
    ],
    "description": "红军三大主力会师，长征胜利结束。"
  }
];
  const epilogue = {
  "title": "渡过赤水，路还在前方",
  "body": "四渡赤水结束，不等于长征结束，也不意味着红军在渡河当天就完全摆脱了所有围堵。此后，中央红军南渡乌江、威逼贵阳，继而向云南机动，并于5月初巧渡金沙江，逐步跳出敌军的包围。",
  "sectionTitle": "山河为证",
  "paragraphs": [
    "四渡赤水中，中央红军灵活机动，由被动转向主动，粉碎了敌军在川黔滇边围歼红军的计划。",
    "这些转向并非预先排定的四步。土城战斗的结果、黔北兵力的变化，以及敌军新的围堵，都影响了后续行动。"
  ],
  "afterTitle": "继续南下，寻找出路",
  "actions": [
    "南渡乌江",
    "威逼贵阳",
    "巧渡金沙江"
  ]
};
  // Crossing timeline entries derive their dates, titles and results from chapters.
  // null media deliberately avoids attributing a photograph to a crossing.
  const timeline = [
    ...[
  {
    "unique_id": "event-1934-10-changzheng",
    "group": "changzheng",
    "start_date": {
      "year": 1934,
      "month": 10,
      "day": null,
      "display_date": "1934年10月"
    },
    "text": {
      "headline": "长征开始",
      "text": "中央红军开始长征。"
    },
    "media": null
  },
  {
    "unique_id": "event-1935-01-beidu",
    "group": "changzheng",
    "start_date": {
      "year": 1935,
      "month": 1,
      "day": null,
      "display_date": "1935年1月"
    },
    "text": {
      "headline": "遵义会议后原拟北渡长江 / 土城战斗",
      "text": "遵义会议后，中央红军原拟北渡长江。土城战斗未能取得预期战果。"
    },
    "media": null
  },
  {
    "unique_id": "event-1935-01-tucheng",
    "group": "changzheng",
    "start_date": {
      "year": 1935,
      "month": 1,
      "day": null,
      "display_date": "1935年1月"
    },
    "text": {
      "headline": "需要改变方向",
      "text": "继续在这里作战面临被堵追的危险。"
    },
    "media": null
  }
],
    ...chapters.map((chapter) => {
      const [year, month, day] = chapter.dateISO[0].split('-').map(Number);
      const suffix = ['yidu', 'erdu', 'sandu', 'sidu'][chapter.id - 1];
      return {
        unique_id: 'event-' + chapter.dateISO[0] + '-' + suffix,
        group: 'sidu',
        start_date: { year, month, day, display_date: chapter.date },
        text: { headline: chapter.title, text: chapter.result },
        media: null,
      };
    }),
    ...[
  {
    "unique_id": "event-1935-03-31-wujiang",
    "group": "tuichu",
    "start_date": {
      "year": 1935,
      "month": 3,
      "day": 31,
      "display_date": "1935年3月31日"
    },
    "text": {
      "headline": "南渡乌江、威逼贵阳",
      "text": "此后，中央红军南渡乌江、威逼贵阳，继而向云南机动。"
    },
    "media": null
  },
  {
    "unique_id": "event-1935-05-jinshajiang",
    "group": "tuichu",
    "start_date": {
      "year": 1935,
      "month": 5,
      "day": null,
      "display_date": "1935年5月初"
    },
    "text": {
      "headline": "巧渡金沙江",
      "text": "并于5月初巧渡金沙江，逐步跳出敌军的包围。"
    },
    "media": null
  },
  {
    "unique_id": "event-1935-10-shanbei",
    "group": "shengli",
    "start_date": {
      "year": 1935,
      "month": 10,
      "day": null,
      "display_date": "1935年10月"
    },
    "text": {
      "headline": "到达陕北",
      "text": "中央红军到达陕北。"
    },
    "media": null
  },
  {
    "unique_id": "event-1936-10-huishi",
    "group": "huishi",
    "start_date": {
      "year": 1936,
      "month": 10,
      "day": null,
      "display_date": "1936年10月"
    },
    "text": {
      "headline": "三大主力会师",
      "text": "红军三大主力会师，长征胜利结束。"
    },
    "media": null
  }
],
  ];
  globalThis.ChishuiHistory = deepFreeze({ sources, chapters, eras, timeline, epilogue });
})();
