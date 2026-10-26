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
  let drag = null;
  const originalPanAttributes = ['data-pannable', 'data-dragging'].map((name) => [name, viewport.getAttribute(name)]);
  function endDrag() {
    const pointerId = drag?.id;
    drag = null;
    viewport.dataset.dragging = 'false';
    if (pointerId !== undefined && viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
  }
  function listen(node, type, fn) {
    node.addEventListener(type, fn);
    listeners.push(() => node.removeEventListener(type, fn));
  }
  function fit(reset = false) {
    if (reset || level === 0) endDrag();
    viewport.dataset.pannable = String(dialog.open && ready && level > 0);
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
  viewport.dataset.pannable = 'false';
  viewport.dataset.dragging = 'false';
  listen(viewport, 'pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.isPrimary === false
      || !dialog.open || !ready || level === 0 || drag) return;
    viewport.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.dataset.dragging = 'true';
    event.preventDefault();
  });
  listen(viewport, 'pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    viewport.scrollLeft = drag.left + drag.x - event.clientX;
    viewport.scrollTop = drag.top + drag.y - event.clientY;
    event.preventDefault();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    listen(viewport, type, (event) => { if (drag?.id === event.pointerId) endDrag(); });
  }
  listen(viewport, 'dblclick', (event) => {
    if (event.button !== 0 || !dialog.open || !ready) return;
    event.preventDefault();
    level = level === 0 ? 2 : 0;
    fit(true);
  });
  listen(image, 'dragstart', (event) => { if (level > 0) event.preventDefault(); });
  listen(image, 'load', loaded);
  listen(image, 'error', () => {
    endDrag();
    viewport.dataset.pannable = 'false';
    ready = false;
    image.hidden = true;
    root.getElementById('dialog-caption').textContent = '原图暂时无法载入，请关闭后使用原图链接重试。';
  });
  for (const link of root.querySelectorAll('[data-image-view]')) {
    listen(link, 'click', (event) => {
      // Preserve native open-in-new-tab and modified-click behavior.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      endDrag();
      viewport.dataset.pannable = 'false';
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
    endDrag();
    viewport.dataset.pannable = 'false';
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
    endDrag();
    observer?.disconnect();
    listeners.forEach((remove) => remove());
    originalPanAttributes.forEach(([name, value]) => {
      if (value === null) viewport.removeAttribute(name);
      else viewport.setAttribute(name, value);
    });
    if (dialog.open) dialog.close();
  } };
}
