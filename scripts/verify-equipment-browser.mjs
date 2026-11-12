// Actual components with a minimal router shim, independent of CMS/editor data.
// Batch 25 (board 3), updated on purpose: the item page now shows the schematic inside the dossier template
// (components/Dossier.tsx): the module alone in a figure on the left, the record (fields table) on the right on wide
// screens and under it on phones, EQUIPMENT CARRIED as small linked cards. The schematic's own behaviour (no controls,
// hover/tap inert, pause off screen and on hidden tabs, poster stills, ratios) is checked exactly as before. The module's
// attached specs panel (children) is no longer used by a page; ?mode=panel keeps one check of it while the component
// still supports it.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('test-results/equipment-browser');
await mkdir(output, { recursive: true });
const bundle = await build({ bundle: true, write: false, outfile: 'bundle.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import EquipmentSchematic from './components/EquipmentSchematic';
import EquipmentCards from './components/EquipmentCards';
import ContentGallery from './components/ContentGallery';
import EquipmentSpecifications from './components/EquipmentSpecifications';
import { Dossier } from './components/Dossier';
const mode=new URLSearchParams(location.search).get('mode')||'valid';
const images=[{src:'/poster.svg',alt:'First concept',caption:'First'},{src:'/poster.svg',alt:'Second concept',caption:'Second'}];
createRoot(document.getElementById('root')).render(<main>
<h1>Equipment fixture</h1>
{mode==='panel'&&<EquipmentSchematic name="Scanner" src="/clip.mp4" poster="/poster.svg">
  <p className="eyebrow">Sensor / UPDATED 2026-10-21</p><EquipmentSpecifications rows={[{label:'Capacity',value:'2 cells'},{label:'Manufacturer',value:'Acme'}]}/></EquipmentSchematic>}
{mode!=='disabled'&&mode!=='panel'&&<div className="project-application"><div className="project-app-content"><Dossier label="Equipment dossier" file="Scanner.EQP" code="FX-001" name="Scanner" fieldsCaption="TECHNICAL SPECIFICATIONS"
  fields={[{label:'CATEGORY',value:'Sensor'},{label:'Capacity',value:'2 cells'},{label:'Manufacturer',value:'Acme'}]}
  media={<figure className="dossier-figure"><EquipmentSchematic name="Scanner" ratio={mode==='wide'?2:mode==='tall'?0.5:undefined} src={mode==='missing'?undefined:mode==='failure'||mode==='failure-no-poster'?'/broken.mp4':'/clip.mp4'} poster={mode==='failure-no-poster'?undefined:mode==='wide'?'/poster-wide.svg':mode==='tall'?'/poster-tall.svg':'/poster.svg'}/><figcaption>SCHEMATIC · Scanner.EQP</figcaption></figure>}/></div></div>}
<ContentGallery images={images}/>
<EquipmentCards projectSlug="fixture" equipment={mode==='empty'?[]:[{name:'Scanner',slug:'scanner',category:'Sensor',designation:'Personal scanner',quantity:2,notes:'Assignment note',images:[],poster:{src:'/poster.svg',alt:''},specifications:[{label:'Capacity',value:'2 cells'}]}]}/>
<div style={{height:'2000px'}}>Scroll space</div></main>);` },
  plugins: [{ name: 'router', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'test' }));
    b.onLoad({ filter: /^link$/, namespace: 'test' }, () => ({ contents: 'export default function Link({children,prefetch,...props}) {return <a {...props}>{children}</a>}', loader: 'jsx', resolveDir: process.cwd() }));
    b.onLoad({ filter: /^navigation$/, namespace: 'test' }, () => ({ contents: 'export const usePathname = () => location.pathname; export const useRouter = () => ({ push: href => { location.href = href; } });', loader: 'js', resolveDir: process.cwd() }));
  } }],
});
await writeFile(path.join(output, 'bundle.js'), bundle.outputFiles[0].contents);
let clip;
const server = createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile('app/(frontend)/globals.css')); }
  if (req.url === '/poster.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#193"/></svg>'); }
  if (req.url === '/poster-tall.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#193"/></svg>'); }
  if (req.url === '/poster-wide.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#193"/></svg>'); }
  if (req.url === '/clip.mp4' && clip) { res.setHeader('Content-Type', 'video/mp4'); return res.end(clip); }
  if (req.url.endsWith('.mp4')) { res.statusCode = 404; return res.end(); }
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' }) });
const base = `http://127.0.0.1:${server.address().port}`;
try {
  // Generate real H.264 MP4 locally in Chrome; no downloaded fixture or artwork changes.
  const recorder = await browser.newPage();
  await recorder.goto(base + '/?mode=disabled');
  const bytes = await recorder.evaluate(async () => {
    const mimeType = 'video/mp4;codecs=avc1.42001E';
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('H.264 MP4 MediaRecorder unavailable in this Chrome.');
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    document.body.appendChild(canvas); const context = canvas.getContext('2d'); context.fillStyle='#193';context.fillRect(0,0,320,180);
    const stream = canvas.captureStream(0), chunks = [];
    const recording = new MediaRecorder(stream, { mimeType });
    const finished = new Promise(resolve => { recording.onstop = resolve; });
    recording.ondataavailable = event => chunks.push(event.data); recording.start(100);
    for (let i = 0; i < 36; i++) { context.fillStyle = i % 2 ? '#193' : '#164'; context.fillRect(0, 0, 320, 180); stream.getVideoTracks()[0].requestFrame(); await new Promise(r => setTimeout(r, 45)); }
    recording.stop(); await finished; stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
  });
  assert(bytes.length>0, 'Recorder produced no MP4 bytes');clip = Buffer.from(bytes); await recorder.close(); await writeFile(path.join(output, 'fixture.mp4'), clip);
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    const video = page.locator('video');
    try { await page.waitForFunction(() => { const v = document.querySelector('video'); return v?.readyState >= 2 && !v.paused; }, {timeout: 10000}); } catch (error) { console.log(await page.evaluate(()=>({html:document.querySelector('.equipment-schematic')?.outerHTML, state:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,ready:v.readyState,error:v.error?.message,network:v.networkState,src:v.currentSrc}))}))); throw error; }
    assert(await video.evaluate(v => v.muted && v.loop && v.playsInline && !v.controls && v.disablePictureInPicture && v.disableRemotePlayback));
    assert.equal(await video.getAttribute('controlslist'), 'nodownload nofullscreen noremoteplayback');
    assert.equal(await video.evaluate(v => getComputedStyle(v).pointerEvents), 'none', 'video must take no pointer input');
    // Hover and tap never reveal controls, and a right-click lands on the page, not on a media menu.
    const box = await page.locator('.equipment-schematic-display').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert(await video.evaluate(v => !v.paused && !v.controls), 'tap must not pause or show controls');
    assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y).tagName, [box.x + box.width / 2, box.y + box.height / 2]), 'IMG', 'pointer must hit the poster layer, never the video');
    // Dossier (board 3): the record beside the schematic on wide screens, under it on phones; the module sits alone in
    // its figure with the caption under it; label and value colours differ in the fields table.
    const record = await page.locator('.dossier-record').boundingBox(), figure = await page.locator('.dossier-figure').boundingBox();
    if (width >= 1000) assert(record.x >= box.x + box.width && Math.abs(record.y - figure.y) < 1.01, 'record beside the schematic: ' + JSON.stringify({ record, box }));
    else assert(record.y >= figure.y + figure.height, 'phone: record under the schematic');
    assert.equal(await page.locator('.dossier-figure .equipment-panel').count(), 0, 'no attached panel in the dossier');
    assert(await page.locator('.dossier-figure figcaption').evaluate((el, top) => el.getBoundingClientRect().top >= top, box.y + box.height - 0.5), 'caption under the schematic');
    assert.deepEqual(await page.locator('.dossier-fields th').allInnerTexts(), ['CATEGORY', 'CAPACITY', 'MANUFACTURER'], 'spec labels in capitals (25b)');
    const palette = await page.evaluate(() => ({ label: getComputedStyle(document.querySelector('.dossier-fields th')).color, value: getComputedStyle(document.querySelector('.dossier-fields td')).color }));
    assert.notEqual(palette.label, palette.value);
    assert.equal(await page.locator('.dossier-name').textContent(), 'Scanner');
    assert.equal(await page.locator('.dossier-file').textContent(), 'Scanner.EQP · FX-001');
    assert.equal(await page.locator('button, [controls]').filter({ hasText: /play|pause/i }).count(), 0, 'no play/pause button');
    assert.equal(await video.evaluate(v => getComputedStyle(v).objectFit), 'contain');
    assert.deepEqual(await page.locator('.content-gallery figcaption').allTextContents(), ['First', 'Second']);
    // EQUIPMENT CARRIED (board 3): one small linked card per assignment with its file, designation and quantity.
    assert.equal(await page.locator('.dossier-card').getAttribute('href'), '/projects/fixture/equipment/scanner');
    assert.equal(await page.locator('.dossier-card .dossier-card-line').textContent(), 'Scanner.EQP · Personal scanner · ×2');
    assert.equal(await page.locator('.dossier-card .dossier-card-note').textContent(), 'Assignment note');
    assert.equal(await page.locator('.dossier-card img').getAttribute('src'), '/poster.svg');
    assert.equal(await page.locator('.dossier-card video').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForFunction(() => document.querySelector('video').paused);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('video').paused);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.goto(base + '/?mode=failure');
    await page.waitForFunction(() => !document.querySelector('video'));
    assert.equal(await page.locator('.equipment-schematic-display img').count(), 1);
    await page.goto(base + '/?mode=failure-no-poster');
    await page.waitForFunction(() => !document.querySelector('.equipment-schematic-display'));
    for (const mode of ['disabled', 'missing']) {
      await page.goto(base + '/?mode=' + mode); await page.waitForTimeout(150);
      assert.equal(await page.locator('video').count(), 0);
      assert.equal(await page.locator('.content-gallery figure').count(), 2);
    }
    await page.goto(base + '/?mode=empty');
    assert.equal(await page.getByRole('region', { name: 'Equipment carried', exact: true }).count(), 0);
    // Wide frames: the player follows the media ratio.
    await page.goto(base + '/?mode=wide');
    await page.waitForSelector('.equipment-schematic-display');
    const wide = await page.locator('.equipment-schematic-display').boundingBox();
    assert(Math.abs(wide.width / wide.height - 2) < 0.02, 'wide ratio ' + wide.width / wide.height);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // A vertical weapon (poster ratio 1:2) gets a tall frame instead of a tiny 2:1 strip.
    await page.goto(base + '/?mode=tall');
    await page.waitForSelector('.equipment-schematic-display');
    const tall = await page.locator('.equipment-schematic-display').boundingBox();
    assert(Math.abs(tall.width / tall.height - 0.5) < 0.02 && tall.height > 300, 'tall frame ' + JSON.stringify(tall));
    // The module's attached specs panel, while the component still supports it (no page uses it since batch 25).
    await page.goto(base + '/?mode=panel');
    await page.waitForSelector('.equipment-panel');
    const panelVideo = await page.locator('.equipment-schematic-display').boundingBox(), panel = await page.locator('.equipment-panel').boundingBox();
    assert(Math.abs(panel.y - (panelVideo.y + panelVideo.height)) < 1.01 && Math.abs(panel.width - panelVideo.width) < 1.01, 'attached panel touches the video');
    await page.goto(base);
    await page.waitForSelector('.equipment-schematic-display');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, `${width}.png`), fullPage: true });
    await page.close();
    // Reduced motion, save-data and blocked autoplay all leave the poster still: no video, no play button.
    const stills = {
      'reduced motion': async p => p.emulateMedia({ reducedMotion: 'reduce' }),
      'save-data': async p => p.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) })),
      'autoplay blocked': async p => p.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError')); }),
    };
    for (const [name, setup] of Object.entries(stills)) {
      const still = await browser.newPage({ viewport: { width, height: 900 } });
      await setup(still);
      await still.goto(base);
      if (name === 'autoplay blocked') await still.waitForFunction(() => !document.querySelector('video'));
      await still.waitForTimeout(300);
      assert.equal(await still.locator('video').count(), 0, name + ': video must not be shown');
      assert.equal(await still.locator('.equipment-schematic-display img').count(), 1, name + ': poster still shown');
      assert.equal(await still.locator('button').count(), 0, name + ': no play button');
      assert.equal(await still.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await still.close();
    }
    console.log(`PASS ${width}px: no-controls MP4 loop, hover/tap inert, dossier record beside/under the schematic, wide and tall ratios, attached panel, offscreen/visibility pause/resume, failure/poster/empty fallback, artwork order, cards/links, empty assignments, poster still for reduced-motion/save-data/blocked autoplay.`);
  }
} finally { await browser.close(); server.close(); }
