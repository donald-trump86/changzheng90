const e = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const plates = {
  'zunyi-meeting': { width: 1536, height: 1024, widths: [480, 960, 1536] },
  'mao-command-portrait': { width: 1536, height: 1024, widths: [480, 960, 1536] },
  'mao-mountain-poem': { width: 1024, height: 1536, widths: [480, 768, 1024] },
  'march-mountains-banner': { width: 2172, height: 724, widths: [720, 1440, 2172] },
  'chishui-river-landscape': { width: 1536, height: 1024, widths: [480, 960, 1536] },
};
const artNote = 'AI生成木刻艺术插画；人物、陈设与山河为艺术构图，不是历史照片或现场复原。';
function picture(id, alt, sizes = '(min-width: 901px) 50vw, calc(100vw - 40px)') {
  const plate = plates[id];
  const fallback = plate.widths[1];
  return `<picture><source type="image/webp" srcset="${plate.widths.map(width => `./public/images/${id}-${width}.webp ${width}w`).join(', ')}" sizes="${sizes}"><img src="./public/images/${id}-${fallback}.webp" alt="${e(alt)}" width="${plate.width}" height="${plate.height}" loading="lazy" decoding="async"></picture>`;
}
function figure(id, alt, caption, className = '', sizes) {
  return `<figure class="woodcut-plate ${className}"><div class="woodcut-window" data-woodcut-reveal>${picture(id, alt, sizes)}</div><figcaption>${e(caption)}<span>${artNote}</span></figcaption></figure>`;
}
const incision = `<svg class="woodcut-incision" viewBox="0 0 1200 38" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 122 13 293 20 454 7 593 16 742 10 916 20 1069 8 1200 13 1200 23 1048 18 912 29 735 20 589 26 439 16 289 29 121 22 0 28Z"/></svg>`;

