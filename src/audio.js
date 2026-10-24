/**
 * Independent, opt-in ambient audio for the Chishui museum page.
 *
 * Silent by default: elements are created with preload="none", volume 0, and
 * never play before an explicit enable(). Every state-changing action advances
 * a generation token, so a play() promise that settles after pause(), destroy()
 * or a hidden tab can never restart sound (the continuation re-pauses instead).
 *
 * Only locally hosted, licence-verified recordings belong in `audioTracks`.
 * Attribution and licence evidence: audio-credits.html and docs/audio-rights.md.
 */

/** Crossfade length for chapter track changes (contract: 200-500ms ramps). */
const FADE_MS = 320;
const FADE_STEP_MS = 16;

/**
 * Verified recordings, served from this deployment only (no hotlinking).
 * `chapters` maps each track to the chapter numbers setChapter() receives.
 */
export const audioTracks = [
  {
    id: 'the-great-sea',
    title: 'The Great Sea',
    src: './public/audio/the-great-sea.mp3',
    chapters: [1, 2, 3, 4],
    author: 'Scott Buckley',
    source: 'https://www.scottbuckley.com.au/library/the-great-sea/',
    license: 'CC BY 4.0（https://creativecommons.org/licenses/by/4.0/）',
  },
];

function clampVolume(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/**
 * Create the ambient audio controller.
 *
 * @param {object} options
 * @param {Array<{id:string,title:string,src:string,chapters?:number[],author:string,source:string,license:string}>} options.tracks
 *   Track descriptors (see `audioTracks`). An empty list degrades to an honest
 *   'error' state with `error: 'no-tracks'` instead of pretending to play.
 * @param {() => HTMLAudioElement} [options.createAudio]  Injected element factory
 *   (tests pass a fake). Falls back to `new Audio()` in a browser.
 * @param {(state: {status:'off'|'loading'|'playing'|'paused'|'error', volume:number, track:object|null, error?:string}) => void} options.onState
 *   Called on every state change, including one initial 'off' emission.
 * @param {number} [options.volume=0.18]  Ambient playback volume, clamped to 0..1.
 * @returns {{enable:() => void, pause:() => void, setVolume:(value:number) => void,
 *   setChapter:(value:number) => void, destroy:() => void}}
 */
export function createAudioController({ tracks, createAudio, onState, volume = 0.18 }) {
  const list = Array.isArray(tracks) ? tracks : [];
  const factory = typeof createAudio === 'function' ? createAudio : () => new Audio();
  let currentVolume = clampVolume(volume, 0.18);
  let status = 'off';
  let lastError;
  let enabled = false;
  let destroyed = false;
  let chapter = 1;
  let token = 0;
  let fadeTimer = null;
  let active = null;

  const nodes = list.map((track) => {
    const el = factory();
    el.src = track.src;
    el.preload = 'none';
    el.autoplay = false;
    el.loop = true;
    el.volume = 0;
    return { track, el };
  });

  /** Chapter numbers the tracks declare; setChapter() ignores anything else. */
  const knownChapters = new Set();
  for (const { track } of nodes) {
    if (Array.isArray(track.chapters)) {
      for (const value of track.chapters) knownChapters.add(value);
    }
  }

  const listeners = [];
  const on = (target, type, handler) => {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(type, handler);
    listeners.push(() => target.removeEventListener(type, handler));
  };

  function nodeForChapter(value) {
    if (!nodes.length) return null;
    return nodes.find(({ track }) => (Array.isArray(track.chapters) ? track.chapters.includes(value) : true)) ?? nodes[0];
  }

  function emit() {
    if (destroyed) return;
    const node = nodeForChapter(chapter);
    const state = { status, volume: currentVolume, track: node ? node.track : null };
    if (lastError !== undefined) state.error = lastError;
    onState(state);
  }

  function cancelFade() {
    if (fadeTimer !== null) {
      clearInterval(fadeTimer);
      fadeTimer = null;
    }
  }

  function safePause(el) {
    try {
      el.pause();
    } catch {
      /* element already torn down */
    }
  }

  /**
   * Play `node` and settle the state only if this attempt is still current.
   * Any token change (pause/destroy/hidden/new attempt) means silence wins:
   * the continuation pauses the element instead of resuming sound — except
   * when a newer live attempt owns this same element (node === active &&
   * enabled): pausing then would abort the attempt that is actually current.
   */
  function settlePlay(node, mine, ok, error) {
    if (destroyed) {
      safePause(node.el);
      return;
    }
    if (mine !== token || !enabled) {
      if (node !== active || !enabled) safePause(node.el);
      return;
    }
    if (!ok) {
      enabled = false;
      status = 'error';
      lastError = String((error && error.message) || error || 'playback failed');
      emit();
      return;
    }
    status = 'playing';
    emit();
  }

  function attemptPlay(node, mine) {
    let result;
    try {
      result = node.el.play();
    } catch (error) {
      settlePlay(node, mine, false, error);
      return;
    }
    if (result && typeof result.then === 'function') {
      result.then(
        () => settlePlay(node, mine, true),
        (error) => settlePlay(node, mine, false, error),
      );
    } else {
      settlePlay(node, mine, true);
    }
  }

  /**
   * Start (or crossfade to) `node`. With `outgoing` set and a different track,
   * both volumes ramp over FADE_MS; the ramp is cancellable at any tick.
   */
  function startPlayback(node, outgoing) {
    token += 1;
    const mine = token;
    cancelFade();
    active = node;
    node.el.preload = 'auto';
    node.el.volume = outgoing && outgoing !== node ? 0 : currentVolume;
    status = 'loading';
    emit();

    if (outgoing && outgoing !== node) {
      const total = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
      let step = 0;
      fadeTimer = setInterval(() => {
        if (destroyed || mine !== token) {
          cancelFade();
          return;
        }
        step += 1;
        const t = Math.min(1, step / total);
        node.el.volume = currentVolume * t;
        outgoing.el.volume = currentVolume * (1 - t);
        if (t >= 1) {
          cancelFade();
          safePause(outgoing.el);
          outgoing.el.volume = 0;
        }
      }, FADE_STEP_MS);
    }

    attemptPlay(node, mine);
  }

  /**
   * Pause everything and disable until an explicit enable() again. Emits only
   * when the status actually changes: 'loading'/'playing' become 'paused',
   * while 'off', 'paused' and 'error' are left as they are (no redundant state).
   */
  function stop() {
    token += 1;
    cancelFade();
    enabled = false;
    for (const node of nodes) {
      safePause(node.el);
      try {
        node.el.volume = 0;
      } catch {
        /* element already torn down */
      }
    }
    const before = status;
    if (status === 'loading' || status === 'playing') status = 'paused';
    if (status !== before) emit();
  }

  function enable() {
    if (destroyed || enabled) return;
    if (!nodes.length) {
      status = 'error';
      lastError = 'no-tracks';
      emit();
      return;
    }
    enabled = true;
    lastError = undefined;
    startPlayback(nodeForChapter(chapter) ?? nodes[0], null);
  }

  /**
   * Pause and stay disabled until an explicit enable(). Documented behavior:
   * from 'off', 'paused' or 'error' the status is unchanged and nothing is
   * emitted; only 'loading'/'playing' transition to 'paused'.
   */
  function pause() {
    if (destroyed) return;
    stop();
  }

  /**
   * Set the playback volume (clamped to 0..1). The user's volume always wins
   * over an in-flight crossfade: a ramp still running is settled immediately
   * (incoming element at the new volume, outgoing paused and silent) so no
   * later ramp tick can overwrite what was just set.
   */
  function setVolume(value) {
    if (destroyed) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    currentVolume = Math.min(1, Math.max(0, n));
    if (fadeTimer !== null) {
      cancelFade();
      for (const node of nodes) {
        if (node === active) continue;
        safePause(node.el);
        try {
          node.el.volume = 0;
        } catch {
          /* element already torn down */
        }
      }
    }
    if (active && active.el) {
      try {
        active.el.volume = currentVolume;
      } catch {
        /* element already torn down */
      }
    }
    emit();
  }

  /**
   * Select the track for chapter `value`. Non-integers and chapter numbers no
   * track declares are ignored (no selection change, no crossfade).
   */
  function setChapter(value) {
    if (destroyed) return;
    const n = Number(value);
    if (!Number.isInteger(n)) return;
    if (knownChapters.size > 0 && !knownChapters.has(n)) return;
    chapter = n;
    const node = nodeForChapter(chapter);
    if (!node || !enabled || node === active) {
      emit();
      return;
    }
    startPlayback(node, active);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    token += 1;
    cancelFade();
    enabled = false;
    for (const node of nodes) {
      safePause(node.el);
      try {
        node.el.volume = 0;
      } catch {
        /* element already torn down */
      }
      node.el = null;
    }
    active = null;
    for (const remove of listeners.splice(0)) {
      try {
        remove();
      } catch {
        /* listener target already gone */
      }
    }
  }

  const hide = () => {
    if (globalThis.document && globalThis.document.hidden) stop();
  };
  on(globalThis.document, 'visibilitychange', hide);
  on(globalThis.window, 'pagehide', () => stop());

  emit();
  return { enable, pause, setVolume, setChapter, destroy };
}
