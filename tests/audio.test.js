import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { audioTracks, createAudioController } from '../src/audio.js';

/**
 * Browser-free fake audio element. Behaviour per instance:
 * - 'resolve'       play() resolves on a microtask
 * - 'reject'        play() always rejects (playback failure)
 * - 'reject-once'   first play() rejects, later calls resolve (retry works)
 * - 'defer'         play() stays pending; pause() rejects every pending play()
 *                   like a browser (AbortError) — the interrupted-play path
 * - 'defer-resolve' play() stays pending and pause() does NOT settle it, so the
 *                   test can resolve them late — the pending-promise race path
 * Pending play() promises are kept in a FIFO queue, so a second enable() during
 * a race can be settled independently of the stale first attempt.
 */
class FakeAudio {
  constructor(behavior = 'resolve') {
    this.behavior = behavior;
    this.src = '';
    this.preload = 'auto';
    this.autoplay = true;
    this.loop = false;
    this.volume = 1;
    this.paused = true;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.pending = [];
  }

  play() {
    this.playCalls += 1;
    if (this.behavior === 'reject') return Promise.reject(new Error('fake play rejected'));
    if (this.behavior === 'reject-once' && this.playCalls === 1) return Promise.reject(new Error('fake play rejected'));
    if (this.behavior === 'defer' || this.behavior === 'defer-resolve') {
      this.paused = false;
      return new Promise((resolve, reject) => {
        this.pending.push({ resolve, reject });
      });
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
    if (this.behavior === 'defer' && this.pending.length) {
      for (const { reject } of this.pending.splice(0)) {
        const error = new Error('play() interrupted');
        error.name = 'AbortError';
        reject(error);
      }
    }
  }

  resolvePlay() {
    const next = this.pending.shift();
    if (next) next.resolve();
  }
}

function fakeFactory(behaviors = []) {
  const audios = [];
  const createAudio = () => {
    const audio = new FakeAudio(behaviors[audios.length] ?? 'resolve');
    audios.push(audio);
    return audio;
  };
  return { createAudio, audios };
}

function fakeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type, event = {}) {
      for (const handler of [...(listeners.get(type) ?? [])]) handler({ type, ...event });
    },
    count() {
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    },
  };
}

/** Provide fake document/window globals around a test, restoring afterwards. */
async function withBrowserEnv(run) {
  const doc = fakeEventTarget();
  const win = fakeEventTarget();
  doc.hidden = false;
  const hadDocument = 'document' in globalThis;
  const hadWindow = 'window' in globalThis;
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = doc;
  globalThis.window = win;
  try {
    return await run({ doc, win });
  } finally {
    if (hadDocument) globalThis.document = previousDocument;
    else delete globalThis.document;
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
  }
}

