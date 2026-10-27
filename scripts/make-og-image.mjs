// Renders the link-preview card app/(frontend)/opengraph-image.png (1200x630) from the site's own theme: Plex Mono,
// the CRT palette and the baked Watcher layers. Run once after changing the design; the PNG is committed.
//   npm exec --yes --package=playwright@1.64.1 -- node scripts/make-og-image.mjs
// BROWSER_PATH overrides the Chrome path. Reads only repo files; no network.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)) }));
const data = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`;
const regular = data('app/fonts/ibm-plex-mono-latin-400-normal.woff2', 'font/woff2');
const bold = data('app/fonts/ibm-plex-mono-latin-700-normal.woff2', 'font/woff2');
const face = data('public/images/watcher/watcher-base.crt.webp', 'image/webp');
const eyes = data('public/images/watcher/watcher-eyes.crt.webp', 'image/webp');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Plex; src: url(${regular}) format('woff2'); font-weight: 400; }
@font-face { font-family: Plex; src: url(${bold}) format('woff2'); font-weight: 700; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; background: #0a0e0b; font-family: Plex, monospace; color: #a8d8b0; position: relative; }
body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%); }
body::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.07) 0 2px, transparent 2px 4px); }
.text { position: absolute; left: 72px; top: 70px; width: 640px; z-index: 1; }
.eyebrow { font-size: 22px; letter-spacing: .14em; color: #7fb08a; }
h1 { margin-top: 26px; font-size: 92px; line-height: 1.02; font-weight: 700; color: #d4f5da; text-shadow: 0 0 3px rgba(212,245,218,.8), 0 0 18px rgba(140,230,165,.5); }
p { margin-top: 30px; font-size: 26px; line-height: 1.5; max-width: 30ch; }
.foot { position: absolute; left: 72px; bottom: 42px; font-size: 20px; letter-spacing: .12em; color: #7fb08a; z-index: 1; }
.watcher { position: absolute; right: 24px; top: 50%; width: 520px; height: 520px; transform: translateY(-50%); }
.watcher img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
</style>
<div class="text">
  <div class="eyebrow">PUBLIC SYSTEM INDEX / REV. 0.2</div>
  <h1>MIGRAINZ<br>ARCHIVE &amp;<br>PROJECTS</h1>
  <p>Artwork, comics, objects and works in progress.</p>
</div>
<div class="foot">STUDIO MIGRAINZ // PUBLIC ACCESS TERMINAL</div>
<div class="watcher"><img src="${face}" alt=""><img src="${eyes}" alt=""></div>`;

const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.resolve('app/(frontend)/opengraph-image.png');
  await page.screenshot({ path: out, type: 'png' });
  console.log('Wrote ' + path.relative(process.cwd(), out));
} finally {
  await browser.close();
}
