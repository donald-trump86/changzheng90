async (page) => {
  // Run only through the controller's dedicated Brave MCP, using its supplied page.
  // Browser policy permits only this temporary QA output root (no deliverable claim).
  const artifacts = '/tmp/dsh-browser-output/brave-agent';
  const base = 'http://127.0.0.1:4173/';
  const originalViewport = page.viewportSize();
  const checks = [], screenshots = [], errors = [], sandboxMessages = [];
  let phase = 'app';
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const recordError = (kind, text) => {
    const expected = phase === 'noscript' && kind === 'console' && /Blocked script execution|blocked.*script.*sandbox|sandbox.*allow-scripts/i.test(text);
    const list = expected ? sandboxMessages : errors;
    if (list.length < 30) list.push({ kind, phase, text: text.slice(0, 600) });
  };
  const consoleListener = (message) => { if (message.type() === 'error') recordError('console', message.text()); };
  const pageErrorListener = (error) => recordError('pageerror', error.message);
  const requestListener = (request) => recordError('requestfailed', `${request.url()} ${request.failure()?.errorText}`);
  const responseListener = (response) => { if (response.status() >= 400) recordError('http', `${response.status()} ${response.url()}`); };
  const check = async (name, run) => {
    try { const evidence = await run(); checks.push({ name, pass: true, evidence }); }
    catch (error) { checks.push({ name, pass: false, error: String(error.message).slice(0, 1200) }); }
  };
  async function shot(name) {
    const path = `${artifacts}/${name}.png`;
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    screenshots.push(path);
  }
  const start = () => page.getByRole('button', { name: '开始阅读', exact: true }).first();
  const jump = (chapter) => page.getByRole('navigation', { name: '选择渡河章节' })
    .getByRole('button', { name: new RegExp(`^${chapter.title.slice(0, 2)}`) });
  async function openApp() {
    const response = await page.goto(base, { waitUntil: 'networkidle', timeout: 15000 });
    assert(response?.status() === 200, 'local app must respond HTTP 200');
    await start().waitFor({ state: 'visible', timeout: 5000 });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  async function layout(label) {
    const evidence = await page.evaluate(() => {
      const visible = (el) => el.checkVisibility() && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
      const paragraphs = [...document.querySelectorAll('p')].filter(visible).filter((el) => !el.classList.contains('sr-only'));
      const controls = [...document.querySelectorAll('button, a.button, .quiz label')].filter(visible);
      const badText = paragraphs.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.textContent.slice(0, 60));
      const badControls = controls.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 44 || r.height < 44 || r.left < -1 || r.right > innerWidth + 1 || r.top + scrollY < -1 || r.bottom + scrollY > document.documentElement.scrollHeight + 1;
      }).map((el) => el.textContent.trim().slice(0, 60));
      return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
        paragraphCount: paragraphs.length, controlCount: controls.length, badText, badControls };
    });
    assert(evidence.documentWidth <= evidence.width + 1 && evidence.bodyWidth <= evidence.width + 1, `${label}: horizontal overflow ${JSON.stringify(evidence)}`);
    assert(evidence.paragraphCount > 0 && evidence.controlCount > 0, `${label}: reachable body and controls missing`);
    assert(!evidence.badText.length && !evidence.badControls.length, `${label}: ${JSON.stringify(evidence)}`);
    return evidence;
  }
  async function chapterState(chapter, revealed) {
    await page.getByRole('heading', { name: chapter.title, exact: true }).waitFor({ state: 'visible', timeout: 3000 });
    assert(await page.locator('#chapter-date').textContent() === `${chapter.date} · ${chapter.direction === 'west' ? '西渡' : '东渡'}`, 'rendered shared date/direction mismatch');
    assert(await page.getByText(chapter.situation, { exact: true }).isVisible(), 'situation missing');
    for (const key of ['action', 'result', 'insight']) assert(await page.getByText(chapter[key], { exact: true }).isVisible() === revealed, `${key}: stale or missing reveal`);
    const routes = await page.locator('#map [data-route]').evaluateAll((nodes) => nodes.map((node) => ({ id: Number(node.dataset.route), visible: !node.hasAttribute('hidden'), current: node.classList.contains('current-route') })));
    assert(routes.length === 4 && routes.every((route) => route.visible === (route.id < chapter.id || (route.id === chapter.id && revealed))), `route visibility ${JSON.stringify(routes)}`);
    assert(routes.find((route) => route.id === chapter.id)?.current, 'current route marker missing');
    assert(await jump(chapter).getAttribute('aria-current') === 'step', 'chapter selection missing text/semantic marker');
    const announcement = await page.getByRole('status').first().textContent();
    assert(announcement.includes(chapter.title) && announcement.includes(chapter.date), 'live chapter announcement missing');
  }
  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);
  page.on('requestfailed', requestListener);
  page.on('response', responseListener);
  try {
    await openApp();
    // This is the same publicly importable data used by the UI, never a hidden app global.
    const story = await page.evaluate(async () => {
      const { chapters, epilogue, questions, sources } = await import('./src/story.js');
      return { chapters, epilogue, questions, sources };
    });
    const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }, { width: 320, height: 844 }];
    for (const viewport of viewports) {
      const width = viewport.width;
      await check(`${width}: cover, full story, reveal, routes, epilogue, layout`, async () => {
        await page.setViewportSize(viewport);
        await openApp();
        // Measure BEFORE any click/locator action that can auto-scroll.
        const firstAction = await start().boundingBox();
        if (width === 390) assert(firstAction && firstAction.y >= 0 && firstAction.y + firstAction.height <= viewport.height, `first action outside 390×844 viewport: ${JSON.stringify(firstAction)}`);
        const coverLayout = await layout('cover');
        await shot(`${width}-cover`);
        await start().click({ timeout: 5000 });
        const chapterLayouts = [];
        for (const chapter of story.chapters) {
          await chapterState(chapter, false);
          await page.getByRole('button', { name: '展开路线', exact: false }).click({ timeout: 5000 });
          await chapterState(chapter, true);
          assert(await page.getByRole('button', { name: '路线已展开', exact: true }).isDisabled(), 'revealed control should indicate completion');
          chapterLayouts.push(await layout(chapter.title));
          if (chapter.id === 2 || chapter.id === 4) await shot(`${width}-chapter-${chapter.id}`);
          await page.getByRole('button', { name: chapter.id === 4 ? '阅读尾声 →' : '下一渡 →', exact: true }).click({ timeout: 5000 });
        }
        await page.getByRole('heading', { name: story.epilogue.title, exact: true }).waitFor({ state: 'visible', timeout: 3000 });
        assert(await page.getByText(story.epilogue.body, { exact: true }).isVisible(), 'epilogue body missing');
        assert(await page.getByText(story.epilogue.reflection, { exact: true }).isVisible(), 'author interpretation missing');
        const epilogueLayout = await layout('epilogue/quiz');
        await shot(`${width}-epilogue`);
        return { firstAction, coverLayout, chapterLayouts, epilogueLayout };
      });
      await check(`${width}: reverse/direct/rapid navigation, back, reset, reload, unknown hash`, async () => {
        for (const chapter of [...story.chapters].reverse()) {
          await jump(chapter).click({ timeout: 5000 });
          await chapterState(chapter, false);
          await page.getByRole('button', { name: '展开路线', exact: false }).click({ timeout: 5000 });
          await chapterState(chapter, true);
          await page.getByRole('button', { name: chapter.id === 1 ? '返回开场' : '← 上一渡', exact: true }).click({ timeout: 5000 });
          if (chapter.id > 1) await chapterState(story.chapters[chapter.id - 2], false);
          else assert(await start().isVisible(), 'PREV from first chapter must return cover');
        }
        for (const id of [3, 1, 4, 2, 4, 1]) await jump(story.chapters[id - 1]).click({ delay: 0, timeout: 5000 });
        await chapterState(story.chapters[0], false);
        await page.getByRole('button', { name: '重新开始', exact: false }).click({ timeout: 5000 });
        assert(await start().isVisible(), 'restart did not show cover');
        await jump(story.chapters[3]).click({ timeout: 5000 });
        await page.reload({ waitUntil: 'networkidle' });
        assert(await start().isVisible(), 'reload must start on cover');
        await page.goto(`${base}#unrecognized`, { waitUntil: 'networkidle' });
        assert(await start().isVisible(), 'unknown hash must show cover');
        return 'reverse jumps/reveal/back, six immediate jumps, restart, reload and unknown hash passed';
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp();
    await jump(story.chapters[3]).click({ timeout: 5000 });
    await page.getByRole('button', { name: '阅读尾声 →', exact: true }).click({ timeout: 5000 });
    await check('both quizzes: real keyboard focus, rendered contrast, wrong/correct reselection and explanations', async () => {
      const evidence = [];
      for (const [index, question] of story.questions.entries()) {
        const group = page.getByRole('group', { name: question.prompt, exact: true });
        const firstRadio = group.getByRole('radio').first();
        let reached = false;
        for (let i = 0; i < 45; i++) {
          await page.keyboard.press('Tab');
          reached = await firstRadio.evaluate((el) => el === document.activeElement && el.matches(':focus-visible'));
          if (reached) break;
        }
        assert(reached, `keyboard did not reach quiz ${index + 1} radio with :focus-visible`);
        // Native focus can start a smooth viewport scroll. Observe it settling; never force-scroll.
        const settle = await firstRadio.evaluate(async (el) => {
          const started = performance.now();
          let previousTop, stableSamples = 0, sample;
          do {
            const r = el.getBoundingClientRect();
            const focused = el === document.activeElement && el.matches(':focus-visible');
            const inViewport = r.top >= 0 && r.bottom <= innerHeight;
            stableSamples = focused && inViewport && previousTop !== undefined && Math.abs(r.top - previousTop) < 0.5 ? stableSamples + 1 : 0;
            sample = { top: r.top, bottom: r.bottom, viewportHeight: innerHeight, scrollY, focused, inViewport, elapsedMs: performance.now() - started };
            if (stableSamples >= 2) return { ...sample, settled: true };
            previousTop = r.top;
            await new Promise((resolve) => setTimeout(resolve, 25));
          } while (performance.now() - started < 2000);
          return { ...sample, settled: false };
        });
        const focus = await firstRadio.evaluate((el) => {
          const style = getComputedStyle(el);
          let ancestor = el.parentElement, background;
          while (ancestor) {
            const value = getComputedStyle(ancestor).backgroundColor;
            if (value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') { background = value; break; }
            ancestor = ancestor.parentElement;
          }
          const luminance = (value) => {
            const rgb = value.match(/[\d.]+/g).slice(0, 3).map(Number).map((n) => n / 255).map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          const values = [luminance(style.outlineColor), luminance(background)].sort((a, b) => b - a);
          const r = el.getBoundingClientRect();
          return { outline: style.outlineColor, background, width: style.outlineWidth, style: style.outlineStyle,
            contrast: (values[0] + 0.05) / (values[1] + 0.05), focused: el === document.activeElement && el.matches(':focus-visible'),
            top: r.top, bottom: r.bottom, viewportHeight: innerHeight, scrollY, inViewport: r.top >= 0 && r.bottom <= innerHeight };
        });
        assert(settle.settled && focus.focused && focus.style !== 'none' && parseFloat(focus.width) > 0 && focus.contrast >= 3 && focus.inViewport,
          `quiz ${index + 1} rendered focus failed: ${JSON.stringify({ ...focus, settle })}`);
        await shot(`390-quiz-${index + 1}-keyboard-focus`);
        const wrong = (question.answer + 1) % question.options.length;
        await group.getByRole('radio', { name: question.options[wrong], exact: true }).check({ timeout: 5000 });
        assert((await group.getByRole('status').textContent()).includes(`再想一想，可以重新选择。${question.explanation}`), 'wrong-answer explanation missing');
        await group.getByRole('radio', { name: question.options[question.answer], exact: true }).check({ timeout: 5000 });
        assert((await group.getByRole('status').textContent()).includes(`回答正确。${question.explanation}`), 'correct-answer explanation missing');
        evidence.push({ quiz: index + 1, ...focus, settle });
      }
      await page.getByRole('button', { name: '回看全程', exact: true }).click({ timeout: 5000 });
      await chapterState(story.chapters[0], false);
      return evidence;
    });
    await check('source dialog: source links, Tab containment, Escape/outside/close and restored trigger focus', async () => {
      const trigger = page.getByRole('button', { name: /^史料来源/ }).first();
      const dialog = page.getByRole('dialog', { name: '史料来源', exact: true });
      const focusedTrigger = () => trigger.evaluate((el) => el === document.activeElement);
      const close = dialog.getByRole('button', { name: /^关闭/ });
      try {
        await trigger.click({ timeout: 5000 });
        await dialog.waitFor({ state: 'visible', timeout: 3000 });
        assert(await close.evaluate((el) => el === document.activeElement), 'dialog did not take focus');
        for (const source of story.sources) assert(await dialog.getByRole('link', { name: `${source.title} ↗`, exact: true }).getAttribute('href') === source.url, 'source link mismatch');
        for (const key of ['Tab', 'Shift+Tab']) for (let i = 0; i < 12; i++) {
          await page.keyboard.press(key);
          const active = await dialog.evaluate((el) => ({ contained: el.contains(document.activeElement), tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 100) }));
          assert(active.contained, `focus escaped on ${key} step ${i + 1}: ${JSON.stringify(active)}`);
        }
        await layout('source dialog');
        await shot('390-source-dialog');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden', timeout: 3000 });
        assert(await focusedTrigger(), 'Escape did not close/restore focus');
        await trigger.click({ timeout: 5000 });
        const bounds = await dialog.boundingBox();
        assert(bounds && bounds.x > 2, 'no outside backdrop coordinate');
        await page.mouse.click(2, 2);
        await dialog.waitFor({ state: 'hidden', timeout: 3000 });
        assert(await focusedTrigger(), 'outside dismissal did not restore focus');
        await trigger.click({ timeout: 5000 });
        await close.click({ timeout: 3000 });
        await dialog.waitFor({ state: 'hidden', timeout: 3000 });
        assert(await focusedTrigger(), 'close button did not restore focus');
        return { sources: story.sources.length, tabChecks: 24, dismissalModes: 3 };
      } finally {
        if (await dialog.isVisible()) {
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden', timeout: 3000 });
        }
      }
    });
    await check('local PNG signature, native decoding, download and visible open-image fallback', async () => {
      await jump(story.chapters[3]).click({ timeout: 5000 });
      await page.getByRole('button', { name: '阅读尾声 →', exact: true }).click({ timeout: 5000 });
      await page.getByRole('button', { name: '制作纪念卡', exact: false }).click({ timeout: 5000 });
      const preview = page.getByRole('img', { name: /^四渡赤水纪念卡：/ });
      await preview.waitFor({ state: 'visible', timeout: 10000 });
      const png = await preview.evaluate(async (img) => {
        await img.decode();
        const blob = await (await fetch(img.src)).blob();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        return { signature: [...bytes.slice(0, 8)], bytes: bytes.length, type: blob.type, width: img.naturalWidth, height: img.naturalHeight, url: img.src };
      });
      assert(JSON.stringify(png.signature) === '[137,80,78,71,13,10,26,10]' && png.type === 'image/png' && png.width === 1080 && png.height === 1440 && png.url.startsWith('blob:'), `PNG invalid: ${JSON.stringify(png)}`);
      const downloadLink = page.getByRole('link', { name: '下载纪念卡', exact: true });
      const openLink = page.getByRole('link', { name: '打开图片', exact: false });
      assert(await downloadLink.getAttribute('href') === png.url && await openLink.getAttribute('href') === png.url, 'fallback/download must use generated local PNG');
      await layout('share preview');
      await shot('390-share-preview');
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await downloadLink.click({ timeout: 5000 });
      const download = await downloadPromise;
      await download.saveAs(`${artifacts}/chishui-card.png`);
      assert(await download.failure() === null, 'download failed');
      // Exercise the actual visible link in this supplied page; avoid opening another tab.
      const originalTarget = await openLink.getAttribute('target');
      try {
        await openLink.evaluate((el) => el.setAttribute('target', '_self'));
        await openLink.click({ timeout: 5000 });
        await page.waitForURL(/^blob:/, { timeout: 5000 });
        const native = await page.locator('img').evaluate(async (img) => { await img.decode(); return { width: img.naturalWidth, height: img.naturalHeight }; });
        assert(native.width === 1080 && native.height === 1440, 'native open-image fallback did not decode');
        await shot('390-native-png');
      } finally {
        // Navigation discards the temporary link attribute; a fresh app restores its original markup.
        await openApp();
        assert(await page.getByRole('link', { name: '打开图片', exact: false, includeHidden: true }).getAttribute('target') === originalTarget, 'link target was not restored');
      }
      return { ...png, url: 'local blob URL', download: `${artifacts}/chishui-card.png` };
    });
    await check('reduced motion: revealed final route is complete immediately', async () => {
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openApp();
        await jump(story.chapters[3]).click({ timeout: 5000 });
        await page.getByRole('button', { name: '展开路线', exact: false }).click({ timeout: 5000 });
        await chapterState(story.chapters[3], true);
        const motion = await page.locator('#map .current-route .march-line').evaluate((el) => {
          const style = getComputedStyle(el);
          return { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, animation: style.animationName, offset: style.strokeDashoffset, length: el.getTotalLength() };
        });
        assert(motion.reduced && motion.animation === 'none' && parseFloat(motion.offset) === 0 && motion.length > 0, `route incomplete: ${JSON.stringify(motion)}`);
        await shot('390-reduced-motion-final-route');
        return motion;
      } finally { await page.emulateMedia({ reducedMotion: null }); }
    });
    await check('genuinely disabled scripting: sandboxed same-origin iframe exposes full noscript narrative', async () => {
      phase = 'noscript';
      try {
        await page.setContent(`<head><link rel="icon" type="image/svg+xml" href="./public/favicon.svg"></head><body><iframe title="无脚本阅读验证" sandbox="allow-same-origin" src="${base}" style="border:0;width:100%;height:800px"></iframe></body>`, { waitUntil: 'networkidle', timeout: 15000 });
        const frame = page.frameLocator('iframe[title="无脚本阅读验证"]');
        await frame.getByText('当前未启用 JavaScript，以下可阅读四次渡河全文与史料来源。', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
        for (const chapter of story.chapters) {
          assert(await frame.getByRole('heading', { name: chapter.title, exact: true }).isVisible(), 'no-script heading missing');
          for (const key of ['situation', 'action', 'result', 'insight']) assert(await frame.getByText(chapter[key], { exact: true }).isVisible(), `no-script ${key} missing`);
          assert(await frame.getByText(`${chapter.date} · ${chapter.direction === 'west' ? '西渡' : '东渡'}`, { exact: true }).isVisible(), 'no-script date/direction missing');
        }
        for (const value of Object.values(story.epilogue)) assert(await frame.getByText(value, { exact: true }).isVisible(), 'no-script epilogue missing');
        for (const source of story.sources) assert(await frame.getByRole('link', { name: source.title, exact: true }).getAttribute('href') === source.url, 'no-script source missing');
        assert(!await frame.getByRole('button', { name: '开始阅读', exact: true }).first().isVisible(), 'sandbox unexpectedly executed app');
        const dimensions = await frame.locator('body').evaluate((body) => ({ width: body.ownerDocument.documentElement.clientWidth, scrollWidth: body.scrollWidth, textSize: getComputedStyle(body).fontSize }));
        assert(dimensions.scrollWidth <= dimensions.width + 1 && parseFloat(dimensions.textSize) >= 16, `no-script layout ${JSON.stringify(dimensions)}`);
        const fullHeight = await frame.locator('body').evaluate((body) => body.ownerDocument.documentElement.scrollHeight);
        await page.locator('iframe').evaluate((el, height) => { el.style.height = `${height + 20}px`; }, fullHeight);
        await page.screenshot({ path: `${artifacts}/390-noscript-full-narrative.png`, fullPage: true, animations: 'disabled' });
        screenshots.push(`${artifacts}/390-noscript-full-narrative.png`);
        return { chapters: story.chapters.length, dimensions, semantics: 'iframe sandbox allows same origin and deliberately omits allow-scripts' };
      } finally {
        await openApp();
        phase = 'app';
      }
    });
  } catch (error) {
    checks.push({ name: 'harness setup/execution', pass: false, error: String(error.message).slice(0, 1200) });
  } finally {
    // No context/page is created or closed. Remove every listener and media override we own.
    try { await page.emulateMedia({ reducedMotion: null }); }
    finally {
      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
      page.off('requestfailed', requestListener);
      page.off('response', responseListener);
      if (originalViewport) await page.setViewportSize(originalViewport);
    }
  }
  return { pass: checks.every((item) => item.pass) && errors.length === 0, checks, errors, expectedSandboxMessages: sandboxMessages, screenshots,
    limits: ['localhost Chromium evidence only; no real WeChat or mainland-network claim', 'visual critique belongs to controller screenshot review', 'media override reset to browser preference; supplied viewport restored'] };
}
