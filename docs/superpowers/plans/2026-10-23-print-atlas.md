# 印刷图册视觉与地图修订 Implementation Plan

> **For agentic workers:** 使用本会话原生subagent实现与独立只读审查；目录中通用superpowers子技能目前不在可调用catalog，不调用未列技能。用户已确认方向并授权完成后推送，不新增设计审批。

**Goal:** 将正式根首页统一为有年代字形、纸墨材料与清楚地名/箭头的长征阅读图册。

**Architecture:** 字体资产由独立工作者核实、子集化并冻结；一个页面工作者完成统一视觉与同坐标地图。控制器负责实际Brave验收、独立审查与既有main/gh-pages正常发布。

**Tech Stack:** Node>=22；原生HTML/CSS/JS/SVG与既有本地Anime4.5.0；本地WOFF2、完整OFL与原创静态PNG；无新npm依赖。

**Spec:** `docs/superpowers/specs/2026-10-23-print-atlas.md`

## Global Constraints

- 根首页 https://changzheng90.luvch1nabest.me/；完成后直接推送，无ZIP、无新DNS/CF变更。
- 基准main d31c5dc041cb9f126874d8ee1da313e1954a856b；保留史实/照片原始字节、现有三布局、无署名/无音频及完整无JS阅读。
- 标题桌面<=64px/手机<=40px；正文>=16px、可操作目标>=44px；地图实际文字目标>=14px。
- 1800ms真实单路径描绘保留；头点仅绘制时可见；箭头只在完成/静态时显示；缩放/字体加载与切章保持标注清楚。
- 字体固定来源/许可/内部版权，显示子集<=500KiB；四新部署资源使24文件变28，私有工具和原font不发布。
- 仅控制器使用专用Brave，无另一浏览器/profile/CDP；页面工作者不建服务器、不委派、不Git、不更改本文或spec。

## Review Focus

1. 最长第四渡地名在320px/三布局不挤压、撞箭头或超出图版；实际字体加载前后都可读。
2. 静态/无JS/字体失败/无观察器：地图地名和方向完整，头点不残留，箭头仍正确。
3. 切章/重播/暂停/reduce中途转换：旧回调不得覆盖新路线，完成头点隐藏、箭头可见。
4. 字体实际本地字节/许可/内部字族与字形覆盖正确；仓库前缀路径和MIME可真正加载。
5. 纸墨/字体处理不能变成照片滤镜或让正文、图注、出处对比不足；历史内容逐字保留。

### Task 1: 字体来源与小体积显示子集

**Files:** Create `public/fonts/chishui-atlas-display.woff2`、`public/fonts/ZHUQUE-OFL.txt`；研究原font、工具与报告只在ignored目录。

**Interfaces:** Produces 内部字族`ChishuiAtlasDisplay` Regular、完整未删改OFL、源标签/散列/子集字符覆盖及制作命令。资产工作者为783d044a-94e3-49a2-8a57-c2fc2828d23b。

- [ ] 核实实际官方release、font及完整许可，读嵌入版权；记录与README声明不同之处。
- [ ] 用隔离开发工具产生WOFF2子集并内部重命名，版权及原字形保留，不全量部署TTF。
- [ ] 用FontTools真实重新读取产物，检查字形覆盖/名字/字节/散列，冻结资产并报告；不运行全Node/构建。

### Task 2: 一次连贯页面修订与资源回归

**Files:** Modify `index.html`、`src/editorial-motion.js`、必要时`src/editorial-motion.css`、`scripts/build.mjs`、`tests/site.test.js`、`README.md`、`docs/assets.md`、`docs/verification.md`；Create `src/print-atlas.css`、`public/atlas-paper.png`。Task1两资源只读消费。

**Interfaces:** Consumes Task1字族/路径和既有`chishui:chapter`/`chishui:layout`/`chishui:motion`。Produces 同一SVG坐标的地名/渡口/目的地、保留原ID与当前章文本；必要`renderMapLabels(data)`/`fitMapLabels()`只在根内联模块处理，不能扩展状态机或改史实数据。

- [ ] 修改现有真实packaging/prefixHTTP测试，要求28资源、WOFF2 header/MIME、原始OFL及PNG/CSS字节通过仓库前缀GET。运行命名资源用例一次RED，缺新CSS/纸纹时报错；不是仅重复CSS实现的快照测试。
- [ ] 新原创细纸纤维PNG，统一图册CSS覆盖三布局；显示字族用于标题/题签，正文宋体清楚；保留所有照片字节/完整边框。
- [ ] 将独立百分比map label搬到统一SVG坐标，引线/分行/题签让长地名明确指向渡口或终点；字体加载、布局变更、resize调用适配，静态第一渡保留。移除过时span的left/top更新和CSS。
- [ ] 使用userSpaceOnUse或等效明确几何的箭头；finishRoute/暂停/静态隐藏头点，playRoute仅绘制开始后显示；保留旧取消逻辑、可见性定位与1800ms。
- [ ] Task1冻结后真实前缀测试GREEN；运行最终完整Node一次、一次28文件构建、JS语法和git diff --check。没有变动的story测试不反复单跑。
- [ ] 自审范围/事实/原始图片与vendor散列，写私有`print-atlas-report.md`并冻结产品；公开验证说明暂记浏览器待控制器，不能复制旧通过结果。不要提交或推送。

### Task 3: 实际视觉、独立审查与根发布

**Files:** 私有controller-qa/review记录、最终README/assets/verification证据；控制器冻结后的有限文档修订。

- [ ] 控制器读完整源码delta，确认资产/MIT/OFL/白名单；在原唯一项目预览端口4173通过专用Brave跑四宽×三布局/四章地图、真实字体与图像解码。
- [ ] 原生点击采样描绘头点/offset，结束头隐藏和箭头；快切、重播、暂停/reduce、反向details、图片dialog焦点、真无JS与字体/模块失败。分组分次避免工具timeout；截图只写配置临时输出，实际看首屏、地图、结尾。
- [ ] 任何可见问题回原工作者定向修，不重复无关套件；补当前证据，独立只读review一次，不凑问题。
- [ ] scope精确提交main；独立现有Pages checkout与最终dist28文件字节一致后正常提交推送gh-pages。保留无关旧计划，不force，不改DNS/CF。
- [ ] 核对两个远程head与实际Pages built commit/根文件、CSS与字体blob。关闭Brave、收集/停本轮job，交付根URL与具体可见变化。
