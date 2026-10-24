# 四渡赤水木刻主图、党徽题眉与展陈视觉精修 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将四渡赤水纪念页的开篇河谷图替换为 1930 年代左翼黑白朱砂套色木刻风格插画，在首屏加入静态标准金黄色中国共产党党徽题眉，并解决首屏遮挡、尾声重复大图、历史照片放大发糊、全页米色堆叠与页脚失衡问题。

**Architecture:** 保持现有无构建框架的同源静态架构（`index.html` + `src/*.js` + `src/*.css` + `scripts/prepare-images.mjs` + `scripts/build.mjs`）。Task 1 生成木刻原图与响应式 WebP 预览并恢复已核验的 `public/party-emblem.svg`；Task 2 调整 `index.html` 与 `scripts/build.mjs` 的结构与构建白名单（加入党徽题眉、移除首屏重复卡片与尾声重复大图、精简版权长链接文案）；Task 3 更新 `src/print-atlas.css` 与 `src/historical-map.css`（党徽朱红方章衬底、深色档案展柜、原图像素上限、纸墨层次与紧凑页脚）并同步文档与浏览器验收。

**Tech Stack:** HTML5, CSS3, ES Modules / Classic Scripts, Node.js 内置测试运行器 (`node --test`), macOS `sips` + `cwebp` (`scripts/prepare-images.mjs`), Magpie Image MCP (`mcp__magpie-image__generate_image`), Playwright Brave MCP (`scripts/verify-browser.mjs`).

**Spec:** `docs/design-decisions.md`, `docs/assets.md`

## Global Constraints

- 运行时资源 100% 同源托管，禁止任何外链脚本、样式、字体或图片请求；所有路径使用相对路径 `./` 或 `../` 以兼容子路径部署。
- 中国共产党党徽使用 Wikimedia Commons `File:Danghui_golden.svg` 的 420 字节标准金黄色 SVG（`viewBox="1 1 32 32"`，`fill="#fdcf30"`，SHA-256 `3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3`），仅由镰刀与锤头组成，保持等比例静态展示，禁止对其施加任何 CSS/JS 动画，禁止用作 favicon 或按钮装饰。
- 开篇木刻河谷图必须明确标注为「示意插画」（非历史照片、不复原具体渡口），原图保存在 `design-study/chishui-valley-study.png`（1774×887 PNG），由 `scripts/prepare-images.mjs` 派生 `public/images/valley-{480,960,1440,1774}.webp` 并写入 `docs/image-manifest.json`。
- 两张历史照片（`design-study/long-march-gathering.jpg` 585×310、`design-study/sixth-army-1935.jpg` 698×357）原始字节与 SHA-256 保持不变；页面内渲染宽度不得超过各自原图物理像素宽度。
- `index.html` 中所有 `<!-- history:*:start/end -->` 生成边界保持完整，`node scripts/render-history.mjs --check` 必须零差异通过。
- 页面不得出现个人署名（`戴诗旭`、`Jason Dai`、`作品作者：`）。
- 正文与档案图注可见段落字号 `>= 16px`，所有可见交互控件触控目标 `>= 44×44px`，在 `320×844`、`390×844`、`768×1024`、`1440×1000`、`844×390` 五个视口下零水平溢出。

## Review Focus

