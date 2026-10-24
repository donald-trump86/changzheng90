# 四渡赤水展馆缺项修复 Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent data, style and media tasks; controller integrates and verifies. Steps use checkbox syntax.

**Goal:** 修复完整性审计确认的问题，验证实际效果，更新源码 main 与 gh-pages 根站点。

**Architecture:** 延续静态 HTML/CSS/JavaScript。共享历史数据同时供浏览器地图和构建时静态正文生成使用；原图链接保留，页面使用本地响应式 WebP 预览，SVG 地形在接近视口时装载。

**Tech Stack:** Node >=22；原生浏览器 API；已有 ImageMagick/cwebp；既有 Anime.js；不新增运行依赖。

**Spec:** 用户已确认的缺项修复清单，以及 docs/design-decisions.md 的当前布局、无脚本与许可约束。

## Global Constraints

- H1「赤水河，为什么要渡四次？」、尾声「山河为证」、西/东/西/东方向及现有史料依据保持一致。
- 无脚本仍有四章、五节点时间线、第一渡静态地图与图片原文件链接。
- 不伪造照片归属；生成山水只明确称艺术示意。历史原文件字节保留。
- 配乐默认关闭；异步初始化同步当前章节；现有两首曲目及授权保持。
- 原生滚动、减少动态与键盘焦点可用；正文 >=16px，按钮至少44px。
- 只保留当前实现和当前文档，不恢复旧版本产物；不换技术栈。

## Review Focus

- 缩放必须增大实际图片宽高，视窗可以横纵滚动且复原后恢复适配。
- 任意历史字段变更必须同时反映在静态正文与地图，生成结果过期检查会失败。
- 首屏不请求地图地形，靠近地图后请求且解码；脚本失败有静态降级。
- 第三、四章冷启动延迟导入音频后，首次显式播放使用 The Great Sea。
- 桌面深色开篇的图注保持足够对比；窄屏、横屏对话框控件不溢出。

---

### Task 1: 共享历史事实与静态正文

**Files:** src/history-data.js（新增唯一事实源）、src/story.js（ESM适配）、src/historical-map-data.js（消费历史阶段）、scripts/render-history.mjs（幂等生成与检查）、index.html（生成区域和事实消费）、对应 data/map/history 测试。

**Interfaces:** `globalThis.ChishuiHistory = { sources, chapters, eras, timeline, epilogue }`；`renderHistory(html, history) -> string`。技术坐标、投影、几何留在地图文件。

- [ ] 先增加生成器一致性与事实变更传播测试，确认未实现时失败。
- [ ] 从现有数据提取唯一事实字面量；生成时间线、章节、地图历史说明与尾声正文。纯 HTML 保留阅读内容。
- [ ] 地图共享阶段事实，脚本加载次序明确；运行定向数据测试。

### Task 2: 图片阅读与尾声样式

**Files:** src/print-atlas.css。控制器随后修改 index.html 的对话框与尾声标记。

**Interfaces:** 对话框 `.dialog-viewport` 为固定可滚动视窗，`#dialog-image` 的像素宽度无 max-width/max-height 限制；`.continuation-plate` 为尾声完整山河图；响应式 picture 填充现有容器。

- [ ] 修正全局图片上限对对话框的约束；100%按视窗适配，150—400%相对适配尺寸。
- [ ] 深色开篇图注、链接与尾声构图保持可读。
- [ ] 控制器用浏览器量测宽高比、scrollWidth/scrollHeight、复原与焦点。

### Task 3: 本地响应式图像

**Files:** scripts/prepare-images.mjs（新增）、public/images/*（新增）、docs/image-manifest.json（新增机器清单）。

**Interfaces:** 从 design-study 三份原图生成 valley-480/960/1440/1774.webp、gathering-320/585.webp、sixth-army-320/698.webp。不放大原始像素；清单记录尺寸、字节与原图散列。

- [ ] 使用已有本地工具，生成可复现派生预览；原图保持原始字节。
- [ ] 尾声复用既有山水艺术完整画面，明确图注，不冒充史料。
- [ ] 核对所有变体真实解码、尺寸与体积；交控制器接入 picture/srcset。

### Task 4: 集成与实际验收

**Files:** index.html、scripts/build.mjs、scripts/serve.mjs（若 MIME 需补齐）、scripts/verify-browser.mjs、tests/site.test.js、docs/* 与 README.md。

- [ ] 接入 picture/srcset/sizes，首屏预览优先，历史照片与尾声 lazy；接近地图时设置 SVG image href，无脚本有静态备选。
- [ ] 对话框按视窗适配像素尺寸，缩放只改变图像不改变视窗；resize、复原、错误、关闭处理一致。
- [ ] 为音频初始化同步 currentChapter；档案图注加入叙事作用并保持真实性边界。
- [ ] 更新构建白名单、资源遍历与 MIME 测试；运行全量 node --test。
- [ ] 浏览器验收320/390/768/1440及844×390，测实际缩放、首屏/地图请求、深链接音频、无脚本、减少动态；保存截图并逐张查看。
- [ ] 更新当前验证、设计与素材文档，提交并推送 main/gh-pages，检查远程提交与线上字节。

## 执行分工与裁定

数据、CSS、图像任务可并发，编辑文件互不重叠；集成在数据任务交还 index.html 后进行。浏览器只由控制器占用。子代理不提交、不推送、不启服务；控制器统一运行全量测试。用户已明确要求继续修复并推送，沿用既有方向，无需再次征求方案或发布许可。
