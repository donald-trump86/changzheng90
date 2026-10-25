# Responsive Crossings Implementation Plan

> **执行方式：** 用户已审核通过，由本会话按Native模式实施；未委派子代理。

**Goal:** 修复手机和短屏上的四渡阅读、深链接与滚动跳动，让长征背景始终对应完整四渡总览；史实出处、参考图像及音乐等补充信息默认收起，由用户手动展开。

**Architecture:** 构建时从既有地图数据生成独立总览和四张章节简图。桌面只保留一个固定位置的交互地图；手机用普通文档流阅读并可展开完整地图。统一程序化滚动入口，桌面精细指针按条件使用Lenis，触摸和失败场景保留原生。

**Tech Stack:** Node.js >=22、原生HTML/CSS/ES modules、SVG、既有Anime.js 4.5.0、自托管Lenis 1.3.27、Node test runner、专用Brave MCP。

**Spec:** [四渡赤水滚动与移动端地图设计](../specs/2026-10-25-responsive-crossings-design.md)。执行者须先读设计和本计划。

本计划的方案B已获用户批准并按Native模式完成实施。源码已推送，现有GitHub Pages已构建本轮产物；自定义域名的自动访问遇Cloudflare验证页，公开页面浏览器验收尚待完成。实际执行范围见[验证记录](../../verification.md)，发布提交见[部署说明](../../deployment.md)。

## Global Constraints

- Node.js >=22；不迁移框架，不引入Three.js，不增加第二个live地图实例。
- 历史文案来自现有history数据，几何来自现有map数据；不补坐标、历史断言、素材或署名。
- 宽屏以 `min-width: 901px` 为准；固定模式还需视口高度至少600px且固定单元实测能装下。否则普通流并显示章节简图。
- 正文至少16px，操作至少44×44px；沿用纸墨、路线红和现有字体，不新增装饰卡片、玻璃或边框。
- 手机原生触摸，`syncTouch: false`；Lenis固定 `1.3.27`，MIT许可随资源保存，不自动换版本。
- 减少动态、暂停、隐藏页、模块加载失败与无脚本时，图文完整、导航可用、路线可见。配乐默认关闭。
- 保留区域总览、渡河细看、全部路线、重播、图像放大、键盘、真实hash和前进后退。
- 史实与图像出处、参考图像列表、音乐版权、地图完整依据用原生details默认折叠，桌面和手机一致；普通加载、被动滚动、切章和尺寸变化均不展开。正文与章节图、简短图注、音乐播放按钮保持可见，展开后保留完整来源、署名和许可。
- 静态图ID必须独立，不能复制live地图选择器；说明保留历史与现代地点区别、九溪口未落点、概化地图依据和CC BY-SA 4.0。
- 当前轮次不实施、不发布；审阅通过后的完整实施按项目既有发布授权处理，最新用户限制优先。

## Review Focus

1. 字体延迟、短横屏和900/901px临界宽度：标题落在阅读线之前，导航完成后不退回上一章（Task 2、3、4）。
2. 用户在深链接校正或1→4→2导航途中反向输入：最新意图生效，旧回调不回拉（Task 3）。
3. 页面隐藏、BFCache、媒体偏好变化及迟到的动态导入：无重复实例、监听或动画循环（Task 3、4）。
4. 新增SVG后全局选择器、marker、aria引用和版权说明：总览独立，简图不污染章节枚举或live地图（Task 1、2）。
5. 折叠交互图、字体放大和图像对话框内部滚动：主阅读可继续，控件不被裁掉，内部滚动不被Lenis截获（Task 2、3、4）。

## File Structure