/** Flush microtasks (the play() promise chains) without touching timers. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

const fakeTracks = [
  { id: 'a', title: 'Track A', src: './audio/a.mp3', chapters: [1, 2], author: 'A', source: 'https://example.test/a', license: 'CC BY 4.0' },
  { id: 'b', title: 'Track B', src: './audio/b.mp3', chapters: [3, 4], author: 'B', source: 'https://example.test/b', license: 'CC BY 4.0' },
];

test('default silence: elements exist with preload none and nothing plays', () => {
  const { createAudio, audios } = fakeFactory();
  const states = [];
  createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  assert.equal(audios.length, 2);
  for (const [index, audio] of audios.entries()) {
    assert.equal(audio.preload, 'none', `element ${index} keeps preload none until enable`);
    assert.equal(audio.src, fakeTracks[index].src);
    assert.equal(audio.autoplay, false);
    assert.equal(audio.loop, true);
    assert.equal(audio.volume, 0, `element ${index} silent until enabled`);
    assert.equal(audio.paused, true);
    assert.equal(audio.playCalls, 0, `element ${index} never played`);
  }
  assert.equal(states.length, 1);
  assert.deepEqual(
    { status: states[0].status, volume: states[0].volume },
    { status: 'off', volume: 0.18 },
  );
  assert.equal(states[0].track, fakeTracks[0]);
});

test('explicit enable plays exactly once at the default low volume', async () => {
  const { createAudio, audios } = fakeFactory();
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  await flush();
  controller.enable();
  await flush();

  assert.equal(audios[0].playCalls, 1, 'exactly one play() call despite repeated enable()');
  assert.equal(audios[0].paused, false);
  assert.equal(audios[0].volume, 0.18);
  assert.equal(audios[0].preload, 'auto', 'preload may move off none only after enable');
  assert.equal(audios[1].playCalls, 0, 'chapter-1 selection never touches the other track');
  assert.deepEqual(states.map((state) => state.status), ['off', 'loading', 'playing']);
});

test('enable then immediate pause: interrupted play() cannot restart sound', async () => {
  const { createAudio, audios } = fakeFactory(['defer']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  controller.pause();
  await flush();

  assert.equal(audios[0].paused, true);
  assert.equal(audios[0].playCalls, 1);
  assert.deepEqual(states.map((state) => state.status), ['off', 'loading', 'paused']);
});

test('enable then pause: a play() promise resolving late is aborted', async () => {
  const { createAudio, audios } = fakeFactory(['defer-resolve']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  controller.pause();
  audios[0].resolvePlay();
  await flush();

  assert.equal(audios[0].paused, true, 'late play() resolution is followed by pause()');
  assert.equal(states.at(-1).status, 'paused');
  assert.equal(states.some((state) => state.status === 'playing'), false);
});

test('regression: enable(); pause(); enable() in one task keeps the second attempt alive (defer / AbortError)', async () => {
  const { createAudio, audios } = fakeFactory(['defer']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  // All three calls land in one task: the first play() is still pending when
  // pause() rejects it (AbortError), and enable() immediately starts attempt 2.
  controller.enable();
  controller.pause();
  controller.enable();
  await flush();

  assert.equal(audios[0].playCalls, 2, 'second enable() starts a new play()');
  audios[0].resolvePlay();
  await flush();

  assert.equal(audios[0].paused, false, 'stale AbortError continuation must not pause the live attempt');
  assert.equal(audios[0].pauseCalls, 1, 'only the explicit pause() paused the element');
  assert.equal(states.some((state) => state.status === 'error'), false, 'no spurious error state');
  assert.equal(states.map((state) => state.status).at(-1), 'playing');
});

test('regression: enable(); pause(); enable() in one task keeps the second attempt alive (defer-resolve / late resolve)', async () => {
  const { createAudio, audios } = fakeFactory(['defer-resolve']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  controller.pause();
  controller.enable();
  await flush();

  assert.equal(audios[0].playCalls, 2, 'second enable() starts a new play()');

  audios[0].resolvePlay(); // attempt 1 settles late and is stale
  await flush();
  assert.equal(audios[0].paused, false, 'stale continuation must not pause the live attempt');
  assert.equal(audios[0].pauseCalls, 1, 'only the explicit pause() paused the element');

  audios[0].resolvePlay(); // attempt 2 settles and is current
  await flush();
  assert.equal(states.map((state) => state.status).at(-1), 'playing');
  assert.equal(states.some((state) => state.status === 'error'), false, 'no spurious error state');
});

test('enable then destroy: pending play() settles into silence, no further states', async () => {
  const { createAudio, audios } = fakeFactory(['defer-resolve']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  controller.destroy();
  audios[0].resolvePlay();
  await flush();

  assert.equal(audios[0].paused, true);
  const afterDestroy = states.length;
  controller.enable();
  controller.setVolume(1);
  await flush();
  assert.equal(states.length, afterDestroy, 'no state emission after destroy');
  assert.equal(audios[0].playCalls, 1, 'no play() after destroy');
});

test('visibilitychange hidden stops playback and aborts a pending play()', async () => {
  await withBrowserEnv(async ({ doc }) => {
    const { createAudio, audios } = fakeFactory(['defer-resolve']);
    const states = [];
    const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

    controller.enable();
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    audios[0].resolvePlay();
    await flush();

    assert.equal(audios[0].paused, true, 'hidden tab stays silent even if play() resolves late');
    assert.equal(states.at(-1).status, 'paused');
    assert.equal(states.some((state) => state.status === 'playing'), false);
  });
});

test('pagehide pauses playback', async () => {
  await withBrowserEnv(async ({ win }) => {
    const { createAudio, audios } = fakeFactory();
    const states = [];
    const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

    controller.enable();
    await flush();
    win.dispatch('pagehide');
    await flush();

    assert.equal(audios[0].paused, true);
    assert.equal(states.at(-1).status, 'paused');
  });
});

test('setVolume clamps to 0..1 and applies to the active element', async () => {
  const { createAudio, audios } = fakeFactory();
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.setVolume(0.9);
  controller.enable();
  await flush();
  assert.equal(audios[0].volume, 0.9, 'volume set before enable carries into playback');

  controller.setVolume(2);
  assert.equal(states.at(-1).volume, 1);
  assert.equal(audios[0].volume, 1);

  controller.setVolume(-3);
  assert.equal(states.at(-1).volume, 0);
  assert.equal(audios[0].volume, 0);

  controller.setVolume(0.25);
  assert.equal(states.at(-1).volume, 0.25);
  assert.equal(audios[0].volume, 0.25);
});

test('setChapter selects the mapped track before enable and ignores invalid input', async () => {
  const { createAudio, audios } = fakeFactory();
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.setChapter(3);
  assert.equal(states.at(-1).track, fakeTracks[1]);
  controller.setChapter('nonsense');
  assert.equal(states.at(-1).track, fakeTracks[1], 'invalid chapter leaves selection unchanged');
  controller.setChapter(7);
  assert.equal(states.at(-1).track, fakeTracks[1], 'undeclared chapter number is ignored');
  controller.setChapter(0);
  assert.equal(states.at(-1).track, fakeTracks[1], 'chapter numbers start at the declared set');
  controller.setChapter(2.5);
  assert.equal(states.at(-1).track, fakeTracks[1], 'non-integers are ignored');

  controller.enable();
  await flush();
  assert.equal(audios[1].playCalls, 1);
  assert.equal(audios[0].playCalls, 0);

  controller.setChapter(5);
  await flush();
  assert.equal(audios[1].playCalls, 1, 'undeclared chapter never starts another play()');
  assert.equal(audios[0].playCalls, 0, 'undeclared chapter never crossfades');
});

test('setChapter while playing crossfades to the mapped track', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  try {
    const { createAudio, audios } = fakeFactory();
    const states = [];
    const controller = createAudioController({
      tracks: fakeTracks,
      createAudio,
      onState: (state) => states.push(state),
      volume: 0.5,
    });

    controller.enable();
    await flush();
    controller.setChapter(3);
    await flush();

    assert.equal(audios[1].playCalls, 1);
    assert.equal(audios[1].paused, false);
    assert.equal(audios[1].volume, 0, 'incoming starts at silence');

    t.mock.timers.tick(160);
    assert.ok(audios[1].volume > 0 && audios[1].volume < 0.5, `incoming ramps up (got ${audios[1].volume})`);
    assert.ok(audios[0].volume > 0 && audios[0].volume < 0.5, `outgoing ramps down (got ${audios[0].volume})`);

    t.mock.timers.tick(200);
    assert.equal(audios[1].volume, 0.5);
    assert.equal(audios[0].volume, 0);
    assert.equal(audios[0].paused, true, 'outgoing element paused at fade end');

    t.mock.timers.tick(1000);
    assert.equal(audios[1].volume, 0.5, 'completed fade is stable');
    assert.equal(states.at(-1).status, 'playing');
  } finally {
    t.mock.timers.reset();
  }
});

test('crossfade is cancellable: pause freezes both elements mid-ramp', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  try {
    const { createAudio, audios } = fakeFactory();
    const states = [];
    const controller = createAudioController({
      tracks: fakeTracks,
      createAudio,
      onState: (state) => states.push(state),
      volume: 0.5,
    });

    controller.enable();
    await flush();
    controller.setChapter(3);
    await flush();
    t.mock.timers.tick(64);
    controller.pause();
    const seenAtPause = states.length;

    const frozen = audios.map((audio) => audio.volume);
    t.mock.timers.tick(1000);
    assert.deepEqual(audios.map((audio) => audio.volume), frozen, 'ramp stops on cancellation');
    assert.equal(audios[0].paused, true);
    assert.equal(audios[1].paused, true, 'aborted incoming element cannot keep playing');
    assert.equal(states.at(-1).status, 'paused');
    assert.equal(states.length, seenAtPause, 'no state change after cancellation');
  } finally {
    t.mock.timers.reset();
  }
});

test('setVolume during a crossfade wins over the in-flight ramp', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  try {
    const { createAudio, audios } = fakeFactory();
    const states = [];
    const controller = createAudioController({
      tracks: fakeTracks,
      createAudio,
      onState: (state) => states.push(state),
      volume: 0.5,
    });

    controller.enable();
    await flush();
    controller.setChapter(3);
    await flush();
    t.mock.timers.tick(64); // mid-ramp
    controller.setVolume(0.9);

    assert.equal(audios[1].volume, 0.9, 'incoming element snaps to the user volume');
    assert.equal(audios[0].paused, true, 'outgoing element settles immediately');
    assert.equal(audios[0].volume, 0);

    t.mock.timers.tick(1000);
    assert.equal(audios[1].volume, 0.9, 'later ramp ticks cannot overwrite the user volume');
    assert.equal(states.at(-1).volume, 0.9);
  } finally {
    t.mock.timers.reset();
  }
});

test('play() rejection reports error and enable() retries successfully', async () => {
  const { createAudio, audios } = fakeFactory(['reject-once']);
  const states = [];
  const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

  controller.enable();
  await flush();
  const failed = states.at(-1);
  assert.equal(failed.status, 'error');
  assert.equal(failed.error, 'fake play rejected');
  assert.equal(failed.track, fakeTracks[0]);

  controller.enable();
  await flush();
  assert.equal(audios[0].playCalls, 2);
  assert.equal(states.at(-1).status, 'playing');
  assert.equal('error' in states.at(-1), false, 'recovered state carries no error');
});

test('destroy removes document/window listeners and tears elements down', async () => {
  await withBrowserEnv(async ({ doc, win }) => {
    const { createAudio, audios } = fakeFactory();
    const states = [];
    const controller = createAudioController({ tracks: fakeTracks, createAudio, onState: (state) => states.push(state) });

    assert.equal(doc.count(), 1);
    assert.equal(win.count(), 1);
    controller.enable();
    await flush();

    controller.destroy();
    assert.equal(doc.count(), 0, 'visibilitychange listener removed');
    assert.equal(win.count(), 0, 'pagehide listener removed');
    assert.equal(audios[0].paused, true);
    assert.equal(audios.every((audio) => audio.volume === 0), true);

    const seen = states.length;
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    win.dispatch('pagehide');
    controller.pause();
    controller.setChapter(2);
    await flush();
    assert.equal(states.length, seen);
    assert.equal(audios[0].playCalls, 1);
  });
});

test('no tracks reports an honest error instead of pretending to play', () => {
  const { createAudio, audios } = fakeFactory();
  const states = [];
  const controller = createAudioController({ tracks: [], createAudio, onState: (state) => states.push(state) });

  controller.enable();
  assert.equal(audios.length, 0);
  assert.equal(states.at(-1).status, 'error');
  assert.equal(states.at(-1).error, 'no-tracks');
});

test('audioTracks descriptors match the contract and their files exist', async () => {
  assert.ok(Array.isArray(audioTracks));
  assert.ok(audioTracks.length >= 1);
  for (const track of audioTracks) {
    for (const key of ['id', 'title', 'src', 'author', 'source', 'license']) {
      assert.equal(typeof track[key], 'string', `${track.id}.${key} is a string`);
      assert.ok(track[key].length > 0, `${track.id}.${key} is non-empty`);
    }
    assert.ok(Array.isArray(track.chapters), `${track.id}.chapters is a list`);
    for (const chapter of track.chapters) {
      assert.ok(Number.isInteger(chapter) && chapter >= 1 && chapter <= 4, `${track.id} chapter ${chapter} in 1..4`);
    }
    assert.ok(track.src.startsWith('./public/audio/'), `${track.id} served from the local public/audio directory`);
    assert.ok(!track.src.includes('internationale'), 'unwired internationale.mp3 is not a track');
    assert.ok(track.license.includes('CC BY 4.0'), `${track.id} carries its verified licence`);
    assert.ok(track.source.startsWith('https://www.scottbuckley.com.au/library/'), `${track.id} cites the author's work page`);
    await access(fileURLToPath(new URL(track.src.replace('./', '../'), import.meta.url)));
  }
});