1. **党徽透明区域在浅色纸面或动效层上透底/被误动画化**：金黄色党徽 `#fdcf30` 在浅米色纸面上对比度不足，或被 `src/editorial-motion.js` 入场动画选中——在 Task 2 测试中断言 `.emblem-figure` 独立于 `.hero-art` 与 `.opening-meta`，并在 Task 3 测试中断言 `.emblem-figure` 具备不透明深红衬底且不被 `editorial-motion.js` 选择器命中。
2. **木刻新图重生成后 WebP 预览或 `docs/image-manifest.json` 散列失步**：新生成的 `design-study/chishui-valley-study.png` 若非 1774×887 或未同步 `docs/image-manifest.json`，会导致 `tests/site.test.js` 散列校验失败——在 Task 1 测试中断言 1774×887 尺寸、WebP 派生文件散列与 `docs/image-manifest.json` 完全一致。
3. **移除首屏 `.hero-archive` 与尾声 `.continuation-plate` 后破坏原图查看器触发契约**：`scripts/verify-browser.mjs` 依赖 `.opening [data-image-view]` 打开弹窗，且 `tests/site.test.js` 要求三张原图（`chishui-valley-study.png`、`long-march-gathering.jpg`、`sixth-army-1935.jpg`）均有 `a[data-image-view]` 入口且 8 个 WebP 变体全部在 `<source srcset>` 中被引用——在 Task 2 测试中断言这三个原图入口与 8 个响应式变体引用完整保留。
4. **深色档案展柜（`.archives-grid`）文字对比度或字号低于 16px**：档案区改为深色背景后，若 `figcaption`、`<dt>`、`<dd>` 仍沿用深墨色或字号 `< 16px`，会导致不可读或浏览器验收失败——在 Task 3 测试中断言 `.archives-grid` 使用浅色文字令牌且 `figcaption` 字号 `>= 16px`。
5. **精简 `#sources` 裸 URL 后遗漏无脚本沙箱要求的 `https://` 链接数量**：`scripts/verify-browser.mjs` 断言 `#sources a[href^="https:"]` 至少 6 个——在 Task 2 测试中断言 `#sources` 内保留至少 8 个 `https://` 权威出处与许可链接且无裸 URL 文本溢出。

---

### Task 1: 生成黑白朱砂木刻河谷图、同步响应式预览与恢复标准党徽 SVG

**Files:**
- Create: `public/party-emblem.svg`
- Modify: `design-study/chishui-valley-study.png`
- Modify: `public/images/valley-480.webp`
- Modify: `public/images/valley-960.webp`
- Modify: `public/images/valley-1440.webp`
- Modify: `public/images/valley-1774.webp`
- Modify: `docs/image-manifest.json`
- Test: `tests/site.test.js`

**Interfaces:**
- Consumes: `scripts/prepare-images.mjs` (`node scripts/prepare-images.mjs` 读取 `design-study/chishui-valley-study.png` 并输出 `public/images/valley-{480,960,1440,1774}.webp` 与 `docs/image-manifest.json`)
- Produces:
  - `public/party-emblem.svg`（420 字节，`viewBox="1 1 32 32"`，`fill="#fdcf30"`，SHA-256 `3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3`）
  - `design-study/chishui-valley-study.png`（1774×887 PNG，黑白套朱砂木刻版画风格：冬季赤水峡谷、赤砂岩陡崖、渡船与浮桥）及其 4 个 WebP 预览和更新后的 `docs/image-manifest.json`

- [ ] **Step 1: 在 `tests/site.test.js` 编写针对 `public/party-emblem.svg` 与新木刻主图的失败测试**

在 `tests/site.test.js` 中新增测试 `standard golden CPC emblem SVG is exact and free of scripts or external refs`，并在现有 `responsive previews match encoded assets and preserved originals` 中验证新木刻主图散列已更新（不等于旧水彩图散列 `c5084be3c29d97edf80bb99061b78b212a7c79b1686534977f2365749be9b201`）：

```js
test('standard golden CPC emblem SVG is exact and free of scripts or external refs', async () => {
  const svg = await readFile(join(root, 'public/party-emblem.svg'));
  assert.equal(svg.length, 420);
  assert.equal(
    createHash('sha256').update(svg).digest('hex'),
    '3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3'
  );
  const text = svg.toString('utf8');
  assert.match(text, /viewBox="1 1 32 32"/);
  assert.match(text, /fill="#fdcf30"/);
  assert.doesNotMatch(text, /<script|href=|xlink:|animate|polygon/i);
});
```

并在 `responsive previews match encoded assets and preserved originals` 末尾加上：

```js
  const valley = manifest.images.find((item) => item.id === 'valley');
  assert.equal(valley.source.width, 1774);
  assert.equal(valley.source.height, 887);
  assert.notEqual(valley.source.sha256, 'c5084be3c29d97edf80bb99061b78b212a7c79b1686534977f2365749be9b201');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/site.test.js`
Expected: FAIL（`ENOENT: no such file or directory, open '.../public/party-emblem.svg'` 及 `valley.source.sha256` 仍为旧散列）

- [ ] **Step 3: 恢复 `public/party-emblem.svg`，用 `mcp__magpie-image__generate_image` 生成黑白朱砂木刻赤水峡谷渡口图并运行 `scripts/prepare-images.mjs`**