| 文件 | 职责与改动 |
| --- | --- |
| 新建 `scripts/render-static-maps.mjs` | 纯字符串SVG渲染器，复用既有几何与历史元数据。 |
| [render-history.mjs](../../../scripts/render-history.mjs) | 将总览和分章图写入受管理HTML区域，保持幂等。 |
| [build.mjs](../../../scripts/build.mjs) | 同一VM载入history/map数据，传给渲染器；扩展发布白名单。 |
| [index.html](../../../index.html) | 分离背景区与章节区、固定地图DOM、统一导航入口及原生回退。 |
| [print-atlas.css](../../../src/print-atlas.css) | 响应式图文关系、单一锚点留白、控件与Lenis必要样式。 |
| [historical-map.css](../../../src/historical-map.css) | 静态图与紧凑live图的绘制样式和普通流说明。 |
| [historical-map.js](../../../src/historical-map.js) | 替换旧手机图面预算；不改变数据和单实例API。 |
| [history-scroll.js](../../../src/history-scroll.js) | 允许注入程序化滚动，保持章节选择与滚动机制分离。 |
| 新建 `src/page-scroll.js` | 唯一滚动入口、Lenis条件加载、中断和生命周期。 |
| [editorial-motion.js](../../../src/editorial-motion.js) | 折叠/隐藏时完成路线，移除地图操作附带的页面居中。 |
| 新建 `public/vendor/lenis-1.3.27.esm.js` 与 `public/vendor/lenis-1.3.27-LICENSE.txt` | 经版本与来源核对的上游发布物。 |
| 新建 `docs/vendor-provenance.md` | 精确版本、来源、MIT许可、大小和SHA-256实值。 |
| 现有Node测试、新建 `tests/static-maps.test.js` 与 `tests/page-scroll.test.js` | 几何、渲染、状态、滚动和清理的行为测试。 |
| [verify-browser.mjs](../../../scripts/verify-browser.mjs)、[verification.md](../../../docs/verification.md) | 单浏览器执行的实际布局/交互验证及记录。 |

## Task 1: 从既有数据生成独立总览与分章简图

**Files:** 新建 `scripts/render-static-maps.mjs`、`tests/static-maps.test.js`；修改 [render-history.mjs](../../../scripts/render-history.mjs)、[build.mjs](../../../scripts/build.mjs)、[index.html](../../../index.html)、[history-render.test.js](../../../tests/history-render.test.js)、[site.test.js](../../../tests/site.test.js)。

**Interfaces:**

- 消费现有 `ChishuiMapData.geometry(number, view)`、`ChishuiMapData.river`、`ChishuiMapData.stages` 与 `ChishuiHistory.chapters`。
- 产生 `renderStaticMap({ id, chapter = null, mapData, chapters }) -> string`。`chapter === null` 生成四渡总览；1—4生成对应detail几何。无效章节或缺少几何抛带输入标识的错误，不能静默输出第一渡。
- 将 `renderHistory(html, history)` 扩为 `renderHistory(html, history, mapData) -> string`；构建、CLI和测试调用一并更新。
- 输出总览 `figure.context-overview[data-static-map="overview"]`，四张图 `figure.chapter-map[data-static-map="1".."4"]`；所有ID以前缀 `id` 隔离，不输出live地图data属性。

- [x] **Step 1: 写行为测试。** 用现有VM方式载入history和map-data，直接比较既有几何，不复制路径常量：

```js
test('overview has four distinct canonical routes and chapter-independent semantics', () => {
  const html = renderStaticMap({ id: 'context-map', mapData, chapters });
  assert.equal((html.match(/data-static-route=/g) || []).length, 4);
  for (const n of [1, 2, 3, 4]) assert.ok(html.includes(mapData.geometry(n, 'overview').path));
  assert.ok(html.includes('四渡赤水总览'));
  assert.ok(!html.includes('id="route-map"') && !html.includes('id="current-route"'));
});
```

再断言四张局部图分别含本章detail路径、方向、日期、`不是本阶段全程`；总览与四图合并后title/desc/marker ID唯一、aria引用存在；无效章抛错。渲染测试保留章节、时间线、来源、转义和幂等检查，并增加五张图位置与内容检查。

- [x] **Step 2: 运行RED。** `node --test tests/static-maps.test.js tests/history-render.test.js`；预期新模块缺失或新结构断言失败，不应因fixture语法错误失败。
- [x] **Step 3: 实现渲染与构建调用。** 总览用overview几何，分章用detail几何；重用已有河道、渡口与地名，不加载新的地形图片。总览路径加不同dash与有序文字图例；分章图说明多个渡口代表渡河区域。HTML使用可重复替换的受管理区域，source与dist都生成完整图。不在浏览器动态创建这五张图。
- [x] **Step 4: 运行GREEN。** `node --test tests/static-maps.test.js tests/history-render.test.js tests/historical-map.test.js tests/story-map-consistency.test.js`；预期全部通过。再 `npm run build`，确认来源、四条总览路线和四章简图进入dist，第二次渲染完全相同。
- [x] **Step 5: 提交独立改动。** `git add scripts/render-static-maps.mjs scripts/render-history.mjs scripts/build.mjs index.html tests/static-maps.test.js tests/history-render.test.js tests/site.test.js`，然后 `git commit -m "feat: render independent overview and chapter maps"`。

## Task 2: 稳定图文结构、地图尺寸与补充信息展开

