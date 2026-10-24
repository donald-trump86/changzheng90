async (page, { phase = 'all' } = {}) => {
  const widths = { '320': [320, 844], '390': [390, 844], '768': [768, 1024], '1440': [1440, 1000], landscape: [844, 390] };
  if (phase !== 'all' && phase !== 'extras' && !widths[phase]) throw new Error(`Unknown QA phase: ${phase}`);
  const base = 'http://127.0.0.1:4173/';
  const originalViewport = page.viewportSize();
  const checks = [], errors = [], screenshots = [];
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  async function check(name, run) {
    try { checks.push({ name, pass: true, evidence: await run() }); }
    catch (error) { checks.push({ name, pass: false, error: error.message }); }
  }
  let navigation = 0;
  async function open(hash = '') {
    const response = await page.goto(base + `?qa=${++navigation}` + hash, { waitUntil: 'networkidle' });
    assert(response.status() === 200, 'homepage HTTP status');
    await page.locator('[data-audio-controls]:not([hidden])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Boolean(globalThis.ChishuiMotion));
  }
  const select = async number => {
    // Hash navigation exercises the public manual chapter-selection contract without
    // scrolling the chapter navigation out from under Playwright on mobile.
    await page.evaluate(n => { location.hash = ['crossing-one', 'crossing-two', 'crossing-three', 'crossing-four'][n - 1]; }, number);
    await page.waitForFunction(n => document.querySelector(`[data-chapter-choice="${n}"]`).getAttribute('aria-current') === 'true', number);
  };
  async function shot(name) {
    const path = `/tmp/dsh-browser-output/brave-agent/museum-${name}.png`;
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    screenshots.push(path);
  }
  try { await page.unrouteAll(); } catch { /* no stale interceptors */ }
  try {
    for (const [label, size] of Object.entries(widths).filter(([key]) => phase === 'all' || phase === key)) {
      await check(`${label}: layout, full narrative and decoded local images`, async () => {
        await page.setViewportSize({ width: size[0], height: size[1] });
        await open();
        const evidence = await page.evaluate(async () => {
          const visible = el => el.checkVisibility() && el.getBoundingClientRect().width > 0;
          const images = [];
          for (const img of document.querySelectorAll('main img')) {
            img.loading = 'eager'; await img.decode();
            images.push({ src: new URL(img.currentSrc).pathname, width: img.naturalWidth, height: img.naturalHeight });
          }
          const badControls = [...document.querySelectorAll('button, summary, .chapter-link, .primary-action')].filter(visible).filter(el => {
            const r = el.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9 || r.left < -1 || r.right > innerWidth + 1;
          }).map(el => el.textContent.trim());
          const badText = [...document.querySelectorAll('.chapter-panel p, .context p, .continuation p, .archives-grid figcaption')].filter(visible).filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.textContent.slice(0, 40));
          return { viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, images, badControls, badText,
            chapters: document.querySelectorAll('.chapter-panel[data-chapter]').length, h1: document.querySelector('h1').textContent.trim(),
            ending: document.querySelector('#continuation-title').textContent.trim() };
        });
        assert(evidence.document <= size[0] + 1 && evidence.body <= size[0] + 1, `overflow ${JSON.stringify(evidence)}`);
        assert(!evidence.badControls.length && !evidence.badText.length, `readability ${JSON.stringify(evidence)}`);
        assert(evidence.chapters === 4 && evidence.h1 === '赤水河，为什么要渡四次？' && evidence.ending === '山河为证', 'narrative structure');
        assert(evidence.images.length >= 3 && evidence.images.every(img => img.width > 0), 'real image decoding');
        await shot(label);
        return evidence;
      });
      await check(`${label}: chapter direction, all routes, reverse scroll and deep links`, async () => {
        await open();
        const states = [];
        for (const n of [1, 2, 3, 4, 3, 2, 1]) {
          await select(n);
          const direction = await page.locator('#route-direction').textContent();
          assert(direction.includes(n % 2 ? '西渡' : '东渡'), `chapter ${n} direction`);
          states.push({ n, direction, route: await page.locator('#current-route').getAttribute('d') });
        }
        assert(new Set(states.slice(0, 4).map(s => s.route)).size === 4, 'four distinct route geometries');
        await page.locator('[data-map-all]').click();
        assert(await page.locator('[data-map-all]').getAttribute('aria-pressed') === 'true', 'all-routes control');
        assert(await page.locator('[data-previous-route]').evaluateAll(nodes => nodes.filter(n => getComputedStyle(n).display !== 'none').length) === 3, 'three contextual routes');
        await select(4);
        assert(await page.locator('[data-map-all]').getAttribute('aria-pressed') === 'false', 'chapter selection exits all-routes');
        for (const n of [2, 4, 1]) {
          await page.evaluate(number => { const p = document.querySelector(`[data-chapter="${number}"]`); window.scrollTo({ top: p.getBoundingClientRect().top + scrollY - innerHeight * 0.3, behavior: 'instant' }); }, n);
          await page.waitForFunction(number => document.querySelector(`[data-chapter-choice="${number}"]`).getAttribute('aria-current') === 'true', n);
        }
        await open('#crossing-three');
        const cold = await page.evaluate(() => ({ dir: document.querySelector('#route-direction').textContent,
          cur: [...document.querySelectorAll('[data-chapter-choice]')].map(a => a.getAttribute('aria-current')).join(','),
          scrollY: Math.round(scrollY), tops: [...document.querySelectorAll('article[data-chapter]')].map(p => Math.round(p.getBoundingClientRect().top)) }));
        assert(cold.dir.includes('三渡'), `cold deep link ${JSON.stringify(cold)}`);
        return states;
      });
    }
    if (phase === 'all' || phase === 'extras') {
      await check('image dialog actual scaling, scrolling, reset and restored focus at five viewports', async () => {
        const measured = [];
        for (const [label, size] of Object.entries(widths)) {
          await page.setViewportSize({ width: size[0], height: size[1] }); await open();
          const trigger = page.locator('.opening [data-image-view]').first();
          await trigger.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('#dialog-image').dataset.zoom === '1' && !document.querySelector('#dialog-image').hidden);
          const measure = () => page.locator('#image-dialog').evaluate(dialog => {
            const image = dialog.querySelector('img'), view = dialog.querySelector('.dialog-viewport');
            const r = image.getBoundingClientRect(), d = dialog.getBoundingClientRect();
            return { width: r.width, height: r.height, vw: view.clientWidth, vh: view.clientHeight, sw: view.scrollWidth, sh: view.scrollHeight,
              left: view.scrollLeft, top: view.scrollTop, dialogFits: d.left >= -1 && d.right <= innerWidth + 1 && d.top >= -1 && d.bottom <= innerHeight + 1 };
          });
          const baseSize = await measure();
          assert(baseSize.width > 0 && baseSize.height > 0 && baseSize.dialogFits, `${label}: initial fit`);
          for (const factor of [1.5, 2, 3, 4]) {
            await page.locator('[data-dialog-zoom="in"]').click();
            const zoomed = await measure();
            assert(Math.abs(zoomed.width / baseSize.width - factor) < 0.02 && Math.abs(zoomed.height / baseSize.height - factor) < 0.02, `${label}: real ${factor}x image dimensions`);
            assert(zoomed.dialogFits && zoomed.vw === baseSize.vw && zoomed.vh === baseSize.vh, `${label}: stable bounded viewport`);
          }
          const enlarged = await measure();
          await page.locator('.dialog-viewport').evaluate(view => { view.scrollLeft = view.scrollWidth; view.scrollTop = view.scrollHeight; });
          const scrolled = await measure();
          assert(enlarged.sw > enlarged.vw || enlarged.sh > enlarged.vh, `${label}: scrollable enlarged image`);
          if (enlarged.sw > enlarged.vw + 1) assert(scrolled.left > 0, `${label}: horizontal scroll works`);
          if (enlarged.sh > enlarged.vh + 1) assert(scrolled.top > 0, `${label}: vertical scroll works`);
          await page.locator('[data-dialog-zoom="reset"]').click();
          const reset = await measure();
          assert(Math.abs(reset.width - baseSize.width) < 1 && !reset.left && !reset.top, `${label}: reset fit and scroll`);
          for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert(await page.evaluate(() => !!document.activeElement.closest('#image-dialog')), 'dialog focus escaped'); }
          await page.keyboard.press('Escape');
          assert(await trigger.evaluate(el => document.activeElement === el), 'dialog focus restored');
          measured.push({ label, base: baseSize, enlarged, scrolled, reset });
        }
        return measured;
      });
      await check('responsive previews and map terrain requested near viewport only', async () => {
        await page.setViewportSize({ width: 390, height: 844 }); await open();
        const initial = await page.evaluate(() => ({ url: document.URL, innerWidth, innerHeight,
          requests: performance.getEntriesByType('resource').map(r => `${r.name}|${r.initiatorType}`),
          hero: document.querySelector('.opening .hero-art img').currentSrc, heroAttr: document.querySelector('.opening .hero-art img').getAttribute('src'),
          heroComplete: document.querySelector('.opening .hero-art img').complete, heroW: document.querySelector('.opening .hero-art img').naturalWidth,
          terrain: document.querySelector('.map-relief').getAttribute('href') }));
        const pngRequests = initial.requests.filter(r => r.includes('chishui-valley-study.png'));
        assert(initial.hero.endsWith('.webp') && pngRequests.length === 0,
          `initial hero uses responsive preview (url=${initial.url} iw=${initial.innerWidth} hero=${initial.hero || '<empty>'} heroAttr=${initial.heroAttr} heroComplete=${initial.heroComplete} heroW=${initial.heroW} pngRequests=${JSON.stringify(pngRequests)} requests=${JSON.stringify(initial.requests)})`);
        assert(!initial.terrain && !initial.requests.some(url => url.includes('region-relief.png')), 'terrain absent from initial viewport network');
        const response = page.waitForResponse(r => r.url().endsWith('/public/map/region-relief.png'));
        await page.locator('.map-canvas').scrollIntoViewIfNeeded();
        assert((await response).status() === 200, 'terrain fetched when approaching map');
        const decoded = await page.locator('.map-relief').evaluate(async node => { const image = new Image(); image.src = node.getAttribute('href'); await image.decode(); return [image.naturalWidth, image.naturalHeight]; });
        assert(decoded[0] === 600 && decoded[1] === 492, 'actual terrain decodes');
        return { hero: initial.hero, initialTerrainRequests: 0, decoded };
      });
      await check('reduced motion and pause produce complete routes', async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' }); await open(); await select(4);
        const evidence = await page.locator('#current-route').evaluate(el => ({ offset: getComputedStyle(el).strokeDashoffset, path: el.getAttribute('d'), mode: document.body.dataset.motion }));
        assert(await page.locator('#motion-toggle').getAttribute('aria-disabled') === 'true' && parseFloat(evidence.offset) === 0 && evidence.path, 'reduced motion incomplete');
        await page.emulateMedia({ reducedMotion: 'no-preference' }); await open();
        await page.locator('#motion-toggle').click();
        assert(await page.locator('body').getAttribute('data-motion') === 'off', 'pause not applied');
        await select(3);
        assert(await page.locator('#current-route').evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset)) === 0, 'paused route incomplete');
        return evidence;
      });
      await check('module failure retains chapter tracking', async () => {
        await page.route('**/src/history-scroll.js', async route => { try { await route.fulfill({ status: 200, contentType: 'text/javascript', body: 'throw new Error("intentional module failure fixture")' }); } catch { /* already handled */ } });
        try {
          await open('#crossing-three');
          for (const n of [4, 2]) {
            await page.evaluate(number => { const p = document.querySelector(`[data-chapter="${number}"]`); scrollTo({ top: p.getBoundingClientRect().top + scrollY - innerHeight * 0.3, behavior: 'instant' }); }, n);
            await page.waitForFunction(number => document.querySelector(`[data-chapter-choice="${number}"]`).getAttribute('aria-current') === 'true', n);
          }
          return 'fallback tracks forward and backward with module import rejected';
        } finally { await page.unroute('**/src/history-scroll.js'); }
      });
      await check('cold chapter three/four synchronize delayed audio import before first play', async () => {
        const evidence = [];
        for (const chapter of [3, 4]) {
          let release;
          const gate = new Promise(resolve => { release = resolve; });
          await page.route('**/src/audio.js', async route => { await gate; try { await route.continue(); } catch { /* already handled */ } });
          try {
            await page.goto(base + `?qa=audio-${++navigation}` + (chapter === 3 ? '#crossing-three' : '#crossing-four'), { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(n => document.querySelector(`[data-chapter-choice="${n}"]`).getAttribute('aria-current') === 'true', chapter);
            await page.evaluate(() => {
              window.__nativeAudio = window.Audio; window.__qaPageAudio = [];
              window.Audio = function (...args) { const audio = new window.__nativeAudio(...args); audio.muted = true; window.__qaPageAudio.push(audio); return audio; };
            });
            release();
            await page.locator('[data-audio-controls]:not([hidden])').waitFor();
            // DOM click deliberately avoids scrolling to the footer and changing chapters.
            await page.locator('[data-audio-toggle]').evaluate(button => button.click());
            await page.waitForFunction(() => window.__qaPageAudio.some(audio => !audio.paused && audio.currentTime > 0.05), null, { timeout: 20000 });
            const tracks = await page.evaluate(() => window.__qaPageAudio.map(audio => ({ src: audio.src, time: audio.currentTime, muted: audio.muted, paused: audio.paused })));
            const playing = tracks.filter(audio => !audio.paused && audio.time > 0.05);
            assert(playing.length > 0 && playing.every(audio => audio.src.endsWith('/public/audio/the-great-sea.mp3') && audio.muted) && tracks.every(audio => audio.muted), `chapter ${chapter}: correct first track (playing=${playing.length}/${tracks.length})`);
            evidence.push({ chapter, tracks });
          } finally {
            release(); await page.unroute('**/src/audio.js');
            await page.evaluate(() => { window.__qaPageAudio?.forEach(audio => audio.pause()); if (window.__nativeAudio) window.Audio = window.__nativeAudio; delete window.__nativeAudio; delete window.__qaPageAudio; });
          }
        }
        return evidence;
      });
      await check('real silent audio decode, play, pause and hidden-page pause', async () => {
        await open();
        await page.evaluate(async () => {
          const { createAudioController, audioTracks } = await import('./src/audio.js');
          window.__qaAudio = [];
          window.__qaController = createAudioController({ tracks: audioTracks, createAudio() { const audio = new Audio(); audio.muted = true; window.__qaAudio.push(audio); return audio; }, onState(state) { window.__qaAudioState = state.status; } });
        });
        try {
          await page.evaluate(() => window.__qaController.enable());
          await page.waitForFunction(() => window.__qaAudio.some(a => a.readyState >= 2 && !a.paused && a.currentTime > 0.1), null, { timeout: 20000 });
          const decoded = await page.evaluate(() => window.__qaAudio.map(a => ({ duration: a.duration, time: a.currentTime, muted: a.muted, preload: a.preload })));
          assert(decoded.every(a => a.muted) && decoded.some(a => a.duration > 240), 'real MP3 decode');
          await page.evaluate(() => window.__qaController.pause());
          assert(await page.evaluate(() => window.__qaAudio.every(a => a.paused)), 'pause media');
          await page.evaluate(() => window.__qaController.enable());
          await page.waitForFunction(() => window.__qaAudioState === 'playing');
          const hidden = await page.evaluate(() => {
            const descriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
            try { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); return window.__qaAudio.every(a => a.paused); }
            finally { if (descriptor) Object.defineProperty(document, 'hidden', descriptor); else delete document.hidden; }
          });
          assert(hidden, 'hidden page keeps playing');
          return { decoded, hiddenFixture: hidden };
        } finally { await page.evaluate(() => { window.__qaController.destroy(); delete window.__qaController; delete window.__qaAudio; delete window.__qaAudioState; }); }
      });
      await check('disabled JavaScript exposes full narrative and sources', async () => {
        await open();
        await page.evaluate(url => { const iframe = document.createElement('iframe'); iframe.title = 'noscript'; iframe.sandbox = 'allow-same-origin'; iframe.src = url; iframe.style.cssText = 'width:100%;height:844px'; document.body.appendChild(iframe); }, base);
        try {
          const frame = page.frameLocator('iframe[title="noscript"]');
          await frame.locator('.noscript-note').waitFor();
          assert(await frame.locator('.chapter-panel').count() === 4, 'no-script chapters');
          assert(await frame.locator('#sources a[href^="https:"]').count() >= 6, 'no-script sources');
          assert(await frame.locator('#route-map').evaluate(el => getComputedStyle(el).backgroundImage.includes('region-relief.png')), 'no-script relief fallback');
          assert(!await frame.locator('body').evaluate(el => /戴诗旭|Jason Dai/.test(el.textContent)), 'personal signature');
          return 'sandbox omits allow-scripts; four chapters, source links and CSS map relief visible';
        } finally { await page.locator('iframe[title="noscript"]').evaluate(el => el.remove()); }
      });
    }
  } finally {
    page.off('pageerror', onError);
    await page.emulateMedia({ reducedMotion: null });
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
  const expectedChecks = phase === 'all' ? 17 : phase === 'extras' ? 7 : 2;
  return { pass: checks.length === expectedChecks && checks.every(c => c.pass) && !errors.length, expectedChecks, checks, errors, screenshots, limits: ['Local Chromium only; real phone and WeChat untested.', 'Visibility uses a restored document.hidden fixture; audio remains muted.'] };
}
