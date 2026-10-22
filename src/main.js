import { chapters, sources, epilogue, questions, initialState, transition } from './story.js';
import { createMap } from './map.js';
import { createShareCard } from './share.js';
import { createMediaControls } from './media.js';

const $ = (selector) => document.querySelector(selector);
let state = initialState();
let cardURL;
let shareRequested = false;
let sourceTrigger;
const map = createMap($('#map'));
const chapterButtons = [...document.querySelectorAll('[data-chapter]')];
const dialog = $('#sources-dialog');
createMediaControls({ audio: $('#background-music'), musicButton: $('#music-toggle'), motionButton: $('#motion-toggle'), root: document.body });
$('.media-controls').hidden = false;

// The same static gallery follows the full text without JavaScript.
const historyGallery = $('#history-gallery');
$('#experience .footer').before(historyGallery);
historyGallery.hidden = true;
const entranceAnimations = new Set();
let entranceGeneration = 0;
const motionAllowed = () => document.body.dataset.motion === 'on' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
function completeEntrances() {
  entranceGeneration++;
  for (const animation of entranceAnimations) animation.cancel();
  entranceAnimations.clear();
}
function enter(element, keyframes, duration) {
  if (!motionAllowed() || typeof element.animate !== 'function') return;
  const animation = element.animate(keyframes, { duration, easing: 'ease-out' });
  entranceAnimations.add(animation);
  animation.onfinish = animation.oncancel = () => entranceAnimations.delete(animation);
}
function enterReading(elements) {
  elements.forEach((element, index) => enter(element, [
    { opacity: .4, transform: 'translateY(8px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], index % 2 ? 360 : 320));
}
// An observer enhances images already readable in their base state; it never hides them.
if (typeof IntersectionObserver === 'function') {
  const photoObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || historyGallery.hidden) continue;
      const image = entry.target;
      photoObserver.unobserve(image);
      const token = entranceGeneration;
      image.decode().then(() => {
        const bounds = image.getBoundingClientRect();
        if (token !== entranceGeneration || historyGallery.hidden || bounds.bottom <= 0 || bounds.top >= innerHeight) return;
        enter(image, [{ opacity: .6, transform: 'scale(1.025)' }, { opacity: 1, transform: 'scale(1)' }], 720);
      }).catch(() => { /* A failed image still exposes its alt and caption. */ });
    }
  }, { threshold: .12 });
  historyGallery.querySelectorAll('img').forEach((image) => photoObserver.observe(image));
}
const entranceMotionObserver = new MutationObserver(() => { if (!motionAllowed()) completeEntrances(); });
entranceMotionObserver.observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
document.addEventListener('visibilitychange', () => { if (document.hidden) completeEntrances(); });
window.addEventListener('pagehide', completeEntrances);

// Progress is intentionally not restored from a hash or local storage.
// Any hash navigation returns to the cover, including an unknown hash.
function clearHash() {
  if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
}
clearHash();
window.addEventListener('hashchange', () => {
  const isSkipLink = location.hash === '#reading';
  clearHash();
  if (!isSkipLink) dispatch({ type: 'RESTART' });
});

function render() {
  const chapter = chapters[state.chapter - 1];
  const onChapter = Boolean(chapter);
  const onEpilogue = state.chapter === 5;
  document.body.dataset.scene = onChapter ? 'chapter' : onEpilogue ? 'epilogue' : 'cover';
  $('#cover').hidden = state.chapter !== 0;
  $('#cover-start').hidden = state.chapter !== 0;
  $('#share-section').hidden = !onEpilogue || !shareRequested;
  $('#chapter').hidden = !onChapter;
  $('#epilogue').hidden = !onEpilogue;
  $('#quiz').hidden = !onEpilogue;
  historyGallery.hidden = !onEpilogue;
  $('#narrative').setAttribute('aria-labelledby', onChapter ? 'chapter-heading' : onEpilogue ? 'epilogue-heading' : 'cover-heading');
  chapterButtons.forEach((button) => {
    const active = Number(button.dataset.chapter) === state.chapter;
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.setAttribute('aria-label', `${button.textContent.trim()}${active ? '，当前章节' : ''}`);
  });
  if (chapter) {
    $('#chapter-date').textContent = `${chapter.date} · ${chapter.direction === 'west' ? '西渡' : '东渡'}`;
    $('#chapter-heading').replaceChildren(...chapter.title.match(/[^：，]+[：，]?/gu).map((part) => {
      const span = document.createElement('span');
      span.className = 'keep-together';
      span.textContent = part;
      return span;
    }));
    for (const key of ['situation', 'action', 'result']) $(`#${key}`).textContent = chapter[key];
    $('#chapter-detail').hidden = !state.revealed;
    $('#reveal').setAttribute('aria-expanded', String(state.revealed));
    $('#reveal').textContent = state.revealed ? '重播路线 ↻' : '展开路线 ↗';
    $('#reveal').setAttribute('aria-label', state.revealed ? '重播路线' : '展开路线');
    $('#prev').textContent = state.chapter === 1 ? '返回开场' : '← 上一渡';
    $('#next').textContent = state.chapter === 4 ? '阅读尾声 →' : '下一渡 →';
    $('#map-caption').textContent = state.revealed
      ? `${chapter.title.slice(0, 2)} · ${chapter.direction === 'west' ? '← 西渡' : '东渡 →'} · ${chapter.crossings.join('、')}`
      : `${chapter.title.slice(0, 2)} · 先看局势，再展开本次路线`;
  } else {
    $('#map-caption').textContent = '一渡、三渡西渡；二渡、四渡东渡。';
  }
  map.render(state);
  $('#announcement').textContent = onChapter
    ? `当前：第${state.chapter}渡。${chapter.title}，${chapter.date}。${state.revealed ? '路线已展开，行动与结果可阅读。' : '路线尚未展开。'}`
    : onEpilogue ? epilogue.title : '开场。四渡赤水：为什么这样走。';
}