**Files:** 修改 [index.html](../../../index.html)、[print-atlas.css](../../../src/print-atlas.css)、[historical-map.css](../../../src/historical-map.css)、[historical-map.js](../../../src/historical-map.js)、[map-overview.test.js](../../../tests/map-overview.test.js)、[site.test.js](../../../tests/site.test.js)、[verify-browser.mjs](../../../scripts/verify-browser.mjs)。

**Interfaces:**

- 使用Task 1的五张静态图；保留 `ChishuiHistoricalMap.create()`、`setChapter(number, options)`、`setView(view)`、`setAllRoutes(on)` 和 `#route-map`、`#current-route` 的单实例语义。
- 新增结构 `section.context-layout`、`div.crossings-layout`、`details.map-explorer` 和后置 `details#map-method` 说明区。`details` 初始不带open；增强成功的宽屏模式只打开 `.map-explorer`，折叠入口有44px以上点击区。
- 补充项采用 `details#archives`、`details#source-history`、`details#audio-copyright` 与 `details#map-method`，均默认关闭。保留既有archives/audio-copyright锚点、原图放大入口和完整许可文字；史实与图像出处仍合为一项，不另建折叠框架。显式来源链接只打开对应details及所需祖先，再调用共用滚动入口；普通加载与被动事件不打开。
- 新增内部 `refreshMapLayout() -> void`：按媒体条件与实测高度切换 `data-map-layout="pinned" | "flow"`，不移动节点、不滚动页面；完成后派发既有 `chishui:layout`。

- [x] **Step 1: 写失败断言。** 在Node结构/地图fixture及浏览器checker中固定以下行为：

```js
assert.equal(document.querySelectorAll('#route-map').length, 1);
assert.equal(document.querySelectorAll('article.chapter-panel[data-chapter]').length, 4);
assert.equal(document.querySelector('.route-sheet').parentElement, originalParent);
assert.equal(document.querySelector('.route-sheet').nextSibling, originalNextSibling);
assert.equal(document.querySelector('.context-overview').outerHTML, initialOverview);
```

这些断言须在1→4→2、全部路线、区域/细看后仍成立。浏览器增加900px单列、901px可双列、1280×480普通流、字体放大导致固定单元超预算后退回flow。修改既有手机高度测试，使其检查完整固定单元而非只有canvas。

在现有结构测试中检查四个补充details默认无open、来源和许可全文仍存在；在浏览器检查初始内容隐藏、点击/Enter/Space开合、Tab可达与无脚本可用。逐项打开后再收起，切章、手滚、播放音乐和旋转均不得重开；点击档案原图/来源/曲目版权或进入对应深链接，只打开目标项并正确定位，图像放大及关闭后的焦点仍可用。

- [x] **Step 2: 运行RED。** `node --test tests/map-overview.test.js tests/site.test.js`，并在同一专用Brave运行checker的相应阶段；预期旧DOM搬运、响应式或高度断言失败。单任务串行使用浏览器，不新建客户端。
- [x] **Step 3: 调整布局与紧凑图。** 背景独立成两列/一列；四渡区宽屏正文左、地图右。移除旧命名区域覆盖、`placeRouteSheet()`、`scrollBy`补偿与899px分支。固定单元只含短标题、日期、必要控件、图面与短图注，长说明在四章之后正常滚动。手机及短屏显示局部简图，增强固定模式隐藏局部简图；无脚本默认仍显示。删除地图旧的手机图面强制高度，让图面宽高比与整个单元预算共同决定高度，窄图文字不强压到16px以下。
- [x] **Step 4: 处理展开与重排。** 宽屏增强时只对 `.map-explorer` 先打开details再隐藏summary；窄屏初始折叠、以后不因旋转自动收起。史实与图像出处、参考图像区、音乐版权、地图完整依据在所有尺寸均初始关闭；将原图、长图注及大图入口放进参考图像details，来源链接指向精确目标。使用原生summary和既有展开增强，不新增状态框架，不隐藏播放按钮、正文图或必要短图注。用单个ResizeObserver监测固定单元和视口变化，超预算就flow，不在其回调里改变文章顺序。同一视口尺寸、容器宽度与实际字号周期内，超预算退到flow后保持flow，直到这些输入变化再尝试固定，避免布局反过来改变测量而来回切换。仅在模式变化时写属性并派发既有 `chishui:layout` 通知。
- [x] **Step 5: 运行GREEN。** 上述Node测试通过；在390×844、768×1024、900×600、901×600、1280×480、1440×900测量列数、固定单元边界和DOM身份。展开/收起只产生用户可见的正常文档流变化；被动切章不导致补偿滚动。检查本文所列背景与章节截图后提交，提交信息 `fix: stabilize responsive crossing map layout`。

## Task 3: 统一导航、接入可降级的桌面Lenis

