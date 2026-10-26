// Evidence for scripts/bake-watcher-crt.mjs: renders the original art under the runtime recolour filter and the glow
// chain next to the baked copies and prints the pixel difference, per phosphor.
//   node scripts/compare-watcher-bake.mjs "$(pwd)" [green|amber]     (needs PLAYWRIGHT_MODULE and Chrome)
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
const root = process.argv[2];
const phosphorName = process.argv[3] || 'green';
// Repeated from bake-watcher-crt.mjs (importing it would re-bake): canvas padding and the per-phosphor mapping.
const PAD = 80, SIZE = 1200, OUT = SIZE + PAD * 2;
const PHOSPHORS = {
  green: { suffix: 'crt', bg: '#0a0e0b', glow: 'drop-shadow(0 0 4px rgba(180,245,195,.7)) drop-shadow(0 0 16px rgba(120,220,150,.45))',
    table: ['0.039 0.373 0.659 0.831', '0.055 0.541 0.847 0.961', '0.043 0.420 0.690 0.855'] },
  amber: { suffix: 'amber', bg: '#0e0a06', glow: 'drop-shadow(0 0 4px rgba(255,210,150,.7)) drop-shadow(0 0 16px rgba(235,165,75,.45))',
    table: ['0.055 0.627 0.922 1', '0.039 0.478 0.769 0.878', '0.024 0.282 0.549 0.690'] },
};
const phosphor = PHOSPHORS[phosphorName];
if (!phosphor) throw new Error('phosphor must be one of: ' + Object.keys(PHOSPHORS).join(', '));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
let html = '';
const server = http.createServer((q, r) => {
  if (q.url === '/') { r.setHeader('content-type', 'text/html'); return r.end(html); }
  try { r.setHeader('content-type', q.url.endsWith('.webp') ? 'image/webp' : 'image/png'); r.end(readFileSync(path.join(root, 'public/images/watcher', path.basename(q.url)))); } catch { r.statusCode = 404; r.end(); }
}).listen(0);
const base = 'http://127.0.0.1:' + server.address().port + '/';
const img = f => base + f;
const [tr, tg, tb] = phosphor.table;
const filter = `<svg width="0" height="0" style="position:absolute"><filter id="tune" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="${tr}"/><feFuncG type="table" tableValues="${tg}"/><feFuncB type="table" tableValues="${tb}"/></feComponentTransfer></filter></svg>`;
const clip = id => `<clipPath id="${id}"><path d="M437 621 C446 600 464 587 486 590 C502 591 516 601 524 614 C500 616 476 633 454 630 Z" /><path d="M601 615 C607 596 621 588 642 589 C663 590 678 604 682 622 L674 630 C648 623 624 617 601 618 Z" /></clipPath>`;
// A 590px box with the art at 86% (507px), as on a 1440px desktop; the bake assumes that display size.
const box = (id, inner, extra = '') => `<div id="${id}" style="position:relative;width:590px;height:590px;background:${phosphor.bg}"><div style="position:absolute;inset:0;${extra}"><div style="position:absolute;inset:7%;width:86%;height:86%">${inner}</div></div></div>`;
const layer = (inset, size) => `position:absolute;inset:${inset};width:${size};height:${size}`;
const inset = `${(-100 * PAD / SIZE).toFixed(4)}%`, size = `${(100 * OUT / SIZE).toFixed(4)}%`;
const runtime = box('runtime', `<svg viewBox="0 0 1200 1200" style="${layer('0', '100%')}"><defs>${clip('a')}</defs><g clip-path="url(#a)"><image href="${img('watcher-eyes.png')}" width="1200" height="1200"/></g></svg><img src="${img('watcher-base.png')}" style="${layer('0', '100%')}">`, `filter:url(#tune) ${phosphor.glow}`);
const baked = box('baked', `<svg viewBox="${-PAD} ${-PAD} ${OUT} ${OUT}" style="${layer(inset, size)}"><defs>${clip('b')}</defs><g clip-path="url(#b)"><image href="${img(`watcher-eyes.${phosphor.suffix}.webp`)}" x="${-PAD}" y="${-PAD}" width="${OUT}" height="${OUT}"/></g></svg><img src="${img(`watcher-base.${phosphor.suffix}.webp`)}" style="${layer(inset, size)}">`);
html = `<body style="margin:10px;background:${phosphor.bg};display:flex;gap:20px">${filter}${runtime}${baked}</body>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1240, height: 620 } });
await page.goto(base);
await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
await page.waitForTimeout(500);
const out = path.join(root, 'test-results/crt-screens');
mkdirSync(out, { recursive: true });
const A = await page.locator('#runtime').screenshot();
const B = await page.locator('#baked').screenshot();
await page.screenshot({ path: path.join(out, `watcher-runtime-vs-baked-${phosphorName}.png`) });
await browser.close(); server.close();
const a = await sharp(A).raw().toBuffer({ resolveWithObject: true });
const b = await sharp(B).raw().toBuffer({ resolveWithObject: true });
// Halo = pixels the runtime render shows as glow (dark, below 70/255 in every channel); art = everything brighter.
const groups = { all: [0, 0, 0, 0], halo: [0, 0, 0, 0], art: [0, 0, 0, 0] }; // pixels, sum, max, over8
const n = a.info.width * a.info.height, ch = a.info.channels;
for (let p = 0; p < n; p++) {
  let d = 0, bright = 0;
  for (let c = 0; c < 3; c++) { d = Math.max(d, Math.abs(a.data[p * ch + c] - b.data[p * ch + c])); bright = Math.max(bright, a.data[p * ch + c]); }
  for (const g of [groups.all, bright < 70 ? groups.halo : groups.art]) { g[0]++; g[1] += d; g[2] = Math.max(g[2], d); if (d > 8) g[3]++; }
}
const summary = Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, { pixels: g[0], meanAbsDiff: +(g[1] / g[0]).toFixed(3), maxDiff: g[2], pctOver8of255: +(100 * g[3] / g[0]).toFixed(3) }]));
const result = { phosphor: phosphorName, ...summary };
writeFileSync(path.join(out, `watcher-bake-compare-${phosphorName}.json`), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
