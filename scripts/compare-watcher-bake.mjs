// Evidence for scripts/bake-watcher-crt.mjs: renders the original art under the runtime crt-tune filter next to the baked
// copies and prints the pixel difference. node scripts/compare-watcher-bake.mjs "$(pwd)" (needs PLAYWRIGHT_MODULE and Chrome).
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
const root = process.argv[2];
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
let html = '';
const server = http.createServer((q, r) => {
  if (q.url === '/') { r.setHeader('content-type', 'text/html'); return r.end(html); }
  try { r.setHeader('content-type', 'image/png'); r.end(readFileSync(path.join(root, 'public/images/watcher', path.basename(q.url)))); } catch { r.statusCode = 404; r.end(); }
}).listen(0);
const base = 'http://127.0.0.1:' + server.address().port + '/';
const img = f => base + f;
const filter = `<svg width="0" height="0" style="position:absolute"><filter id="crt-tune" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues="0.039 0.373 0.659 0.831"/><feFuncG type="table" tableValues="0.055 0.541 0.847 0.961"/><feFuncB type="table" tableValues="0.043 0.420 0.690 0.855"/></feComponentTransfer></filter></svg>`;
const clip = id => `<clipPath id="${id}"><path d="M437 621 C446 600 464 587 486 590 C502 591 516 601 524 614 C500 616 476 633 454 630 Z" /><path d="M601 615 C607 596 621 588 642 589 C663 590 678 604 682 622 L674 630 C648 623 624 617 601 618 Z" /></clipPath>`;
const box = (id, inner, extra = '') => `<div id="${id}" style="position:relative;width:590px;height:590px;background:#0a0e0b"><div style="position:absolute;inset:0;${extra}"><div style="position:absolute;inset:7%;width:86%;height:86%">${inner}</div></div></div>`;
const layer = (inset, size) => `position:absolute;inset:${inset};width:${size};height:${size}`;
const runtime = box('runtime', `<svg viewBox="0 0 1200 1200" style="${layer('0', '100%')}"><defs>${clip('a')}</defs><g clip-path="url(#a)"><image href="${img('watcher-eyes.png')}" width="1200" height="1200"/></g></svg><img src="${img('watcher-base.png')}" style="${layer('0', '100%')}">`, 'filter:url(#crt-tune) drop-shadow(0 0 4px rgba(180,245,195,.35))');
const baked = box('baked', `<svg viewBox="-24 -24 1248 1248" style="${layer('-2%', '104%')}"><defs>${clip('b')}</defs><g clip-path="url(#b)"><image href="${img('watcher-eyes.crt.png')}" x="-24" y="-24" width="1248" height="1248"/></g></svg><img src="${img('watcher-base.crt.png')}" style="${layer('-2%', '104%')}">`);
html = `<body style="margin:10px;background:#0a0e0b;display:flex;gap:20px">${filter}${runtime}${baked}</body>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1240, height: 620 } });
await page.goto(base);
await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
await page.waitForTimeout(500);
const out = path.join(root, 'test-results/crt-screens');
const A = await page.locator('#runtime').screenshot();
const B = await page.locator('#baked').screenshot();
await page.screenshot({ path: path.join(out, 'watcher-runtime-vs-baked.png') });
await browser.close(); server.close();
const a = await sharp(A).raw().toBuffer({ resolveWithObject: true });
const b = await sharp(B).raw().toBuffer({ resolveWithObject: true });
let sum = 0, max = 0, over8 = 0; const n = a.info.width * a.info.height, ch = a.info.channels;
for (let p = 0; p < n; p++) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[p * ch + c] - b.data[p * ch + c])); sum += d; max = Math.max(max, d); if (d > 8) over8++; }
console.log(JSON.stringify({ pixels: n, meanAbsDiff: +(sum / n).toFixed(3), maxDiff: max, pixelsOver8of255: over8, pctOver8: +(100 * over8 / n).toFixed(3) }));
