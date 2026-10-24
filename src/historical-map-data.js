/* Original generalized map, CC BY-SA 4.0. Modern references are not 1935 fords.
   Sources read 2026-10-23; no OSM geometry or copyrighted atlas image is used. */
(() => {
  'use strict';
  const sources = {
    geodata: {
      name: '维基百科贡献者 / GeoData（2026-10-23）',
      url: 'https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&titles=土城镇_(习水县)|元厚镇|太平镇_(古蔺县)|二郎镇_(古蔺县)|茅台镇|遵义市|扎西镇&colimit=max&redirects=1&meta=siteinfo&siprop=rightsinfo',
      license: 'https://creativecommons.org/licenses/by-sa/4.0/'
    },
    wikidata: {
      name: 'Wikidata / P625（2026-10-23，precision:null）',
      url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=Q531259|Q1342169|Q1200607|Q109350269&props=claims|labels&languages=zh',
      license: 'https://creativecommons.org/publicdomain/zero/1.0/'
    },
    history: [
      'https://www.zggzswdsyjs.cn/yjddesdslzk/202210/t20221017_76757074.html',
      'https://www.dswxyjy.org.cn/BIG5/n1/2026/0930/c244516-40808291.html',
      'https://www.cac.gov.cn/2016-08/22/c_1119430867.htm',
      'http://scdfz.sc.gov.cn/ztzl/hjczzsc/zztp/hjzzzlz/content_20517',
      'https://zyhc.gov.cn/hmzc/rwhc/lyjd/201906/t20190612_2682987.html',
      'https://mwr.guizhou.gov.cn/gzdt/tzgg/gggs/201609/t20160912_75234920.html'
    ],
    license: 'https://creativecommons.org/licenses/by-sa/4.0/'
  };
  const reference = (name, lat, lon, source, note = '') => ({
    name, latlon: [lat, lon], source, precision: 'modern-reference', note
  });
  const places = {
    yuanhou: reference('元厚', 28.36793, 105.93496, 'geodata', '今元厚镇，1935年猿猴场；镇点不等于渡河点'),
    tucheng: reference('土城', 28.28377, 105.99306, 'geodata', '一渡包括土城南北地区'),
    taiping: reference('太平', 28.13949, 106.03787, 'geodata', '地方志称渡口距镇政府1.8千米'),
    erlang: reference('二郎', 28.14908, 106.17013, 'geodata', '地方志称二郎滩渡口距镇政府550米'),
    maotai: reference('茅台', 27.85453, 106.36753, 'geodata', '三渡在茅台及附近'),
    zaxi: reference('扎西', 27.84397, 105.04509, 'geodata', '今威信；代表集中地区的现代参照'),
    gulin: reference('古蔺', 28.04406, 105.8085, 'wikidata', 'Q1342169县实体点，不表示红军进入县城'),
    xishui: reference('习水', 28.31992, 106.20886, 'wikidata', 'Q531259县实体点'),
    tongzi: reference('桐梓', 28.13724, 106.82375, 'wikidata', 'Q1200607县实体点'),
    zunyi: reference('遵义', 27.7255, 106.9274, 'geodata', '现代城市点，不是1935年城心测点')
  };
  // Equirectangular regional drawing at ~28°N. Fixed north-up, no fake scale bar.
  function project([lat, lon]) {
    return [Number(((lon - 104.85) / 2.3 * 1000).toFixed(3)),
      Number(((29.05 - lat) / 1.65 * 820).toFixed(3))];
  }
  // These broad drawing areas are NOT absolute historical coordinates.
  const fords = {
    yuanhou: { name: '元厚渡河区', xy: [470, 345], radius: 25, reference: 'yuanhou' },
    tucheng: { name: '土城渡河区', xy: [497, 390], radius: 27, reference: 'tucheng' },
    taiping: { name: '太平渡一带', xy: [520, 458], radius: 26, reference: 'taiping' },
    erlang: { name: '二郎滩一带', xy: [575, 455], radius: 25, reference: 'erlang' },
    maotai: { name: '茅台渡河区', xy: [650, 600], radius: 28, reference: 'maotai' }
  };
  const relations = {
    jiuxikou: { name: '九溪口', latlon: null, stages: [2, 4], description: '九溪口在太平渡上游约5千米；无已核绝对坐标，仅作关系说明。' },
    loushan: { name: '娄山关（概略）', latlon: null, description: '桐梓南、遵义北的山地通道；2月25—26日战斗，未核定关口坐标。' }
  };
  const schematic = {
    approach: [550, 381], loushan: [875, 535], chuannan: [390, 430], south: [730, 770],
    westward: [250, 480], returnWest: [300, 540], eastward: [660, 430],
    fromZunyi: [770, 610], westMaotai: [540, 550], returnEast: [450, 470], afterFord: [640, 510]
  };
  const history = globalThis.ChishuiHistory;
  if (!history) throw new Error('Load history-data.js before historical-map-data.js');
  const stages = [
    { nodes: ['approach', 'ford:tucheng', 'westward', 'zaxi'], fords: ['yuanhou', 'tucheng'], focus: 'tucheng' },
    { nodes: ['zaxi', 'returnWest', 'ford:taiping', 'eastward', 'tongzi', 'loushan', 'zunyi'], fords: ['taiping', 'erlang'], focus: 'taiping' },
    { nodes: ['zunyi', 'fromZunyi', 'ford:maotai', 'westMaotai', 'chuannan'], fords: ['maotai'], focus: 'maotai' },
    { nodes: ['chuannan', 'returnEast', 'ford:taiping', 'afterFord', 'south'], fords: ['taiping', 'erlang'], focus: 'taiping' }
  ].map((geometry, index) => ({
    ...geometry, ...history.chapters[index].mapStage
  }));
  const river = {
    // Original broad course constrained by town order and documented relations;
    // intervening bends are illustrative, not surveyed riverbank geometry.
    points: [[445, 220], [455, 290], [470, 345], [497, 390], [490, 425], [520, 458], [575, 455], [610, 510], [650, 600], [720, 720], [760, 820]],
    notice: '原创概化赤水河：参考现代地点方位及茅台在二郎上游等史料关系；未取得测绘河线，不表示真实河湾。源出镇雄，下游在合江入长江。'
  };
  const detail = [
    { viewBox: [365, 280, 290, 230], points: [[555, 391], [497, 390], [439, 390]] },
    { viewBox: [425, 365, 270, 215], points: [[475, 480], [520, 458], [625, 490]] },
    { viewBox: [545, 510, 240, 190], points: [[720, 610], [650, 600], [590, 580]] },
    { viewBox: [425, 365, 270, 215], points: [[475, 480], [520, 458], [625, 490]] }
  ];
  function node(id) {
    if (places[id]) return project(places[id].latlon);
    if (id.startsWith('ford:') && fords[id.slice(5)]) return fords[id.slice(5)].xy;
    if (schematic[id]) return schematic[id];
    throw new Error(`Unknown map node: ${id}`);
  }
  const path = (points) => points.map((xy, i) => `${i ? 'L' : 'M'}${xy.join(' ')}`).join('');
  function geometry(number, mode) {
    const stage = stages[number - 1];
    if (!stage) throw new Error(`Unknown chapter: ${number}`);
    if (!['overview', 'detail'].includes(mode)) throw new Error(`Unknown map view: ${mode}`);
    const points = mode === 'overview' ? stage.nodes.map(node) : detail[number - 1].points;
    return { points, path: path(points), start: points[0],
      viewBox: mode === 'overview' ? [0, 220, 1000, 600] : detail[number - 1].viewBox,
      notice: mode === 'overview' ? '阶段行军概括连线' : '代表渡河段；只示一处过河方向，不是本阶段全程，也不串联多个渡口。' };
  }
  const terrain = {"source":"Open-Meteo elevation API/Copernicus GLO-90","url":"https://api.open-meteo.com/v1/elevation?latitude=29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C29.05%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.84375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.6375%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.43125%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.225%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C28.01875%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.8125%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.60625%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4%2C27.4&longitude=104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15%2C104.85%2C105.105556%2C105.361111%2C105.616667%2C105.872222%2C106.127778%2C106.383333%2C106.638889%2C106.894444%2C107.15","bbox":[104.85,27.4,107.15,29.05],"columns":10,"rows":9,"elevations":[317.0,277.0,264.0,397.0,210.0,217.0,713.0,286.0,814.0,1238.0,415.0,334.0,227.0,331.0,325.0,736.0,526.0,1042.0,944.0,1115.0,330.0,316.0,350.0,527.0,758.0,1089.0,1289.0,700.0,811.0,1529.0,380.0,347.0,301.0,802.0,766.0,1310.0,766.0,1462.0,881.0,945.0,740.0,1240.0,572.0,1290.0,1144.0,1066.0,1155.0,1197.0,1550.0,1497.0,597.0,989.0,885.0,1219.0,854.0,1085.0,619.0,724.0,1061.0,1147.0,1304.0,1426.0,1322.0,1373.0,1299.0,1014.0,807.0,1195.0,947.0,913.0,1746.0,1598.0,1375.0,1088.0,1186.0,1120.0,1255.0,957.0,852.0,811.0,1845.0,1613.0,1706.0,1531.0,1737.0,1507.0,989.0,783.0,972.0,1026.0],"notice":"10×9点粗采样，双线性插值与低饱和晕渲修改；不是90米分辨率地图，也非1935年地表复原。","license":"https://creativecommons.org/licenses/by/4.0/","attribution":"Open-Meteo / Copernicus GLO-90; read 2026-10-23"};
  globalThis.ChishuiMapData = { places, fords, relations, stages, river, terrain, sources, project, node, path, geometry };
})();