function dispatch(event) {
  if (event.type === 'REVEAL' && state.revealed) {
    map.play();
    return;
  }
  const previousChapter = state.chapter;
  const wasRevealed = state.revealed;
  completeEntrances();
  state = transition(state, event);
  render();
  if (state.chapter !== previousChapter || event.type === 'GOTO' || event.type === 'RESTART') {
    enterReading(state.chapter === 0 ? [...$('#cover').children]
      : state.chapter === 5 ? [$('#epilogue-heading'), $('#epilogue-body')]
        : [$('#chapter-date'), $('#chapter-heading'), $('#situation').closest('.prose-block')]);
  } else if (event.type === 'REVEAL' && !wasRevealed && state.revealed) {
    enterReading([$('#action').closest('.prose-block'), $('#result').closest('.prose-block')]);
  }
  if (event.type === 'REVEAL' && !wasRevealed && state.revealed) map.play();
  if (state.chapter !== previousChapter) {
    const heading = state.chapter === 5 ? $('#epilogue-heading') : state.chapter === 0 ? $('#cover-heading') : $('#chapter-heading');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

document.querySelectorAll('[data-event]').forEach((button) => button.addEventListener('click', () => dispatch({ type: button.dataset.event })));
chapterButtons.forEach((button) => button.addEventListener('click', () => dispatch({ type: 'GOTO', chapter: Number(button.dataset.chapter) })));
$('#epilogue-heading').textContent = epilogue.title;
$('#epilogue-body').textContent = epilogue.body;

for (const [index, question] of questions.entries()) {
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = question.prompt;
  fieldset.append(legend);
  const feedback = document.createElement('p');
  feedback.className = 'quiz-feedback';
  feedback.id = `feedback-${index}`;
  feedback.setAttribute('role', 'status');
  question.options.forEach((option, optionIndex) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `question-${index}`;
    input.value = String(optionIndex);
    input.setAttribute('aria-describedby', feedback.id);
    const text = document.createElement('span');
    text.textContent = option;
    label.append(input, text);
    input.addEventListener('change', () => {
      feedback.textContent = `${optionIndex === question.answer ? '回答正确。' : '再想一想，可以重新选择。'}${question.explanation}`;
    });
    fieldset.append(label);
  });
  fieldset.append(feedback);
  $('#questions').append(fieldset);
}

for (const source of sources) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `${source.title} ↗`;
  const publisher = document.createElement('p');
  publisher.textContent = source.publisher;
  item.append(link, publisher);
  $('#sources-list').append(item);
}

document.querySelectorAll('[data-open-sources]').forEach((button) => {
  button.hidden = false;
  button.addEventListener('click', () => {
    sourceTrigger = button;
    const chapter = chapters[state.chapter - 1];
    $('#source-context').textContent = button.id === 'chapter-sources' && chapter
      ? `${chapter.title}。本章采用以下${chapter.sourceIds.length}项来源。`
      : '四章历史叙述采用以下两项来源。';
    dialog.showModal();
    $('#close-sources').focus();
  });
});
$('#close-sources').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || !dialog.open) return;
  const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.checkVisibility() && element.tabIndex >= 0);
  if (!controls.length) return;
  const index = controls.indexOf(document.activeElement);
  if (event.shiftKey ? index <= 0 : index === controls.length - 1 || index === -1) {
    event.preventDefault();
    controls[event.shiftKey ? controls.length - 1 : 0].focus();
  }
});
dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog.addEventListener('close', () => sourceTrigger?.focus({ preventScroll: true }));

async function generateCard() {
  const button = $('#make-card');
  const retry = $('#retry-card');
  shareRequested = true;
  $('#share-section').hidden = false;
  $('#share-status').textContent = '正在本机生成图片…';
  button.disabled = true;
  retry.hidden = true;
  try {
    const blob = await createShareCard();
    const nextURL = URL.createObjectURL(blob);
    const previousURL = cardURL;
    cardURL = nextURL;
    $('#share-preview').src = cardURL;
    $('#download-card').href = cardURL;
    $('#open-card').href = cardURL;
    $('#share-result').hidden = false;
    if (previousURL) URL.revokeObjectURL(previousURL);
    $('#share-status').textContent = '图片已在本机生成。可下载图片；也可打开图片后长按保存。';
    retry.textContent = '重新生成图片';
  } catch {
    $('#share-status').textContent = '图片生成失败，请重试。若仍无法生成，可先继续阅读，并使用浏览器截图保存。';
    retry.textContent = '重试生成图片';
  } finally {
    button.disabled = false;
    retry.hidden = false;
  }
}
$('#make-card').addEventListener('click', generateCard);
$('#retry-card').addEventListener('click', generateCard);
window.addEventListener('pagehide', (event) => {
  if (!event.persisted && cardURL) URL.revokeObjectURL(cardURL);
});
render();
$('#experience').hidden = false;
enterReading([$('h1'), $('.subtitle'), ...$('#cover').children]);