1. 从已核验的提交 `5c5984c` 恢复 `public/party-emblem.svg`（校验 SHA-256 为 `3033ade86f8f9533ab2c7c51c35ebe11998e39485494d5fc13b2f3928a16a4a3`）。
2. 调用 `mcp__magpie-image__generate_image`（尺寸 `1536x1024` 或 `16:9`），提示词明确要求：1930 年代中国左翼木刻版画风格（鲁迅倡导的新兴木刻刀法），只用浓墨黑、宣纸白与单一暗朱砂红（`#9B302B`）三色套印；描绘冬季寒雾中的赤水河深谷、两岸陡峭的赤色砂岩崖壁与竹木、河面由木船连成的浮桥与渡口，刀触棱角分明、版画印痕清晰、无任何文字或现代建筑。
3. 将生成的 PNG 裁剪/缩放为精确的 `1774×887`（2:1 画幅）保存到 `design-study/chishui-valley-study.png`，确保其字节数大于所有派生的 WebP 变体。
4. 运行 `node scripts/prepare-images.mjs` 生成 `public/images/valley-{480,960,1440,1774}.webp` 并更新 `docs/image-manifest.json`。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/site.test.js`
Expected: 新增的 `standard golden CPC emblem SVG` 与 `responsive previews match encoded assets and preserved originals` 测试全部 PASS

- [ ] **Step 5: 提交 Task 1**

```bash
git add public/party-emblem.svg design-study/chishui-valley-study.png public/images/valley-480.webp public/images/valley-960.webp public/images/valley-1440.webp public/images/valley-1774.webp docs/image-manifest.json tests/site.test.js
git commit -m "feat: replace valley study with 1930s woodcut print and add CPC emblem SVG"
```

---

### Task 2: 更新首页 HTML 结构与构建白名单（党徽题眉、移除首屏与尾声重复图、整理版权链接）

**Files:**
- Modify: `index.html:41-81, 319-339, 369-384`
- Modify: `scripts/build.mjs:15-26`
- Modify: `tests/site.test.js:62-70, 189-215`
- Test: `tests/site.test.js`, `tests/history-render.test.js`

**Interfaces:**
- Consumes: `public/party-emblem.svg`, `public/images/valley-{480,960,1440,1774}.webp`
- Produces:
  - 首屏 `.opening .emblem-figure`（含 `<img src="./public/party-emblem.svg" width="48" height="48" alt="中国共产党党徽">` 与静态图注 `中国共产党党徽 · 党史学习 · 长征纪念`）
  - 首屏 `.opening .hero-art` 更新后的木刻版画 `alt`、`data-image-title`、`data-image-caption` 与 `<figcaption>`（写明「示意插画 · 黑白朱砂套色木刻风格」），移除 `.opening .hero-archive`
  - 尾声 `.continuation` 移除 `.continuation-plate` 重复大图，保留 `.continuation-copy` 与 `.after-route`
  - `#sources .licence` 将裸 URL 替换为紧凑的锚文本链接，保留至少 8 个 `https://` 链接
  - `scripts/build.mjs` 将 `public/party-emblem.svg` 纳入构建产物（总文件数 35）

- [ ] **Step 1: 在 `tests/site.test.js` 编写 HTML 结构、党徽接入与构建清单的失败测试**

