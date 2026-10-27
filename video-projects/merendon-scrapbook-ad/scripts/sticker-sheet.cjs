// Builds sticker-sheet/stickers.pdf + .png: every sticker, its file name and
// where it lands in the ad — a sheet to mark up / replace and send back.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.dirname(__dirname);
const S = [
  ['quetzal-panicking', 'Hook — "one moment" (overloaded pile)', 400],
  ['badge-2am', 'Hook — lands on the pile', 270],
  ['quetzal-sweating', 'Myth — "your notes" (highlighting)', 320],
  ['mug-cracked', 'Myth — "burning"', 300],
  ['alarm-clock', 'Myth — "burning", rattles', 280],
  ['highlighters', 'Turn — "information"', 280],
  ['lightning', 'Turn — "easier"', 230],
  ['heart', 'Turn — next to the chosen tab', 150],
  ['quetzal-sunglasses', 'Payoff — "really"', 340],
  ['gold-star', 'Payoff — "exam"', 210],
  ['a-plus', 'Payoff — "exam"', 230],
  ['quetzal-nodding', 'CTA — corner, nods', 380],
  ['quetzal-side-eye', 'not used yet (spare)', 0],
];
const cells = S.map(([n, where, px], i) => `
  <div class="cell"><div class="num">${i + 1}</div>
    <img src="../public/stickers/${n}.svg">
    <div class="name">${n}.svg</div><div class="where">${where}</div>
    <div class="px">${px ? `on screen ≈ ${px}px` : '&nbsp;'}</div>
    <div class="notes">notes: ______________________</div></div>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
@page{size:Letter;margin:0.4in}
body{font-family:Arial,Helvetica,sans-serif;color:#1E1A17;margin:0}
h1{font-size:20px;margin:0 0 4px} p{font-size:11px;margin:0 0 10px;line-height:1.4}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.cell{border:1.5px dashed #999;border-radius:8px;padding:6px;background:#C8A57A22;position:relative;page-break-inside:avoid}
.cell img{width:100%;aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(30,26,23,.25))}
.num{position:absolute;top:4px;left:8px;font-weight:700;font-size:14px}
.name{font-weight:700;font-size:11px}.where{font-size:10px}.px{font-size:9px;color:#555}
.notes{font-size:9px;margin-top:6px;color:#555}
</style><body>
<h1>Merendón ad — sticker sheet (13 stickers)</h1>
<p><b>How to send fixes:</b> replace any sticker with a file of the <b>same name</b> (SVG, or transparent PNG ≥ 800×800, square, no white border needed — the die-cut border + shadow can be added in code), or mark up this sheet and send it back. Palette: salmon #E0654F · ink #1E1A17 · paper #F4EBDD · red pen #C8322B · highlighter #FFE45C · quetzal green #1F8A5B / red chest #C8322B · magenta #D8407F (sparingly).</p>
<div class="grid">${cells}</div></body>`;
const out = path.join(ROOT, 'sticker-sheet');
fs.mkdirSync(out, {recursive: true});
const page = path.join(out, '.sheet.html');
fs.writeFileSync(page, html);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1100, height: 1400}});
  await p.goto('file://' + page);
  await p.waitForTimeout(800);
  await p.pdf({path: path.join(out, 'stickers.pdf'), format: 'Letter', printBackground: true});
  await p.screenshot({path: path.join(out, 'stickers.png'), fullPage: true});
  await b.close();
  fs.unlinkSync(page);
})();
