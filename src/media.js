/** Independent, opt-in HTMLAudio and decorative scene controls. */
export function createMediaControls({ audio, musicButton, motionButton, root }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = root.querySelector('#music-status');
  const listeners = [];
  let destroyed = false, requested = false, failed = false, pending = false, attempt = 0;
  let motionEnabled = true;
  const on = (target, type, handler) => {
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };
  function updateMusic() {
    const playing = requested && !audio.paused && !failed;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.textContent = failed ? '重试音乐' : pending ? '取消加载' : playing ? '暂停音乐' : '播放音乐';
    if (status) status.textContent = failed ? '音乐加载或播放失败，可重试。' : pending ? '正在加载《国际歌》…' : playing ? '正在播放《国际歌》· 数字器乐' : '《国际歌》· 数字器乐，点击播放';
  }
  function pause() {
    requested = false;
    pending = false;
    attempt++;
    audio.pause();
    updateMusic();
  }
  async function toggleMusic() {
    if (requested) return pause();
    requested = true;
    pending = true;
    const current = ++attempt;
    if (failed || audio.error) audio.load();
    failed = false;
    updateMusic();
    try {
      await audio.play();
      if (destroyed || current !== attempt || !requested) return;
      pending = false;
      updateMusic();
    } catch {
      if (destroyed || current !== attempt) return;
      requested = false;
      pending = false;
      failed = true;
      audio.pause();
      updateMusic();
    }
  }
  function updateMotion() {
    const enabled = motionEnabled && !reduced.matches;
    root.dataset.motion = enabled ? 'on' : 'off';
    motionButton.disabled = reduced.matches;
    motionButton.textContent = reduced.matches ? '系统已减少动态' : enabled ? '暂停动画' : '开启动画';
    motionButton.setAttribute('aria-pressed', String(enabled));
  }
  audio.autoplay = false;
  audio.loop = true;
  audio.pause();
  on(musicButton, 'click', toggleMusic);
  on(motionButton, 'click', () => { motionEnabled = !motionEnabled; updateMotion(); });
  on(reduced, 'change', updateMotion);
  on(audio, 'playing', () => {
    if (!requested || destroyed) return audio.pause();
    pending = false;
    updateMusic();
  });
  on(audio, 'pause', () => {
    // A native pause (including a platform interruption) must be reflected honestly.
    if (!pending) requested = false;
    updateMusic();
  });
  on(audio, 'error', () => {
    attempt++;
    requested = false;
    pending = false;
    failed = true;
    audio.pause();
    updateMusic();
  });
  on(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  on(window, 'pagehide', pause);
  updateMotion();
  updateMusic();
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const remove of listeners) remove();
    pause();
  } };
}