更新 `tests/site.test.js`：
1. 在 `deployment contains only the public site, no source tooling or private artifacts` 中，将 `entries.length` 改为 `35`，并在期望数组中加入 `'public/party-emblem.svg'`。
2. 在 `new homepage is served at root with working images under a repository prefix` 中：
   - 断言 `html.body` 包含 `<figure class="emblem-figure">` 与 `src="./public/party-emblem.svg"`；
   - 断言 `html.body` 不再包含 `class="hero-archive"` 与 `class="continuation-plate"`；
   - 断言首屏图注包含 `示意插画` 与 `木刻`；
   - 断言 `#sources` 内 `https://` 链接数 `>= 8` 且不包含裸露的 `https://www.wikidata.org/w/api.php` 长串文本；
   - 将 `imgRefs` 断言更新为 `['./public/images/gathering-585.webp', './public/images/sixth-army-698.webp', './public/images/valley-960.webp', './public/party-emblem.svg']`，对 `.svg` 校验 `image/svg+xml`、对 `.webp` 校验 `image/webp`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/site.test.js`
Expected: FAIL（`entries.length` 为 34 且 `index.html` 尚未包含 `.emblem-figure`，仍包含 `.hero-archive` 与 `.continuation-plate`）

- [ ] **Step 3: 修改 `scripts/build.mjs` 与 `index.html`**

1. 在 `scripts/build.mjs` 的 `files` 数组中添加 `'public/party-emblem.svg'`。
2. 在 `index.html` 首屏 `.opening .opening-copy` 顶部（`<h1>` 之前）加入静态党徽题眉：
   ```html
   <figure class="emblem-figure">
     <span class="emblem-seal" aria-hidden="false">
       <img src="./public/party-emblem.svg" width="48" height="48" alt="中国共产党党徽" decoding="async">
     </span>
     <figcaption>中国共产党党徽 · 党史学习 · 长征纪念</figcaption>
   </figure>
   ```
3. 更新 `.opening .hero-art` 的 `data-image-title`、`data-image-caption`、`alt` 与 `<figcaption>`：
   - `data-image-title="赤水河峡谷渡口示意插画（木刻版画风格）"`
   - `data-image-caption="本项目生成的1930年代黑白朱砂套色木刻风格示意插画，表现冬春之际赤水河深谷、赤色砂岩崖壁与浮桥渡口；不作为历史照片或具体渡口测绘复原。"`
   - `alt="黑白朱砂套色木刻风格的赤水河峡谷与浮桥渡口示意插画"`
   - `<figcaption>原创赤水渡口示意插画 · 黑白朱砂木刻风格。不作历史照片，具体渡口与行军关系见下方概略图。<a href="./design-study/chishui-valley-study.png" data-image-view ...>查看完整画面</a></figcaption>`
4. 删除 `.opening` 中的 `<figure class="hero-archive">...</figure>`。
5. 删除 `#continuation` 中的 `<figure class="continuation-plate">...</figure>`，保留 `.continuation-layout` 内的 `.continuation-copy`（含 `<!-- history:epilogue-body:start/end -->`）与 `.after-route`。
6. 在 `#sources .licence` 中，将裸露的完整 URL 文本改为中文可读锚文本（保留完全相同的 `href="https://..."` 属性与全部许可声明文本）。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/site.test.js tests/history-render.test.js && node scripts/render-history.mjs --check`
Expected: 全部 PASS

- [ ] **Step 5: 提交 Task 2**

```bash
git add index.html scripts/build.mjs tests/site.test.js
git commit -m "feat: add static CPC emblem header and remove duplicate image plates"
```

---

### Task 3: 精修图册样式（党徽深红印章、深色档案展柜、原图像素上限、纸墨对比与紧凑页脚）及完整验收

**Files:**
- Modify: `src/print-atlas.css`
- Modify: `src/historical-map.css`
- Modify: `src/editorial-motion.js:575-577, 681-685`
- Modify: `docs/assets.md`
- Modify: `docs/design-decisions.md`
- Modify: `docs/deployment.md`
- Modify: `docs/verification.md`
- Modify: `README.md`
- Test: `tests/site.test.js`

**Interfaces:**
- Consumes: Task 1–2 生成的 `index.html`、`public/party-emblem.svg` 与木刻预览图
- Produces:
  - `src/print-atlas.css`：`.emblem-figure` 与 `.emblem-seal`（`#7A1E1A` 不透明深红衬底）、轻量化首屏左半侧文字遮罩、`.archives-grid` 深色档案陈列底板（`#221D18`）与原图物理像素宽度上限（585px / 560px）、移除高低错位、拉开卡片与面板纸墨对比、紧凑版 `.footer`
  - `src/historical-map.css`：`.map-relief` 透明度调至 `0.48`，突出墨色等高/岸线、灰蓝主河道与朱砂行军路线
  - `src/editorial-motion.js`：移除已删除的 `.hero-archive` 与 `.continuation-plate` 选择器，确保 `.emblem-figure` 不被任何动效函数触碰

- [ ] **Step 1: 在 `tests/site.test.js` 编写 CSS 与动效边界的失败测试**

在 `tests/site.test.js` 新增测试 `print-atlas stylesheet enforces emblem backing, archive native-pixel caps and static emblem rule`：

