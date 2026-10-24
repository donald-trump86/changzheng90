// Original links remain ordinary downloads/navigation until this enhancement loads.
export function initImageViewer(root = document, win = window) {
  const dialog = root.getElementById('image-dialog');
  const image = root.getElementById('dialog-image');
  const viewport = dialog?.querySelector('.dialog-viewport');
  if (!dialog || !image || !viewport || typeof dialog.showModal !== 'function') return null;
  const levels = [1, 1.5, 2, 3, 4];
  const controls = [...dialog.querySelectorAll('[data-dialog-zoom]')];
  const listeners = [];
  let level = 0;
  let trigger = null;
  let ready = false;
  let destroyed = false;
  let generation = 0;
  function listen(node, type, fn) {
    node.addEventListener(type, fn);
    listeners.push(() => node.removeEventListener(type, fn));
  }
  function fit(reset = false) {
    if (!dialog.open || !ready || !image.naturalWidth || !image.naturalHeight) return;
    const aspect = image.naturalWidth / image.naturalHeight;
    const width = Math.min(viewport.clientWidth, viewport.clientHeight * aspect);
    if (width <= 0) return;
    image.style.width = `${width * levels[level]}px`;
    image.style.height = `${width * levels[level] / aspect}px`;
    image.dataset.zoom = String(levels[level]);
    controls.forEach((button) => {
      button.disabled = button.dataset.dialogZoom === 'in' ? level === levels.length - 1 :
        button.dataset.dialogZoom === 'out' ? level === 0 : false;
    });
    if (reset) viewport.scrollTo(0, 0);
  }
  function loaded() {
    if (destroyed || !dialog.open) return;
    ready = image.naturalWidth > 0;
    image.hidden = !ready;
    fit(true);
  }
  listen(image, 'load', loaded);
  listen(image, 'error', () => {
    ready = false;
    image.hidden = true;
    root.getElementById('dialog-caption').textContent = '原图暂时无法载入，请关闭后使用原图链接重试。';
  });
  for (const link of root.querySelectorAll('[data-image-view]')) {
    listen(link, 'click', (event) => {
      // Preserve native open-in-new-tab and modified-click behavior.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      level = 0;
      ready = false;
      image.hidden = true;
      image.style.width = '';
      image.style.height = '';
      const mine = ++generation;
      image.alt = link.querySelector('img')?.alt || link.dataset.imageTitle || '档案原图';
      root.getElementById('dialog-title').textContent = link.dataset.imageTitle || '完整档案原图';
      root.getElementById('dialog-caption').textContent = link.dataset.imageCaption || '';
      image.src = link.href;
      if (!dialog.open) dialog.showModal();
      viewport.scrollTo(0, 0);
      // Cached images may not fire a fresh load event; decode is still asynchronous.
      image.decode().then(() => {
        if (!destroyed && mine === generation) loaded();
      }).catch(() => { /* The image error event provides the visible fallback. */ });
    });
  }
  controls.forEach((button) => listen(button, 'click', () => {
    const action = button.dataset.dialogZoom;
    level = action === 'in' ? Math.min(level + 1, levels.length - 1) :
      action === 'out' ? Math.max(level - 1, 0) : 0;
    fit(action === 'reset');
  }));
  listen(dialog, 'keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')]
      .filter((node) => node.getClientRects().length);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) return;
    if (event.shiftKey && (root.activeElement === first || !dialog.contains(root.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (root.activeElement === last || !dialog.contains(root.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  listen(dialog, 'close', () => {
    generation++;
    ready = false;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    trigger = null;
  });
  const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => fit()) : null;
  observer?.observe(viewport);
  listen(win, 'resize', () => fit());
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    generation++;
    observer?.disconnect();
    listeners.forEach((remove) => remove());
    if (dialog.open) dialog.close();
  } };
}