/** Build-time component: all copy and shared route geometry remain readable without JavaScript. */
export function renderMaoExhibition(mapData) {
  const prologue = `<section id="zunyi" class="mao-exhibition zunyi-scene" aria-labelledby="zunyi-title">
      ${incision}
      <div class="zunyi-opening">
        <header class="zunyi-heading"><h2 id="zunyi-title">遵义会议</h2><p class="woodcut-subtitle">在危局中寻找新的方向</p><p class="woodcut-date"><time datetime="1935-01-15">1935年1月15日—17日</time><span>贵州遵义</span></p><a class="woodcut-text-link" href="#zunyi-account">走进这场转折</a></header>
        ${figure('zunyi-meeting', '原创木刻：旧式木屋中，中央领导集体围桌讨论，窗外是群山与山城。', '遵义会议的艺术意象：在共同讨论中寻找出路。', 'zunyi-plate', '(min-width: 901px) 64vw, calc(100vw - 40px)')}
      </div>
      <div id="zunyi-account" class="zunyi-account">
        <p>第五次反“围剿”失利，长征初期又遭受严重损失。1935年1月，中央红军进入遵义，迫切需要回答：下一步，往哪里走，又该怎样打？</p>
        <div><p>1月15日至17日，中共中央政治局扩大会议在遵义召开，总结军事教训，讨论军事与组织问题。会议增选毛泽东为中央政治局常委；此后，他在军事指挥中的作用逐步加强。</p><p>遵义会议是理解四渡赤水的关键入口。领导安排的调整、战略方向的选择，还要在接下来的行军与战斗中继续展开。</p></div>
      </div>
      <ul class="zunyi-questions" aria-label="遵义会议的主要议题"><li>总结军事教训</li><li>调整领导安排</li><li>寻找新的战略方向</li></ul>
      <div class="zunyi-departure"><h3>走出遵义，走向赤水</h3><ol><li><time datetime="1935-01-19">1月19日</time><p>军委纵队离开遵义，向赤水地域挺进。</p></li><li><time datetime="1935-01-28">1月28日</time><p>土城战斗未获预期战果，原有行动计划随之调整。</p></li><li><time datetime="1935-01-29">1月29日拂晓</time><p>中央红军从土城、猿猴场等地区西渡赤水。</p></li></ol><a class="woodcut-text-link" href="#exhibition-sources">查阅会议与行军史料</a></div>
    </section>`;

  const verses = [
    ['其一', '山，', '快马加鞭未下鞍。', '惊回首，', '离天三尺三。'],
    ['其二', '山，', '倒海翻江卷巨澜。', '奔腾急，', '万马战犹酣。'],
    ['其三', '山，', '刺破青天锷未残。', '天欲堕，', '赖以拄其间。'],
  ];
  const poems = `<section id="mountain-poems" class="mao-exhibition mountain-poems" aria-labelledby="mountain-poems-title">
      <header class="poems-heading"><div><h2 id="mountain-poems-title">十六字令三首</h2><p class="woodcut-subtitle">山与长征的精神意象</p></div><p>群山高峻，起伏如潮。《十六字令三首》把山的雄姿与人的气魄写在一起，让长征途中迎难向前的身影，留在寥寥数语之间。</p></header>
      <div class="poems-layout">
        ${figure('mao-mountain-poem', '原创竖幅木刻：群山层叠，长征时期的毛泽东与行军者沿山间小径向前。', '山高路远，脚步仍向前。', 'poems-plate', '(min-width: 901px) 46vw, (min-width: 600px) 65vw, calc(100vw - 40px)')}
        <div class="poems-text">${verses.map(([name, ...lines], index) => `<article class="mountain-verse" aria-labelledby="verse-${index + 1}-title"><h3 id="verse-${index + 1}-title">${name}</h3><blockquote cite="http://zt.txssw.com/libmzdwk/shicijianshang/17171.html"><p>${lines.map(line => `<span>${line}</span>`).join('')}</p></blockquote></article>`).join('')}<p class="poems-attribution">毛泽东《十六字令三首》<br>长征途中所作（1934—1935年）</p></div>
      </div>
      <div class="poems-return"><h3>从诗中的群山，回到战局</h3><p>遵义会议后，中央红军原拟北渡长江；土城战斗未获预期战果，行军方向随之调整。1月29日拂晓，红军西渡赤水，在重围中寻找新的机动。</p><p class="woodcut-small">这里是文学意象的插章，展陈顺序不表示三首词写于遵义至土城之间。<a href="#exhibition-sources">诗词原文与出处</a></p><a class="woodcut-text-link" href="#crossing-one">进入一渡赤水</a></div>
      ${incision}
    </section>`;

  const routeNames = ['一渡·西渡', '二渡·东渡', '三渡·西渡', '四渡·东渡'];
  const routes = [1, 2, 3, 4].map(number => `<path class="command-route" data-command-route="${number}" d="${e(mapData.geometry(number, 'overview').path)}"><title>${routeNames[number - 1]}</title></path>`).join('');
  const labels = [['tucheng', 438, 330], ['zaxi', 125, 690], ['maotai', 660, 654], ['zunyi', 820, 735], ['taiping', 410, 494]].map(([id, x, y]) => {
    const [cx, cy] = mapData.node(id);
    return `<circle cx="${cx}" cy="${cy}" r="9"/><text x="${x}" y="${y}">${e(mapData.places[id].name)}${id === 'taiping' ? '渡' : ''}</text>`;
  }).join('');
  const command = `<section id="mao-command" class="mao-exhibition command-exhibition" aria-labelledby="mao-command-title">
      ${incision}
      <div class="command-entrance">
        ${figure('mao-command-portrait', '原创木刻：长征时期的毛泽东半身像，目光沉静，身旁是群山与朱红河流。', '毛泽东与山河：一幅关于判断与行动的木刻。', 'command-portrait')}
        <header><h2 id="mao-command-title"><span>毛泽东</span><span>与四渡赤水</span></h2><p class="woodcut-subtitle">在运动中争取主动</p><p>一条河，渡了四次。每一次改变方向，都面对新的敌情与新的选择。</p><p>遵义会议后，毛泽东在中央红军军事指挥中逐步发挥重要作用。与中央其他领导和红军指挥员一道，他在复杂局势中判断、调整，寻找新的行动空间。</p><a class="woodcut-text-link" href="#command-strategy">读懂四次转向</a></header>
      </div>
      <section class="command-context" aria-labelledby="command-context-title"><div class="command-context-heading"><h3 id="command-context-title">从遵义到赤水</h3><p>军事领导的调整，有一个逐步展开的过程。</p></div><dl class="command-timeline"><div><dt><time datetime="1935-01-15">1月15—17日</time><strong>进入中央领导核心</strong></dt><dd>遵义会议增选毛泽东为中央政治局常委。</dd></div><div><dt><span>会后分工</span><strong>参与军事指挥</strong></dt><dd>毛泽东成为周恩来在军事指挥上的帮助者；张闻天代替博古负总的责任。</dd></div><div><dt><time datetime="1935-03-04">3月4日</time><strong>担任前敌政治委员</strong></dt><dd>设立前敌司令部，朱德任前敌司令员，毛泽东任前敌政治委员。</dd></div><div><dt><span>3月中旬</span><strong>三人军事指挥小组</strong></dt><dd>毛泽东、周恩来、王稼祥组成三人军事指挥小组，负责全军军事行动。</dd></div></dl><p class="woodcut-small command-collective">三人军事指挥小组成立于二渡之后、三渡之前；不能把它提前到遵义会议期间或一渡之前。<a href="#exhibition-sources">查看成立时间考证</a></p></section>
      ${figure('march-mountains-banner', '原创横幅木刻：红军行军队伍穿行山岭，远处朱红河流在群山间转折。', '山岭间的队伍与河流。', 'command-march', '(min-width: 1440px) 1328px, calc(100vw - 40px)')}
      <section id="command-strategy" class="command-strategy" aria-labelledby="command-strategy-title"><header><h3 id="command-strategy-title">何以四渡？</h3><p class="woodcut-subtitle">胜负不在一条既定的行军路线上。</p></header><div class="command-strategy-layout"><div class="command-map-sticky"><nav class="command-strategy-nav" aria-label="阅读指挥艺术的三个切面"><a href="#strategy-judge" data-strategy-choice="judge" aria-current="true">审时度势</a><a href="#strategy-divert" data-strategy-choice="divert">调动敌军</a><a href="#strategy-initiative" data-strategy-choice="initiative">争取主动</a></nav><figure class="command-map" data-command-map data-strategy="judge"><svg viewBox="0 220 1000 600" role="img" aria-labelledby="command-map-title command-map-description"><title id="command-map-title">四渡赤水行动方向概化图</title><desc id="command-map-description">与前文共用地图数据，展示一渡西行、二渡东返、三渡再西、四渡再东与南下的方向关系。不是精确行军轨迹。</desc><path class="command-river" d="${e(mapData.path(mapData.river.points))}"/><g class="command-map-routes">${routes}</g><g class="command-map-places">${labels}<text x="650" y="280">赤水河</text><text x="25" y="280">北 ↑</text></g></svg><figcaption><strong data-strategy-caption>一渡西行，二渡东返</strong><span>路线与前文共用概化数据；朱红表示当前讨论的行动，灰线保留前后关系，不表示兵力部署或精确测绘。</span><a href="#map-method">地图依据与许可</a></figcaption></figure></div><div class="command-decisions"><article id="strategy-judge" data-strategy-scene="judge"><h4>审时度势</h4><p class="decision-lead">原有计划，随战场实际而改变。</p><p>土城战斗未获预期战果后，中央红军西渡赤水，向扎西地区机动。敌情变化之际，毛泽东等又把目光转回黔北。</p><p>二渡赤水，回师东进；随后攻取桐梓、娄山关，再占遵义。方向的调整，是为了在实际局势中寻找战机。</p></article><article id="strategy-divert" data-strategy-scene="divert"><h4>调动敌军</h4><p class="decision-lead">让对方的判断，追随自己的变化。</p><p>三渡赤水后，红军再入川南。敌军随之向河西集中，红军主力却迅速折返，四渡赤水，重新回到东岸。</p><p>西去与东返，既是位置的变化，也影响着敌军判断与兵力调动，为继续南下争取空间。</p></article><article id="strategy-initiative" data-strategy-scene="initiative"><h4>争取主动</h4><p class="decision-lead">每一次机动，都为下一步创造条件。</p><p>四渡之后，中央红军转而南下，南渡乌江、威逼贵阳，再向云南机动，最终于5月初渡过金沙江。</p><p>主动并非渡河瞬间就全部到手，而是在接连的判断与行动中逐步争取。</p></article></div></div></section>
      <section class="command-theme full-bleed" aria-labelledby="command-theme-title"><div class="command-theme-inner"><div class="command-theme-copy"><h3 id="command-theme-title"><span data-theme-line>不是“用兵如神”</span><span data-theme-line>而是“神在用兵”</span></h3><p>这里的“神”，是对战略判断、灵活机动和因势而变的指挥艺术的文学概括。</p><p>高超的指挥艺术，不意味着预知一切。它是在复杂多变的战场上不断判断、调整、行动，从变化中寻找主动。</p><p class="woodcut-small">本专题创作性主题文案，非毛泽东原话。</p></div><div class="command-theme-art" data-theme-art>${picture('mao-command-portrait', '人物与山河融合的原创木刻，强调沉静思考与行军方向的变化。')}<svg class="command-red-thread" viewBox="0 0 600 100" aria-hidden="true"><path d="M0 56C75 88 101 12 177 46S265 96 334 50 438 3 487 46 557 77 600 30"/></svg><p class="woodcut-small">AI生成木刻艺术插画</p></div></div></section>
      <section class="command-outro" aria-labelledby="command-outro-title"><div class="command-outro-heading"><h3 id="command-outro-title">从赤水河到金沙江</h3><p>四渡结束，行军仍在继续。此后的南渡乌江、威逼贵阳与巧渡金沙江，把新的方向一步步变成现实。</p></div>${figure('chishui-river-landscape', '原创山河木刻：朱红河流穿过层叠峡谷，向远山延伸。', '赤水与远山的艺术意象，不作金沙江地貌复原。', 'command-landscape', '(min-width: 1440px) 1328px, calc(100vw - 40px)')}<div class="command-last-words"><p>山河之间，行军路线不断改变。</p><p>改变的不只是方向，<br class="outro-mobile-break">还有战场上的主动与被动。</p></div></section>
      <details id="exhibition-sources" class="exhibition-sources"><summary>专题史料、诗词与艺术创作说明</summary><div><h3>领导调整与行动次序</h3><p>遵义会议为1935年1月15—17日；1月19日军委纵队离开遵义，1月28日土城战斗，1月29日拂晓一渡。军事领导安排逐步调整，不能将整个过程写成一人独自作出全部决策。</p><p>三人军事指挥小组正文采用“3月中旬”。下列军网与人民网材料支持3月12日、苟坝的考证，处于二渡与三渡之间。</p><ul><li><a href="http://www.81.cn/yw_208727/16459284.html" target="_blank" rel="noopener noreferrer">中国军网／《解放军报》：四渡赤水期间的重要会议</a></li><li><a href="http://dangshi.people.com.cn/BIG5/n1/2016/0715/c85037-28556165.html" target="_blank" rel="noopener noreferrer">人民网：《三人军事指挥小组探源》</a>（可读的繁体同篇）</li><li><a href="https://www.dswxyjy.org.cn/n1/2026/1012/c462662-40812896.html" target="_blank" rel="noopener noreferrer">党史和文献研究院：遵义会议实现伟大的历史转折</a>（来源《中国共产党简史》）</li></ul><h3>诗词原文</h3><p><a href="http://zt.txssw.com/libmzdwk/shicijianshang/17171.html" target="_blank" rel="noopener noreferrer">韶山毛泽东图书馆：《十六字令 三首》</a>，作品标注1934—1935年。三首全文保持原文，展陈位置不推定具体创作地点或日期。</p><h3>木刻画面的性质</h3><p>五幅木刻为本项目通过图像生成工具制作的原创构图，以1930年代新兴木刻语言呈现历史与文学意象。它们不是历史照片，不据画面指认与会者座次、人物动作、服装细节、行军地点或真实河湾。正式文字均由网页排版。</p><p>“不是‘用兵如神’，而是‘神在用兵’”为本专题创作性主题文案，不是史料引语或毛泽东原话。地图沿用本项目概化数据与<a href="#map-method">CC BY-SA 4.0等来源说明</a>；图片、字体与配乐分别适用各自来源说明。</p></div></details>
    </section>`;
  return { 'zunyi-prologue': prologue, 'mountain-poems': poems, 'mao-exhibition': command };
}