```js
test('print-atlas stylesheet enforces emblem backing, archive native-pixel caps and static emblem rule', async () => {
  const css = await readFile(join(root, 'src/print-atlas.css'), 'utf8');
  const motion = await readFile(join(root, 'src/editorial-motion.js'), 'utf8');
  assert.match(css, /\.emblem-seal\s*\{[^}]*background:\s*#7A1E1A/i);
  assert.match(css, /\.archives-grid\s*\{[^}]*background:\s*#221D18/i);
  assert.match(css, /max-width:\s*585px/);
  assert.doesNotMatch(css, /\.archives-grid figure:nth-child\(even\)\s*\{\s*margin-top:\s*28px/);
  assert.doesNotMatch(motion, /emblem-figure|emblem-seal/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/site.test.js`
Expected: FAIL（`src/print-atlas.css` 尚未包含 `.emblem-seal` 与深色 `.archives-grid` 规则）

- [ ] **Step 3: 实现样式、动效选择器清理与文档同步**

1. 在 `src/print-atlas.css` 中：
   - 新增 `.emblem-figure`（水平排列、内边距与边框克制）与 `.emblem-seal`（`background: #7A1E1A; padding: 8px; display: inline-flex;`），确保金黄色党徽在深红方章上清晰庄重、绝不透底。
   - 调整桌面端 `.opening`：移除 `.hero-archive` 相关网格行与样式；将 `.opening::after` 遮罩从覆盖整张图的浓重黑褐改为仅衬托左侧文字区的柔和墨色渐变，让右侧木刻峡谷、赤砂岩崖壁与浮桥完整显露。
   - 将 `.archives-grid` 改为深色档案陈列柜（`background: #221D18; color: #F2ECE1; padding: clamp(24px, 4vw, 44px);`），内部图片容器设 `max-width: 585px`（第二张 `max-width: 560px`），统一图片框高度与底边对齐，删除 `figure:nth-child(even) { margin-top: 28px }`；确保 `.archives-grid figcaption` 及段落字号 `>= 16px`、浅色文字对比度充足。
   - 为 `.context-note`、`.map-relation`、`.disclosure` 拉开宣纸白（`#F7F2E7`）与页面底色（`#EFE6D5`）的纸墨层次，加 `1.5px solid var(--ink)` 顶边线，消除「米色叠米色」的沉闷感。
   - 收紧 `.continuation` 与 `.footer` 的垂直留白，将 `.footer` 改为紧凑的印记式页脚（`padding-block: 28px`）。
2. 在 `src/historical-map.css` 中：
   - 将 `.map-relief` 的 `opacity` 从 `.82` 调整为 `.48`，并将 `#route-map .river` 的 `stroke-width` 调为 `5.5`，使赤水河道与朱砂路线在纸面更加醒目。
3. 在 `src/editorial-motion.js` 中：
   - 将第 576 行 `addScene('.continuation-plate', ...)` 删除，将第 684 行 `all('.hero-art, .hero-archive')` 简化为 `all('.hero-art')`，确保 `.emblem-figure` 永不参与动效。
4. 更新 `docs/assets.md`（记录新木刻河谷图的尺寸、字节数、SHA-256 与木刻示意说明，以及 `public/party-emblem.svg` 的 420 字节、SHA-256 与 PD-China 来源说明）、`docs/design-decisions.md`、`docs/deployment.md`、`docs/verification.md` 与 `README.md`（同步 35 个构建文件与测试计数）。

- [ ] **Step 4: 运行全量 Node 测试、构建检查与 Brave 浏览器 17 项验收**

Run:
1. `node scripts/render-history.mjs --check`
2. `node scripts/prepare-images.mjs --check`
3. `node --test`
4. 启动本地静态服务并用 Brave MCP 执行 `scripts/verify-browser.mjs`（验证 `pass: true, expectedChecks: 17`，截取桌面 1440px 与手机 390px 前后对比图，完成后关闭浏览器并清理临时文件）。

Expected: 全量 Node 测试 PASS，`verify-browser.mjs` 17/17 PASS，0 console/page error。

- [ ] **Step 5: 提交 Task 3**

```bash
git add src/print-atlas.css src/historical-map.css src/editorial-motion.js docs/assets.md docs/design-decisions.md docs/deployment.md docs/verification.md README.md tests/site.test.js
git commit -m "style: refine woodcut hero, dark archive cabinet, map contrast and docs"
```