**Files:** 新建 `src/page-scroll.js`、`tests/page-scroll.test.js`、两个vendor文件及 `docs/vendor-provenance.md`；修改 [history-scroll.js](../../../src/history-scroll.js)、[history-scroll.test.js](../../../tests/history-scroll.test.js)、[index.html](../../../index.html)、[print-atlas.css](../../../src/print-atlas.css)、[build.mjs](../../../scripts/build.mjs)、[site.test.js](../../../tests/site.test.js)。

**Interfaces:**

- `getChapterScrollTop(element, win) -> number`：用当前rect与scrollY计算文档坐标，减去 `min(24, max(0, 0.45 * viewportHeight - 16))`，再夹到文档可滚动范围；优先使用可用的visualViewport高度。
- `createPageScroll({ win = window, loadLenis } = {}) -> { scrollTo, cancel, destroy }`。`loadLenis`注入返回模块的Promise以便测试；默认动态导入 `../public/vendor/lenis-1.3.27.esm.js`。
- `scrollTo(element, { immediate = false, onComplete, onCancel } = {}) -> void`；一次导航最多调用一次完成或取消回调。`cancel() -> void` 停止旧目标且不锁用户；`destroy() -> void` 幂等地清理所有资源。
- `createHistoryScroll({ ...existing, scrollTo } = {})` 接受可选同签名回调，返回值仍为 `{ select, refresh, destroy }`。未注入时保留原有原生回退与测试；注入后由完成/取消回调释放保持，使用导航token忽略旧回调。
- 内联 `navigateToChapter(number, { immediate = false } = {}) -> void` 是章节按钮、pager、初始深链和hash变化的唯一显式入口。被动 `activate()` 不调用它。

- [x] **Step 1: 写滚动行为测试。** 使用注入的假window与假Lenis，不在Node导入时访问真实document。断言短屏落点位于45%阅读线之前；快速1→4→2之后旧回调不改变2；触摸/滚轮/导航键取消后恢复位置判断；导入失败正常原生滚动。至少包含：

```js
test('late Lenis import cannot start after destroy', async () => {
  let resolveModule, instances = 0;
  const loadLenis = () => new Promise(resolve => { resolveModule = resolve; });
  const driver = createPageScroll({ win: eligibleWindow, loadLenis });
  driver.destroy();
  resolveModule({ default: class { constructor() { instances++; } } });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(instances, 0);
});
```

其他用例固定粗指针/减少动态/`body[data-motion="off"]`不构造实例；fine模式只建一份；暂停后销毁、恢复动画后按条件重建；隐藏销毁、恢复重建；异常不遗留pending保持；destroy移除监听；同步完成回调不会被随后写入的hold覆盖。

- [x] **Step 2: 运行RED。** `node --test tests/page-scroll.test.js tests/history-scroll.test.js`；预期新模块/注入行为不存在，原有位置算法测试仍应保留。
- [x] **Step 3: 取得固定上游发布物。** 用 `npm pack lenis@1.3.27 --pack-destination artifacts/vendor-source` 获取精确版本，先列出并展开到该任务临时目录，再用read读取package.json、许可和实际ESM入口。核对版本、repository与可获得的gitHead/tag及npm integrity；来源或版本不符就停止该依赖接入，不自动换库。只复制所需的完整ESM与MIT许可；记录原始入口、tarball来源、字节数和SHA-256实值到provenance，文件名使用上述固定版本。将上游必要Lenis CSS规则合并进现有样式，不增加运行时CDN。
- [x] **Step 4: 实现统一滚动。** fine+hover、非reduce且body motion未暂停时使用 `autoRaf: true, smoothWheel: true, lerp: 0.12, syncTouch: false, anchors: false, respectReducedMotion: true`。通过媒体监听与仅观察body的 `data-motion` 属性的MutationObserver更新条件，destroy时都移除。原生导航用scrollend或连续两帧到达目标判断完成，并设1500ms兜底释放；用户中断走取消回调。全局CSS取消smooth、根padding归零，章节CSS留白24px；短视口JS按公式缩小。Lenis只负责位置，不另设章节状态或DOM transform。图像对话框内部使用 `data-lenis-prevent`。
- [x] **Step 5: 接上导航与失败回退。** 所有显式入口走navigateToChapter；普通链接只拦截无修饰键的本页导航并只写一次history。初始字体校正最多一次，用户活动后失效。scroll控制器使用注入回调，history-scroll导入失败时内联fallback也使用同一滚动driver；driver自身导入失败仍可按相同CSS落点原生导航。减少动态或暂停时显式导航立即完成；媒体变更、隐藏、pagehide销毁Lenis，恢复重建，取消迟到Promise副作用。
- [x] **Step 6: 运行GREEN并提交。** `node --test tests/page-scroll.test.js tests/history-scroll.test.js tests/site.test.js`、`npm run build`。白名单加入src/page-scroll与两个vendor文件；现有35个发布文件相应变为38个，若Task 1/2实际增加别的发布文件则按明确清单复核，不能删除计数断言。保留SHA-256缓存策略；版本化动态import文件名不可漂移。提交信息 `feat: unify chapter scrolling with optional Lenis`。

