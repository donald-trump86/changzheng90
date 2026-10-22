async (page) => {
  // Run only through the controller's dedicated Brave MCP, using its supplied page.
  // Browser policy permits only this temporary QA output root (no deliverable claim).
  const artifacts = '/tmp/dsh-browser-output/brave-agent';
  const base = 'http://127.0.0.1:4173/';
  const originalViewport = page.viewportSize();
  const checks = [], screenshots = [], errors = [], sandboxMessages = [], expectedMediaAborts = [];
  const mediaURL = new URL('public/internationale.mp3', base).href;
  const inFlightMedia = new Set(), intentionalMediaCancellation = new Map();
  const markMediaCancellation = (reason) => {
    // Only Request objects already in flight before this exact replacement/navigation qualify.
    for (const request of inFlightMedia) intentionalMediaCancellation.set(request, reason);
  };
  const mediaRequestListener = (request) => {
    if (request.url() === mediaURL && request.method() === 'GET') inFlightMedia.add(request);
  };
  const requestFinishedListener = (request) => {
    inFlightMedia.delete(request);
    intentionalMediaCancellation.delete(request);
  };
  let phase = 'app';
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const recordError = (kind, text) => {
    const expected = phase === 'noscript' && kind === 'console' && /Blocked script execution|blocked.*script.*sandbox|sandbox.*allow-scripts/i.test(text);
    const list = expected ? sandboxMessages : errors;
    if (list.length < 30) list.push({ kind, phase, text: text.slice(0, 600) });
  };
  const consoleListener = (message) => { if (message.type() === 'error') recordError('console', message.text()); };
  const pageErrorListener = (error) => recordError('pageerror', error.message);
  const requestListener = (request) => {
    const error = request.failure()?.errorText;
    const reason = intentionalMediaCancellation.get(request);
    if (reason && request.url() === mediaURL && error === 'net::ERR_ABORTED') {
      expectedMediaAborts.push({ url: request.url(), error, reason, phase });
    } else recordError('requestfailed', `${request.url()} ${error}`);
    requestFinishedListener(request);
  };
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
    markMediaCancellation('explicit app navigation discards the current audio fixture');
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
    const announcement = await page.locator('#announcement').textContent();
    assert(announcement.includes(chapter.title) && announcement.includes(chapter.date), 'live chapter announcement missing');
  }
  async function routeSample() {
    return page.locator('#map .current-route').evaluate((group) => {
      const path = group.querySelector('.march-line');
      const style = getComputedStyle(path);
      const map = group.closest('svg').getBoundingClientRect();
      const length = path.getTotalLength();
      const offset = parseFloat(style.strokeDashoffset);
      const screenPoint = (distance) => {
        const p = path.getPointAtLength(distance);
        const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM());
        return { x: screen.x, y: screen.y, inViewport: screen.x >= 0 && screen.x <= innerWidth && screen.y >= 0 && screen.y <= innerHeight };
      };
      const head = group.querySelector('.march-point');
      const actualHead = new DOMPoint(Number(head.getAttribute('cx')), Number(head.getAttribute('cy'))).matrixTransform(path.getScreenCTM());
      const drawnHead = screenPoint(length * (1 - offset));
      return { time: performance.now(), offset, length, drawnLength: length * (1 - offset), stroke: style.stroke,
        dasharray: style.strokeDasharray, marker: style.markerEnd, display: style.display,
        visible: !group.hasAttribute('hidden') && path.checkVisibility(), drawing: group.classList.contains('is-drawing'),
        map: { top: map.top, bottom: map.bottom, height: map.height, wholeInViewport: map.top >= 0 && map.bottom <= innerHeight },
        start: screenPoint(0), end: screenPoint(length), drawnHead,
        headError: Math.hypot(actualHead.x - drawnHead.x, actualHead.y - drawnHead.y),
        pointDisplay: getComputedStyle(head).display, pathCount: group.querySelectorAll('path').length };
    });
  }
  async function actualDraw(label, replay = false) {
    // Native click may scroll the CONTROL; the APP must then position its map itself.
    await page.getByRole('button', { name: replay ? '重播路线' : '展开路线', exact: true }).click({ timeout: 5000 });
    await page.waitForFunction(() => {
      const path = document.querySelector('#map .current-route .march-line');
      const offset = parseFloat(getComputedStyle(path).strokeDashoffset);
      return offset < 0.96 && offset > 0.65;
    }, null, { timeout: 1500 });
    const early = await routeSample();
    await page.waitForTimeout(440);
    const middle = await routeSample();
    for (const sample of [early, middle]) {
      assert(sample.visible && sample.display !== 'none' && sample.stroke !== 'none' && sample.pathCount === 1,
        `${label}: single rendered stroke missing ${JSON.stringify(sample)}`);
      assert(sample.map.wholeInViewport && sample.start.inViewport && sample.end.inViewport && sample.drawnHead.inViewport,
        `${label}: drawing offscreen ${JSON.stringify(sample)}`);
      assert(sample.drawing && sample.offset > 0 && sample.offset < 1 && sample.marker === 'none' && sample.pointDisplay !== 'none' && sample.headError < 2,
        `${label}: unfinished stroke/head/endpoint mismatch ${JSON.stringify(sample)}`);
    }
    const measuredDuration = (middle.time - early.time) / (early.offset - middle.offset);
    assert(early.offset > middle.offset && early.drawnLength < middle.drawnLength && measuredDuration >= 1600 && measuredDuration <= 2200,
      `${label}: no visible 1.6–2.2s progression ${JSON.stringify({ early, middle, measuredDuration })}`);
    if (label.includes('replay')) {
      const path = `${artifacts}/${label}-drawing.png`;
      await page.screenshot({ path, fullPage: false });
      screenshots.push(path);
    }
    await page.waitForFunction(() => {
      const group = document.querySelector('#map .current-route');
      return !group.classList.contains('is-drawing') && parseFloat(getComputedStyle(group.querySelector('.march-line')).strokeDashoffset) === 0;
    }, null, { timeout: 2500 });
    const complete = await routeSample();
    assert(complete.offset === 0 && complete.marker.includes('march-arrow') && complete.pointDisplay === 'none', `${label}: incomplete terminal route`);
    return { early, middle, complete, measuredDuration };
  }
  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);
  page.on('request', mediaRequestListener);
  page.on('requestfinished', requestFinishedListener);
  page.on('requestfailed', requestListener);
  page.on('response', responseListener);
  try {
    await openApp();
    // This is the same publicly importable data used by the UI, never a hidden app global.
    const story = await page.evaluate(async () => {
      const { chapters, epilogue, questions, sources } = await import('./src/story.js');
      return { chapters, epilogue, questions, sources };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const viewports = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }, { width: 320, height: 844 }];
    for (const viewport of viewports) {
      const width = viewport.width;
      await check(`${width}: cover, full story, reveal, routes, epilogue, layout`, async () => {
        await page.setViewportSize(viewport);
        await openApp();
        // Measure BEFORE any click/locator action that can auto-scroll.
        const firstAction = await start().boundingBox();
        assert(firstAction && firstAction.y >= 0 && firstAction.y + firstAction.height <= viewport.height, `first action outside ${width}×${viewport.height} viewport: ${JSON.stringify(firstAction)}`);
        const opening = await page.evaluate(() => {
          const heading = document.querySelector('h1');
          const map = document.querySelector('#map').getBoundingClientRect();
          return { headingSize: parseFloat(getComputedStyle(heading).fontSize), headingHeight: heading.getBoundingClientRect().height,
            mapTop: map.top, mapBottom: map.bottom, mapHeight: map.height,
            entries: [...document.querySelectorAll('[data-event="START"]')].filter((el) => el.checkVisibility()).length };
        });
        assert(opening.headingSize >= (width <= 640 ? 30 : 36) && opening.headingSize <= (width <= 640 ? 36 : 56), `oversized title ${JSON.stringify(opening)}`);
        assert(opening.mapTop >= 0 && opening.mapBottom <= viewport.height && opening.mapHeight > opening.headingHeight * 3 && opening.entries === 1,
          `actual map/one entry must dominate first screen ${JSON.stringify(opening)}`);
        const singlePaths = await page.locator('#map [data-route]').evaluateAll((groups) => groups.map((group) => {
          const paths = group.querySelectorAll('path');
          const d = paths[0]?.getAttribute('d') ?? '';
          return { id: group.dataset.route, paths: paths.length, moves: (d.match(/m/gi) ?? []).length, continuous: /^M/i.test(d), d };
        }));
        assert(singlePaths.length === 4 && singlePaths.every((item) => item.paths === 1 && item.moves === 1 && item.continuous), `disjoint/extra crossing paths ${JSON.stringify(singlePaths)}`);
        const coverLayout = await layout('cover');
        assert(!await page.locator('body').evaluate((el) => /戴诗旭|Jason Dai/i.test(el.textContent)), 'personal identity in current page');
        await shot(`${width}-cover`);
        await start().click({ timeout: 5000 });
        const chapterLayouts = [], draws = [];
        for (const chapter of story.chapters) {
          await chapterState(chapter, false);
          draws.push(await actualDraw(`${width}-chapter-${chapter.id}`));
          await chapterState(chapter, true);
          assert(await page.getByRole('button', { name: '重播路线', exact: true }).isEnabled(), 'reachable replay control missing');
          if (chapter.id === 1) {
            const focus = await page.locator('#reveal').evaluate((el) => el === document.activeElement);
            assert(focus, 'positioning the map stole focus from reveal');
            draws.push(await actualDraw(`${width}-replay`, true));
          }
          chapterLayouts.push(await layout(chapter.title));
          if (chapter.id === 2 || chapter.id === 4) await shot(`${width}-chapter-${chapter.id}`);
          await page.getByRole('button', { name: chapter.id === 4 ? '阅读尾声 →' : '下一渡 →', exact: true }).click({ timeout: 5000 });
        }
        await page.getByRole('heading', { name: story.epilogue.title, exact: true }).waitFor({ state: 'visible', timeout: 3000 });
        assert(await page.getByText(story.epilogue.body, { exact: true }).isVisible(), 'epilogue body missing');
        assert(await page.getByText(story.epilogue.reflection, { exact: true }).isVisible(), 'author interpretation missing');
        const epilogueLayout = await layout('epilogue/quiz');
        await shot(`${width}-epilogue`);
        return { firstAction, opening, singlePaths, draws, coverLayout, chapterLayouts, epilogueLayout };
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
        await jump(story.chapters[0]).click({ timeout: 5000 });
        await page.getByRole('button', { name: '展开路线', exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(180);
        const beforeCancel = await routeSample();
        assert(beforeCancel.offset > 0 && beforeCancel.offset < 1, 'cancel fixture never drew');
        await page.getByRole('button', { name: '下一渡 →', exact: true }).click({ timeout: 5000 });
        await chapterState(story.chapters[1], false);
        await page.waitForTimeout(180);
        const cancelled = await page.locator('#map [data-route]').evaluateAll((groups) => groups.map((group) => ({
          id: Number(group.dataset.route), drawing: group.classList.contains('is-drawing'),
          offset: parseFloat(getComputedStyle(group.querySelector('.march-line')).strokeDashoffset),
          visible: !group.hasAttribute('hidden'), paths: group.querySelectorAll('path').length,
        })));
        assert(cancelled.every((route) => !route.drawing && route.offset === 0 && route.paths === 1 && route.visible === (route.id === 1)), `ghost route after cancellation ${JSON.stringify(cancelled)}`);
        // A rapid replay followed immediately by reset must also cancel its pending paint frames.
        await jump(story.chapters[0]).click({ timeout: 5000 });
        await page.getByRole('button', { name: '展开路线', exact: true }).click({ timeout: 5000 });
        await page.getByRole('button', { name: '重播路线', exact: true }).click({ timeout: 5000 });
        await page.getByRole('button', { name: '重新开始', exact: false }).click({ timeout: 5000 });
        await page.waitForTimeout(150);
        assert(await page.locator('#map .is-drawing').count() === 0, 'pending replay survived reset');
        for (const id of [3, 1, 4, 2, 4, 1]) await jump(story.chapters[id - 1]).click({ delay: 0, timeout: 5000 });
        await chapterState(story.chapters[0], false);
        await page.getByRole('button', { name: '重新开始', exact: false }).click({ timeout: 5000 });
        assert(await start().isVisible(), 'restart did not show cover');
        await jump(story.chapters[3]).click({ timeout: 5000 });
        await page.reload({ waitUntil: 'networkidle' });
        assert(await start().isVisible(), 'reload must start on cover');
        await page.goto(`${base}#unrecognized`, { waitUntil: 'networkidle' });
        assert(await start().isVisible(), 'unknown hash must show cover');
        return { navigation: 'reverse jumps/reveal/back, six immediate jumps, restart, reload and unknown hash passed', beforeCancel, cancelled, pendingReplayReset: true };
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
        assert(await dialog.locator('#sources-list a').count() === 2, 'two historical references remain separate from asset credits');
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
      // Observe actual Canvas text, then restore the native method even on failure.
      await page.evaluate(() => {
        const original = CanvasRenderingContext2D.prototype.fillText;
        window.__chishuiCanvasQA = { original, text: [] };
        CanvasRenderingContext2D.prototype.fillText = function (...args) {
          window.__chishuiCanvasQA.text.push(String(args[0]));
          return original.apply(this, args);
        };
      });
      try {
        await jump(story.chapters[3]).click({ timeout: 5000 });
        await page.getByRole('button', { name: '阅读尾声 →', exact: true }).click({ timeout: 5000 });
        await page.getByRole('button', { name: '制作纪念卡', exact: false }).click({ timeout: 5000 });
        const preview = page.getByRole('img', { name: /^四渡赤水纪念卡：/ });
        await preview.waitFor({ state: 'visible', timeout: 10000 });
        const png = await preview.evaluate(async (img) => {
          await img.decode();
          const blob = await (await fetch(img.src)).blob();
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
           const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
           return { signature: [...bytes.slice(0, 8)], bytes: bytes.length, type: blob.type, width: img.naturalWidth, height: img.naturalHeight, url: img.src, corner: [...ctx.getImageData(0, 0, 1, 1).data] };
        });
        assert(JSON.stringify(png.signature) === '[137,80,78,71,13,10,26,10]' && png.type === 'image/png' && png.width === 1080 && png.height === 1440 && png.url.startsWith('blob:'), `PNG invalid: ${JSON.stringify(png)}`);
        // Canvas readback may vary by 1 LSB; retain a tight red-only tolerance.
        assert(png.corner[3] === 255 && png.corner.slice(0, 3).every((value, index) => Math.abs(value - [165, 28, 39][index]) <= 2), `PNG must use red ground: ${JSON.stringify(png.corner)}`);
         const cardText = await page.evaluate(() => window.__chishuiCanvasQA.text);
         assert(cardText.length > 10 && !/戴诗旭|Jason Dai|作品作者：/i.test(cardText.join(' ')), 'personal identity in actual Canvas text');
         assert(!/作者|戴诗旭|Jason Dai/i.test(await preview.getAttribute('alt')), 'personal identity in card alt');
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
        }
        return { ...png, url: 'local blob URL', download: `${artifacts}/chishui-card.png`, cardText };
      } finally {
        await page.evaluate(() => {
          if (window.__chishuiCanvasQA) {
            CanvasRenderingContext2D.prototype.fillText = window.__chishuiCanvasQA.original;
            delete window.__chishuiCanvasQA;
          }
        });
      }
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
          return { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, animation: style.animationName, offset: style.strokeDashoffset, length: el.getTotalLength(), activeAnimations: document.getAnimations().filter((a) => a.playState === 'running').length, motion: document.body.dataset.motion };
        });
        assert(motion.reduced && motion.animation === 'none' && parseFloat(motion.offset) === 0 && motion.length > 0 && motion.activeAnimations === 0 && motion.motion === 'off', `route incomplete: ${JSON.stringify(motion)}`);
        await shot('390-reduced-motion-final-route');
        return motion;
      } finally { await page.emulateMedia({ reducedMotion: null }); }
    });
    await check('compact red opening, static standard emblem, real replay and terminal pause/reduce', async () => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      try {
        await openApp();
        const emblem = await page.getByRole('img', { name: '中国共产党党徽', exact: true }).evaluate(async (img) => {
          await img.decode();
          const text = await (await fetch(img.src)).text();
          return { width: img.naturalWidth, height: img.naturalHeight, bytes: new TextEncoder().encode(text).length,
            standard: text.includes('viewBox="1 1 32 32"') && /#fdcf30/i.test(text),
            animated: img.getAnimations({ subtree: true }).length, transform: getComputedStyle(img).transform,
            background: getComputedStyle(document.body).backgroundColor,
            caption: img.closest('figure').querySelector('figcaption').textContent };
        });
        assert(emblem.width === 320 && emblem.height === 320 && emblem.bytes === 420 && emblem.standard && emblem.animated === 0 && emblem.transform === 'none' && emblem.caption.includes('中国共产党党徽'), `emblem changed: ${JSON.stringify(emblem)}`);
        assert(emblem.background === 'rgb(165, 28, 39)', 'default page is not red');
        assert(await page.locator('.opening-landscape').count() === 0, 'redundant mountain banner remains');
        await start().click({ timeout: 5000 });
        const replay = await actualDraw('390-motion-replay-sequence');
        const repeated = await actualDraw('390-motion-replay', true);
        await page.getByRole('button', { name: '重播路线', exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(200);
        const beforePause = await routeSample();
        assert(beforePause.offset > 0 && beforePause.offset < 1, 'pause fixture never drew');
        await page.getByRole('button', { name: '暂停动画', exact: true }).click({ timeout: 5000 });
        const terminal = await routeSample();
        await page.waitForTimeout(160);
        const stopped = await routeSample();
        const active = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
        assert(terminal.offset === 0 && stopped.offset === 0 && !stopped.drawing && stopped.pointDisplay === 'none' && active === 0, `pause incomplete ${JSON.stringify({ terminal, stopped, active })}`);
        await page.getByRole('button', { name: '重播路线', exact: true }).click({ timeout: 5000 });
        assert((await routeSample()).offset === 0, 'motion-off replay should remain a complete static route');
        await shot('390-motion-paused-terminal');
        await page.getByRole('button', { name: '开启动画', exact: true }).click({ timeout: 5000 });
        assert(await page.locator('body').getAttribute('data-motion') === 'on', 'motion restart failed');
        // Enabling motion alone must not replay an already revealed route.
        await page.waitForTimeout(80);
        assert(!(await routeSample()).drawing, 'enabling motion unexpectedly replayed route');
        await page.getByRole('button', { name: '重播路线', exact: true }).click({ timeout: 5000 });
        await page.waitForTimeout(200);
        const beforeReduce = await routeSample();
        assert(beforeReduce.offset > 0 && beforeReduce.offset < 1, 'OS reduce fixture never drew');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.body.dataset.motion === 'off');
        const reduced = await routeSample();
        assert(reduced.offset === 0 && !reduced.drawing && reduced.pointDisplay === 'none', `live OS reduce left half stroke ${JSON.stringify(reduced)}`);
        return { emblem, replay, repeated, beforePause, terminal, stopped, active, beforeReduce, reduced };
      } finally { await page.emulateMedia({ reducedMotion: null }); }
    });
    await check('actual silent audio decode, opt-in playtime, pause, visibility pause and error retry', async () => {
      await openApp();
      let invalidURL;
      const music = page.locator('#background-music');
      try {
        const initial = await music.evaluate((audio) => ({ paused: audio.paused, time: audio.currentTime, autoplay: audio.autoplay, preload: audio.preload }));
        assert(initial.paused && initial.time === 0 && !initial.autoplay && initial.preload === 'none', 'audio must start off without eager loading');
        // Muting this element is an extra precaution; the dedicated browser stays host-muted.
        await music.evaluate((audio) => { audio.muted = true; });
        await start().click({ timeout: 5000 });
        assert(await music.evaluate((audio) => audio.paused && audio.currentTime === 0), 'start reading triggered playback');
        await page.getByRole('button', { name: '播放音乐', exact: true }).click({ timeout: 5000 });
        await page.waitForFunction(() => { const a = document.querySelector('#background-music'); return a.readyState >= 2 && !a.paused && a.currentTime > 0.15; }, null, { timeout: 12000 });
        const decoded = await music.evaluate((audio) => ({ duration: audio.duration, ready: audio.readyState, error: audio.error?.code ?? null }));
        assert(decoded.ready >= 2 && decoded.duration > 75 && decoded.duration < 82 && !decoded.error, `decode failed: ${JSON.stringify(decoded)}`);
        const playing = await music.evaluate((audio) => ({ time: audio.currentTime, paused: audio.paused, muted: audio.muted }));
        assert(playing.muted, 'test audio must remain muted');
        await page.getByRole('button', { name: '暂停音乐', exact: true }).click({ timeout: 5000 });
        const pausedTime = await music.evaluate((audio) => audio.currentTime);
        await page.waitForTimeout(180);
        assert(await music.evaluate((audio, time) => audio.paused && Math.abs(audio.currentTime - time) < 0.04, pausedTime), 'pause did not stop playback time');
        await page.getByRole('button', { name: '播放音乐', exact: true }).click({ timeout: 5000 });
        await page.waitForFunction(() => !document.querySelector('#background-music').paused, null, { timeout: 5000 });
        const hidden = await page.evaluate(() => {
          const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
          try {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
            return { paused: document.querySelector('#background-music').paused, pressed: document.querySelector('#music-toggle').getAttribute('aria-pressed') };
          } finally { if (descriptor) Object.defineProperty(document, 'hidden', descriptor); else delete document.hidden; }
        });
        assert(hidden.paused && hidden.pressed === 'false', 'visibility did not pause audio');
        markMediaCancellation('replace decoded real MP3 with deliberately invalid audio Blob');
        invalidURL = await music.evaluate((audio) => {
          const url = URL.createObjectURL(new Blob(['deliberately invalid encoded audio'], { type: 'audio/mpeg' }));
          audio.src = url; return url;
        });
        await page.getByRole('button', { name: '播放音乐', exact: true }).click({ timeout: 5000 });
        await page.waitForFunction(() => document.querySelector('#background-music').error !== null, null, { timeout: 5000 });
        assert(await page.getByRole('button', { name: '重试音乐', exact: true }).getAttribute('aria-pressed') === 'false', 'error button falsely claims playback');
        const errorCode = await music.evaluate((audio) => audio.error.code);
        await music.evaluate((audio) => { audio.src = './public/internationale.mp3'; });
        markMediaCancellation('retry button explicitly reloads the restored real MP3');
        await page.getByRole('button', { name: '重试音乐', exact: true }).click({ timeout: 5000 });
        await page.waitForFunction(() => { const a = document.querySelector('#background-music'); return !a.error && !a.paused && a.currentTime > 0.1; }, null, { timeout: 10000 });
        return { initial, decoded, playing, pausedTime, hidden, actualInvalidAudioErrorCode: errorCode, retry: 'real asset decoded and playback time advanced' };
      } finally {
        markMediaCancellation('audio fixture cleanup resets playback before navigation');
        await music.evaluate((audio) => { audio.pause(); audio.currentTime = 0; });
        if (invalidURL) await page.evaluate((url) => URL.revokeObjectURL(url), invalidURL);
        await openApp();
      }
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
        assert(!await frame.locator('body').evaluate((el) => /戴诗旭|Jason Dai/i.test(el.textContent)), 'personal identity in no-script copy');
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
    try {
       await page.locator('audio').evaluateAll((nodes) => nodes.forEach((audio) => audio.pause()));
       await page.emulateMedia({ reducedMotion: null });
     }
    finally {
      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
      page.off('request', mediaRequestListener);
      page.off('requestfinished', requestFinishedListener);
      page.off('requestfailed', requestListener);
      inFlightMedia.clear();
      intentionalMediaCancellation.clear();
      page.off('response', responseListener);
      if (originalViewport) await page.setViewportSize(originalViewport);
    }
  }
  const failures = checks.filter((item) => !item.pass);
  const counts = { passed: checks.length - failures.length, total: checks.length, expected: 15, errors: errors.length,
    expectedMediaAborts: expectedMediaAborts.length, expectedSandboxMessages: sandboxMessages.length };
  const pass = failures.length === 0 && checks.length === 15 && errors.length === 0;
  const limits = ['localhost Chromium evidence only; no real WeChat or mainland-network claim', 'visual critique belongs to controller screenshot review', 'media override reset to browser preference; supplied viewport restored'];
  // The full evidence stays in this task's QA artifact; the MCP return puts failures first.
  await page.evaluate((report) => { window.__chishuiLastQAReport = report; },
    { failures, errors, counts, pass, checks, expectedMediaAborts, expectedSandboxMessages: sandboxMessages, screenshots, limits });
  const compactEvidence = (evidence) => {
    if (evidence?.coverLayout) {
      const layouts = [evidence.coverLayout, ...evidence.chapterLayouts, evidence.epilogueLayout];
      return { width: evidence.coverLayout.width, firstAction: evidence.firstAction, opening: evidence.opening, singlePaths: evidence.singlePaths, draws: evidence.draws, layoutsChecked: layouts.length,
        maxDocumentWidth: Math.max(...layouts.map((item) => item.documentWidth)), minControlCount: Math.min(...layouts.map((item) => item.controlCount)) };
    }
    if (evidence?.signature) return { signature: evidence.signature, bytes: evidence.bytes, type: evidence.type, width: evidence.width,
      height: evidence.height, corner: evidence.corner, canvasTextCount: evidence.cardText.length, download: evidence.download };
    if (Array.isArray(evidence)) return evidence.map((item) => ({ quiz: item.quiz, contrast: item.contrast, focused: item.focused, inViewport: item.inViewport, settled: item.settle?.settled }));
    return evidence;
  };
  return { failures, errors, counts, pass, expectedMediaAborts,
    checks: checks.map((item) => ({ name: item.name, pass: item.pass, ...(item.pass ? { evidence: compactEvidence(item.evidence) } : { error: item.error }) })),
    screenshots, fullReportGlobal: 'window.__chishuiLastQAReport', limits };
}
