# 四渡赤水地理细节地图 Implementation Plan

> Execution: one scoped implementer, controller-owned actual Brave QA, fresh read-only reviewer. No unavailable skills are invoked. User already authorized implementation and default root publication.

**Goal:** 修正同名地点漂移和行军衔接，提供有依据且手机清晰的区域图、渡口细看与地形/史料注解。
**Architecture:** 纯数据classic脚本持有固定地点/投影/阶段关系；renderer通过稳定SVG节点渲染。旧inline应用保持章节、弹簧与对话框所有权，Anime仍拥有动画。静态HTML是第一渡完整底图。
**Tech Stack:** Node>=22、原生HTML/CSS/SVG、既有Anime4.5.0；无新依赖或运行时联网。
**Spec:** docs/superpowers/specs/2026-10-23-geographic-map.md

## Global Constraints

- 仅下列12个产品/测试/文档文件；spec/本计划由控制器冻结，不改。
- 不改原图、字体/OFL、原纸纹、vendor、音频、旧src模块、design-study、package配置或无关旧研究计划。
- 四章正文/日期/方位保持原文；新增事实只入地图资料区。许可、现代定位与概略节点不混成1935精确坐标。
- 真实海拔只用完整10×9网格，不用残缺批次；地形署名Open-Meteo/CCBY4和概化修改。
- 九溪口无绝对坐标，不编造；河道是有史料关系约束的原创概化，不声称获取了OSM矢量。
- 控制器独占浏览器、Git提交/推送及唯一持久预览。实现者不联网/不委派/不改Git；临时HTTP测试监听器必须finally关闭。

## Review Focus

1. 同名渡口在二/四渡身份/位置稳定、2→3阶段无未解释跳跃。
2. 现代县城点不冒充1935渡口，九溪口未知定位及三渡川南区域不被虚构。
3. 手机/短横屏复杂标签、总览/细看、箭头/头点与viewBox共享坐标。
4. 快切/缩放/暂停/reduce取消旧动画，模块失败仍读章且地图明确第一渡。
5. CC BY数据来源、完整四章、资产白名单/真实前缀MIME/私密研究文件隔离。

## Task 1: 一体化地图实现与数据校验

**Allowed files:**
- index.html
- src/historical-map-data.js (new)
- src/historical-map.js (new)
- src/historical-map.css (new)
- src/editorial-motion.js (minimal lifecycle/viewport integration only)
- public/map/region-relief.png (new; original rendering from provided data)
- scripts/build.mjs
- tests/site.test.js
- tests/historical-map.test.js (new)
- README.md
- docs/assets.md
- docs/verification.md

**Interfaces:** `globalThis.ChishuiMapData` pure constants/projection/geometry helpers; `globalThis.ChishuiHistoricalMap.create()` returns `{setChapter(number),setView(mode),fit()}`. Entry synchronously loads data+renderer before existinginlineIIFE; map commits before existingchapterevents. PreserveexistingIDs/events; map rendererdoesnotownAnimeactors. Renderer/modulefailurecontinuesoldreadingwithaccuratefirst-mapcaption.

- [ ] Read spec, named research/audit reports, existing map/entry/motion and scoped build/tests. No old-plan crawl.
- [ ] Write meaningful data/projection tests: point identity acrossstages, derivedthree-phaseconnections, north-up/orderofdocumentedmodernpoints, nonempty singleM routes, unknown九溪口 representedwithout fakecoordinates. Add 32file inventory and actualprefixedGET/MIME/bytes for4newresources.
- [ ] Run focusednew tests/packaging to prove expectedRED, then implement only missingdata/renderer/style/glue.
- [ ] Generate low-contrast reliefPNG from artifacts/map-research/terrain-coarse-complete.json (90points/210–1845m), using isolated researchscript/stdlib only; do notinstallnewnpm. Bilinear/smoothed illustration is explicitcoarsegeneralization, not inventedprecisecontours. UpstreamAPIlicense actualREADME in samefolder.
- [ ] Implement staticfirstmap+layeredtopography/fixedplaces/fordareas/currentline/north/legend/semanticoutside-mapdetails, two viewbuttons, stableviewport. MobilehiddensecondarylabelsremainavailableinHTMLdetails. Clearlabelcollisions using actualgeometry ratherthanonlyfontsize.
- [ ] Integratechapter/view changes preservingcancelorder and1800msonepath/head/arrow; do nottransformroutewithouthead. Keepoldbody/disclosure/dialog/font/pause/noJSbehavior.
- [ ] Run focusedGREEN; then full `npm test` once and `npm run build` once (32). CompilechangedJS/inlineanddiffwhitespace (upstreamOFLunchanged). Record21+protectedassets/chaptersbyteaudit.
- [ ] ProductFREEZE immediately after finalchecks; tellcontrollerreadybeforefinishingdocs/report. No productwritesduringactualQA. Publicdocsrecordbrowserpendinguntilcontrollerresults.
- [ ] Write .superpowers/sdd/2026-10-22-chishui-h5/geographic-map-report.md withactualcommands/timings/dataandassetSHA/sizes/limits/scope, thenstop. No commit/push.

## Task 2: 控制器真实验证、审查和发布

- [ ] Completebrowserphone/desktop/shortlandscapeandfallbackphases; inspectimagesandfixrealfindingsviaoriginalimplementer. Onlychangedchecksareiterated, notfullsuitewithoutcause.
- [ ] Writeactualevidence, independentfreshdiffreview; correctactionablefindingsbeforegate.
- [ ] Commitexactsourcepaths, syncdist32byteforbytetopreexistingPagescheckout, normalmain/gh-pagespush, verifyremoteheads/build/blobs. ExistingOSproxy may be passedonlytoGitprocessifstandardGitfails, no config/TLSchange.
- [ ] RootURLdeliveryonly, noZIPunlessasked. FinishBrave/previewjobs; completethegoalonlyafteractualpublication.

Self-review: one coupledmapdeliverable; data/integration/fallback/rightsinputscovered. ControllerQAownsvisualassertionsnotduplicatedbyfakeDOMunitstubs. No unassignedinterfaceornewframework. Decisionsarecontrollerdefaultswithinexistinguserauthorization.
