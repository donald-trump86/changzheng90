// Original links remain ordinary downloads/navigation until this enhancement loads.
export function initImageViewer(root = document, win = window) {
  const dialog = root.getElementById('image-dialog');
  const image = root.getElementById('dialog-image');
  const viewport = dialog?.querySelector('.dialog-viewport');
  if (!dialog || !image || !viewport || typeof dialog.showModal !== 'function') return null;
  const listeners = [];
  let scale = 1;
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
  function listen(node, type, fn, options) {
    node.addEventListener(type, fn, options);
    listeners.push(() => node.removeEventListener(type, fn, options));
  }
  function fit(reset = false) {
    if (reset || scale === 1) endDrag();
    viewport.dataset.pannable = String(dialog.open && ready && scale > 1);
    if (!dialog.open || !ready || !image.naturalWidth || !image.naturalHeight) return;
    const aspect = image.naturalWidth / image.naturalHeight;
    const width = Math.min(1160, (win.innerWidth || 1200) - 48, ((win.innerHeight || 800) - 64) * aspect);
    dialog.style.width = `${width}px`;
    dialog.style.height = `${width / aspect}px`;
    const fitted = Math.min(viewport.clientWidth, viewport.clientHeight * aspect);
    if (fitted <= 0) return;
    image.style.width = `${fitted * scale}px`;
    image.style.height = `${fitted * scale / aspect}px`;
    image.dataset.zoom = String(scale);
    if (reset) viewport.scrollTo(0, 0);
  }
  function zoom(next, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    if (!dialog.open || !ready) return;
    const before = scale;
    scale = Math.min(4, Math.max(1, next));
    const left = viewport.scrollLeft;
    const top = viewport.scrollTop;
    // Account for centering of a fitted image before it overflows the viewport.
    const oldWidth = parseFloat(image.style.width) || viewport.clientWidth;
    const oldInset = Math.max(0, (viewport.clientWidth - oldWidth) / 2);
    fit();
    const newWidth = parseFloat(image.style.width) || viewport.clientWidth;
    const newInset = Math.max(0, (viewport.clientWidth - newWidth) / 2);
    viewport.scrollLeft = (left + x - oldInset) * scale / before - x + newInset;
    viewport.scrollTop = (top + y) * scale / before - y;
    if (scale === 1) viewport.scrollTo(0, 0);
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
      || !dialog.open || !ready || scale === 1 || drag) return;
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
    scale = scale === 1 ? 2 : 1;
    fit(true);
  });
  listen(image, 'dragstart', (event) => { if (scale > 1) event.preventDefault(); });
  listen(image, 'load', loaded);
  listen(image, 'error', () => {
    endDrag();
    viewport.dataset.pannable = 'false';
    ready = false;
    image.hidden = true;
    dialog.dataset.error = '原图暂时无法载入，点击外侧返回。';
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
      scale = 1;
      ready = false;
      image.hidden = true;
      delete dialog.dataset.error;
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
  listen(viewport, 'wheel', (event) => {
    if (!dialog.open || !ready) return;
    event.preventDefault();
    const box = viewport.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
    zoom(scale * Math.exp(-delta * .002), event.clientX - box.left, event.clientY - box.top);
  }, { passive: false });
  let outsideDown = false;
  const outside = (event) => {
    const box = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < box.left || event.clientX > box.right
      || event.clientY < box.top || event.clientY > box.bottom);
  };
  listen(dialog, 'pointerdown', (event) => { outsideDown = outside(event); });
  listen(dialog, 'click', (event) => {
    if (outsideDown && outside(event)) dialog.close();
    outsideDown = false;
  });
  listen(dialog, 'keydown', (event) => {
    if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();
      zoom(event.key === '0' ? 1 : scale * (event.key === '-' ? 1 / 1.25 : 1.25));
      return;
    }
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