## Task 4: 地图动效收尾与全流程验收

**Files:** 修改 [editorial-motion.js](../../../src/editorial-motion.js)、[index.html](../../../index.html)、[map-overview.test.js](../../../tests/map-overview.test.js)、[verify-browser.mjs](../../../scripts/verify-browser.mjs)、[verification.md](../../../docs/verification.md)。必要的行为修正只回到拥有该行为的前述文件。

**Interfaces:** 消费既有 `initEditorialMotion({ root = document, reduced }) -> { pause, resume, destroy }`、`chishui:chapter`、`chishui:map-before`、`chishui:map-after`、`chishui:layout` 与Task 3滚动入口。不改配乐API、地图几何或相机中断语义。

- [x] **Step 1: 增加真实交互失败断言。** 扩展现有checker，在父任务持有的单一专用Brave执行；先验证旧代码确有对应失败，不用源码字符串冒充交互测试：

```js
assert.equal(overviewAfter, overviewBefore);
assert.equal(mapParentAfter, mapParentBefore);
assert.equal(document.querySelectorAll('#current-route').length, 1);
assert.ok(activeChapterTop >= -1 && activeChapterTop < innerHeight * 0.45);
assert.ok(Math.abs(afterPassiveMapUpdateY - beforePassiveMapUpdateY) <= 1);
```

用例覆盖“全部路线”后再点第四渡退出all-routes；手机折叠图仍能点章节、展开图可比较路线；暂停/reduce/隐藏后的路径完整。图片对话框放大并内部滚动时页面位置不变，Escape恢复原焦点。
- [x] **Step 2: 实现最小动效修正。** 删除“全部路线”和重播附带的页面居中；折叠、离屏、隐藏时settle路线，已展开可见时才启动播放。保留现有镜头最新状态策略和事件顺序；不在滚动回调里读写交错地调整布局。主题句、图、正文先可读，动画增强失败不隐藏内容。
- [x] **Step 3: 跑一次相关全量检查。** `npm test`、`npm run build`、`git diff --check`；预期exit 0，不先把未来结果写成通过。确认最终dist的静态总览、四章、依赖和许可均存在，历史一致性测试未弱化。
- [x] **Step 4: 在单浏览器完成验收。** 保持已有 `http://127.0.0.1:4173/` 服务；若没有才启动managed job，不与现有服务抢端口。运行checker新增八个尺寸：320×568、390×844、768×1024、844×390、900×600、901×600、1280×480、1440×900。分别覆盖无脚本、reduce、Lenis故障、history-scroll故障、Anime故障、延迟字体、初始第四渡、正反向手滚、1→4→2、前进后退、旋转与字体放大。检查器若模拟故障，单独记录预期console错误，其他pageerror为0。
- [x] **Step 5: 查看截图并写实测记录。** 每个受改动区域至少有一张桌面和一张手机截图，检查图内小字、裁切、阅读顺序、说明完整与控件边界；保存到持久artifacts目录。按design-taste-frontend检查当前素材和受改动区；若指定inspector/meter在当前环境不可运行，明确记录未运行与可用浏览器检查，不伪造评分或归属。真机Safari/微信及实测帧率未做就写未验证。
- [ ] **Step 6: 提交并完成既有发布流程。** 提交信息 `fix: finish map motion and responsive navigation checks`。按审阅时的授权构建并推送既有远程，更新既有根首页；不要另建站点或域名。核对线上HTTP、标题、四渡总览、手机章节与版本资源后提供根首页链接。关闭专用浏览器、收集managed job输出并停止本任务预览服务，不删除用户数据。

## 执行交接

本方案已由用户批准并按Native模式实施。四个产品提交依次为 `83a011f`、`1abe2cf`、`6b419f7`、`4c9a593`。93项Node测试及本轮Brave场景通过，38个构建文件已推送原站点，Pages构建提交为 `5182db9`。最后的公开页面检查被Cloudflare 403「Just a moment...」验证页拦截；待用户选择自行浏览或授权专用可见浏览器验证，不能将此项记为已通过。
