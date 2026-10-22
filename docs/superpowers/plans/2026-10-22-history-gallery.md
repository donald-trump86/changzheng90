# 历史图库与阅读动效 Implementation Plan

> **For agentic workers:** 使用本会话已授权的原生 subagent 实现与独立只读审查。当前技能目录没有 superpowers 执行技能，不调用目录外技能。按下列边界工作，不委派子代理。

**Goal:** 去除生硬的党徽图注和全部作者解读，以四幅真实、有出处的历史主题图片结束叙事，并加入可暂停的阅读与环境动效。

**Architecture:** 保留现有静态 HTML、共享历史数据与0..5状态机；一份默认可见的语义图库兼顾正常阅读和无脚本全文，JS只调整其位置/可见性和入场增强。新增动画受已有 body[data-motion] 与 reduced-motion 控制，不改变路线几何及1900ms绘制。

**Tech Stack:** Node≥22；HTML/CSS/ES modules/SVG/Canvas；系统 sips 处理生产图片；不增加依赖。

**Spec:** `docs/superpowers/specs/2026-10-22-history-gallery.md`

## Global Constraints

- 权威根 `/Users/jasondai/changzheng90`，main，基准 `a6108d0af8291f62791e64b83cf5743bb8d82865`。源码推送已获授权；Pages和DNS未获最终内容确认。
- 用户最新要求替代旧设计中的可见党徽图注、insight及reflection要求。删除观点，不改写为史实；其余历史字段及问答逐字保留。
- 保留红金、小标题、地图优先、单连续路线、原生定位/绘制/重播/取消、无个人署名、标准静止党徽、独立默认关闭音乐、1080×1440本地PNG、来源对话框和完整noscript。
- 已核实的四张源图在 `artifacts/history-research/`；不得另选照片、联网取图或声称1947照片为长征现场。前两图原样，后两图仅1280宽等比JPEG质量80，不裁切。
- 只用专用 Brave 做控制器实际观察；工作者/审查者不得浏览器、CDP、新客户端、持久服务器、外部变更或子代理。浏览器截图只存既定tmp目录。

## Review Focus

1. 删除图注/观点时JS绑定和noscript不残留、不空节点异常；其余事实不变。
2. 旧照片、2010展陈摄影、原出版信息与许可范围明确，四幅本地JPEG真实解码、前缀路径/MIME可用。
3. 新动效真实推进，暂停/减少动态/无JS完全可见，图库不靠观察器才能显示，党徽/图注/地图祖先静止。
4. 原生点击仍把整幅地图放入视口后绘制，单路径与头部证据不被入场transform破坏；快速导航无遗留动画。
5. 既有音频/PNG/来源焦点/问答/构建边界完整；文档只记实际观察，不把旧15组通过套用本次。

## Task 1: 实现文字清理、历史图库与动效

**Files:** 修改 `index.html`, `src/main.js`, `src/map.js`, `src/styles.css`, `src/story.js`, `scripts/build.mjs`, `tests/story.test.js`, `tests/site.test.js`, `scripts/verify-browser.mjs`, `README.md`, `docs/assets.md`, `docs/design-decisions.md`, `docs/verification.md`；新增 `public/history/long-march-gathering.jpg`, `public/history/sixth-army-1935.jpg`, `public/history/luding-bridge-museum.jpg`, `public/history/luding-chain-museum.jpg`。不改 media.js/share.js/serve.mjs/状态机、音频或党徽文件。图库逻辑在现有main.js中保持小而清楚，无需新模块。

- [ ] 读spec、此plan、已授权触点和既有验证记录；记录BASE，检查工作区不覆盖他人修改。
- [ ] 针对数据去观点与新增真实部署资源修改既有有意义断言；聚焦运行获得RED，保留输出摘要。不得写测试去逐行镜像CSS/DOM实现。
- [ ] 复制两张原图；用现有sips等比优化两张展陈图；记录源与产物尺寸、bytes、SHA-256、处理方式和逐图来源/许可。
- [ ] 删除可见党徽figcaption及专用样式，保留alt/标准静态图；删除四insight和epilogue.reflection的DOM、数据、绑定、noscript与来源对话框陈旧解释。其余共享事实不变。
- [ ] 以单一默认可见section/figure列表增加“回望长征”；JS初始化时移至experience footer前，并由onEpilogue管理。手机单列、桌面有图片大小节奏；图注、alt、实际width/height、本地lazy资源齐全；details逐图链接来源与许可。
- [ ] 实现开场和章节阅读入场、独立水面缓慢流光、照片进入视口时有限入场；静态基态完整；暂停/减少动态停止全部新增动态；不变换地图/路线祖先和党徽祖先，不积累计时器、不自行重播路线。
- [ ] 构建明确加入四JPEG，精确产物16文件；现有server已经支持JPEG，无需改动。聚焦测试GREEN，前缀资源9个HTML引用/13个唯一请求（无新增模块时）；JPEG MIME必须是image/jpeg，保留范围/隐藏路径/穿越/404等检查。
- [ ] 扩展供控制器使用的 `async (page, { phase = 'all' } = {}) => { ... }` 验证表达式：修正移除字段/图注的旧断言；保留原15组有效保证。建议加独立gallery阶段，两组新增覆盖真实图解码/来源/布局与非路线动效/暂停/减少动态；相应更新分阶段和all计数，避免单次长调用超时。
- [ ] 原四宽度全程中每次到尾声检查图库和无观点；真实noscript沙盒同时检查图库。加入实际新增动画的推进/结束和静止采样，不能只查animation-name。检查图库显示前不占首屏，回看隐藏，图库可见时暂停和系统减少动态均无running动画且像素/文字完整。
- [ ] 更新当前文档，明确新图库、本轮browser pending与历史验收范围；末次必要Node全套一次、build、syntax和taste静态lint，记录真实结果，不为刷绿加--app或运行独立浏览器inspector。
- [ ] 自查并提交 `feat: add historical photo ending and reading motion`；报告真实RED/GREEN、全套结果、变更、asset hashes与browser pending。报告放忽略目录 `.superpowers/sdd/2026-10-22-chishui-h5/history-gallery-report.md`，报告写好后通知控制器，不运行持续监视/轮询。

## Task 2: 实际验证、修正与独立审查

- [ ] 控制器先审查本轮browser脚本完整delta，确认仅使用传入page且无profile/storage/额外client读取；复用唯一已有4173预览，核对当前dist。依据分阶段脚本实际检查320/390/768/1440与extras/gallery，分别保存报告和截图；不把分阶段结果当独立全套成功。
- [ ] 看真实截图：党徽无说明、小标题及地图仍主导、无作者解读、图库自然结束且图片完整、来源说明可达；实际动效可感知且不破坏文字或路线。确认明显问题交回原实现者修复，再做与变化相称的检查。
- [ ] 实际Node/build和browser证据写回当前文档、提交。审查只读基准..最终HEAD的完整diff，独立上下文复用既有实际验证；不重跑全套、不修改、不网络、不浏览器。
- [ ] 所有重要问题解决后，控制器做精确产物ZIP/CRC/清单校验，正常推送既有origin main，核对remote与工作区，交付本地预览和新静态包；继续等待最终内容确认后才部署Pages/DNS。
