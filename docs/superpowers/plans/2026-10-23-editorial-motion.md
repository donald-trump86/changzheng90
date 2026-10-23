# Editorial Motion Implementation Plan

> For agentic workers: use one bounded implementer and fresh read-only review. The previously requested subagent workflow is preserved; absent skills must not be invoked. User explicitly authorized implementation and default root publication; no further design approval gate.

**Goal:** 为现有根首页实现可见、可中断的路线／章节／图片与滚动动效并上线。

**Architecture:** 保留内嵌的历史与阅读逻辑，只以CustomEvent通知独立动效模块。Anime.js原始ESM本地托管；CSS默认静态可读，动画负责增强而不是解锁内容。

**Tech Stack:** Node≥22，vanilla HTML/CSS/ES modules，SVG，固定Anime.js v4.5.0（MIT核实后使用），无npm依赖。

**Spec:** [根首页动效设计](../specs/2026-10-23-editorial-motion.md)

## Global Constraints

- 根首页、三种版式、史实原文／日期／方向与来源保持；不修改历史图像字节，不加个人署名。
- 独立MIT库本地托管，无框架迁移、CDN、音频自动播放、用户存储或账号。
- 默认完整静态内容；暂停／系统减少动态／页面隐藏后取消动画并恢复完整终态。
- 快速反向、章节／版式切换不锁输入、不排队、不保留旧回调；原details弹簧仍保留当前高度及速度。
- 只有控制器使用现有专用Brave；工作者不浏览器、不起长期服务器、不再委派、不推送或改DNS。

## Review Focus

1. 触屏原生点击时地图是否真的完整可见，绘制是否真的推进；不能由测试强制滚动替产品完成。
2. 隐藏章节／切换版式／系统偏好变化时的旧回调是否复活。
3. 第三方模块404／缺少观察器／无JS是否仍完整可读。
4. 暂停是否停止环境循环与滚动动画，同时恢复文字／路线完整状态。
5. 前缀部署是否加载库、CSS和许可，以及是否只发布明确白名单。

### Task 1: One coherent implementation

**Scope (only these, plus the two frozen design/plan documents above):**
```
index.html
src/editorial-motion.js
src/editorial-motion.css
public/vendor/anime-4.5.0.esm.min.js
public/vendor/ANIME-LICENSE.txt
scripts/build.mjs
tests/site.test.js
README.md
docs/verification.md
docs/assets.md
```
**Private report:** `.superpowers/sdd/2026-10-22-chishui-h5/editorial-motion-report.md`.

**Interface:** document events `chishui:chapter` detail `{number}` after immediate DOM update, `chishui:layout` after layout change. Module boots from visible DOM; owns route/progress/entrance/ambient animation registry and all cleanup. Controls `#motion-toggle` and `#replay-route`; moving circle `#march-head`. Keep native `#current-route` one path, and current spring/disclosure code.

- [ ] Add real packaging checks that new CSS/module/vendor/license are served under repository prefix with correct types/bytes. Run focused RED before allowlist exists.
- [ ] Download only original pinned bundle and license via checked GitHub tag API; report source commit/tag, sizes and SHA256; inspect license and exports, keep bundle unmodified.
- [ ] Implement spec: ~1800ms continuous route drawing/frontpoint/endpoint, cancellation and replay; map visible before native click draw; short current chapter transition; layered hero≤1.2s, timeline/photo entrances; bounded artwork parallax, river flow, actual reading progress. Add pause control and static cleanup.
- [ ] Update exact build inventory (24 files expected) and prefix checks. Run focused Node checks to GREEN, then one final Node suite/build after source is stable, whitespace/syntax checks. Do not write tests that merely search implementation strings.
- [ ] Self-review scope, facts, keyboard, fallback and actual API usage. Write truthful report with commands and mark browser QA pending controller. Stop all writes; send changed files and results. Controller handles commit after real QA; do not commit/push yourself.

### Task 2: Controller acceptance and publication

- [ ] Inspect complete module and exact HTML/script delta before unsafe browser execution; use owned preview4173.
- [ ] Real serial browser phases: four-width/three-layout geometry; native route progress/replay/cancel; pause/reduce/background; actual scroll/river/photo progression; details reversal/dialog/noJS/module-failure. Save bounded JSON and screenshots to configured browser output only.
- [ ] Return concrete defects to same implementer; update actual evidence only. Fresh read-only reviewer once stable; no repeated whole suites without code change.
- [ ] Commit scoped files, normal-pushmain; copy only verified build files to existing independentPagescheckout, no force push/no other deletion; normal-pushgh-pages.
- [ ] Confirm actual remote heads and built commit. Deliver root URL, concise visible changes and actual limitations; no ZIP.
