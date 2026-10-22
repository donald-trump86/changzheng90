import { chapters } from './story.js';

/** Generate an entirely local commemorative image from the shared chapter data. */
export async function createShareCard() {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const ink = '#fff4df';
  const ground = '#a51c27';
  const accent = '#fdcf30';
  const sans = '"PingFang SC", "Microsoft YaHei", sans-serif';
  const serif = '"Songti SC", "STSong", "SimSun", serif';
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, 1080, 1440);
  function text(value, x, y, size, face = sans, color = ink) {
    ctx.font = `${size}px ${face}`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  text('纪念红军长征胜利90周年', 64, 87, 28);
  text('四渡赤水', 50, 305, 238, serif);
  text('为什么这样走', 66, 374, 42, serif);
  // Original simplified landscape: one river crossed four times.
  ctx.fillStyle = '#7e1420';
  ctx.beginPath();
  ctx.moveTo(0, 668);
  for (const [x, y] of [[90, 510], [205, 607], [300, 450], [425, 624], [535, 509], [675, 650], [790, 470], [921, 620], [1080, 532], [1080, 920], [0, 920]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  const river = new Path2D('M600 420C750 510 420 535 537 656S750 737 610 906');
  ctx.strokeStyle = '#e5ab63';
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.stroke(river);
  const routeRows = [
    { d: 'M800 493C680 462 505 515 298 533', x: 480, y: 515, left: true, label: '一渡 · 西渡', tx: 160, ty: 493 },
    { d: 'M225 615C400 590 500 588 799 622', x: 652, y: 610, left: false, label: '二渡 · 东渡', tx: 785, ty: 593 },
    { d: 'M826 759C700 781 580 732 320 728', x: 500, y: 737, left: true, label: '三渡 · 西渡', tx: 154, ty: 775 },
    { d: 'M281 824C460 782 600 821 785 851', x: 705, y: 838, left: false, label: '四渡 · 东渡', tx: 785, ty: 815 },
  ];
  routeRows.forEach((route) => {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 7;
    ctx.stroke(new Path2D(route.d));
    ctx.fillStyle = accent;
    const sign = route.left ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(route.x + sign * 19, route.y);
    ctx.lineTo(route.x - sign * 10, route.y - 12);
    ctx.lineTo(route.x - sign * 10, route.y + 12);
    ctx.closePath();
    ctx.fill();
    text(route.label, route.tx, route.ty, 29, sans, accent);
  });
  text('路线为概略示意', 65, 899, 25);
  chapters.forEach((chapter, index) => {
    const y = 1001 + index * 66;
    text(chapter.title.slice(0, 2), 66, y, 32, serif);
    text(chapter.date, 185, y, 31);
    text(chapter.direction === 'west' ? '西渡 ←' : '东渡 →', 840, y, 31, sans, accent);
  });
  text('长征主题历史互动作品', 66, 1313, 28);
  text('changzheng90.luvch1nabest.me', 66, 1370, 28);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png');
  });
}
