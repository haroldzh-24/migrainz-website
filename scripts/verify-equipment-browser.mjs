// Actual components with a minimal router shim, independent of CMS/editor data.
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
const mode=new URLSearchParams(location.search).get('mode')||'valid';
const images=[{src:'/poster.svg',alt:'First concept',caption:'First'},{src:'/poster.svg',alt:'Second concept',caption:'Second'}];
createRoot(document.getElementById('root')).render(<main>
<h1>Equipment fixture</h1>
{mode!=='disabled'&&<EquipmentSchematic name="Scanner" ratio={mode==='wide'?2:undefined} src={mode==='missing'?undefined:mode==='failure'||mode==='failure-no-poster'?'/broken.mp4':'/clip.mp4'} poster={mode==='failure-no-poster'?undefined:mode==='wide'?'/poster-wide.svg':'/poster.svg'}>
  <p className="eyebrow">Sensor / UPDATED 2026-10-21</p><EquipmentSpecifications rows={[{label:'Capacity',value:'2 cells'},{label:'Manufacturer',value:'Acme'}]}/></EquipmentSchematic>}
<ContentGallery images={images}/>
<EquipmentCards projectSlug="fixture" equipment={mode==='empty'?[]:[{name:'Scanner',slug:'scanner',category:'Sensor',designation:'Personal scanner',quantity:2,notes:'Assignment note',images,specifications:[{label:'Capacity',value:'2 cells'}]}]}/>
<div style={{height:'2000px'}}>Scroll space</div></main>);` },
  plugins: [{ name: 'router', setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export default function Link({children,...props}) {return <a {...props}>{children}</a>}', loader: 'jsx', resolveDir: process.cwd() }));
  } }],
});
await writeFile(path.join(output, 'bundle.js'), bundle.outputFiles[0].contents);
let clip;
const server = createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile('app/(frontend)/globals.css')); }
  if (req.url === '/poster.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#193"/></svg>'); }
  if (req.url === '/poster-wide.svg') { res.setHeader('Content-Type', 'image/svg+xml'); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#193"/></svg>'); }
  if (req.url === '/clip.mp4' && clip) { res.setHeader('Content-Type', 'video/mp4'); return res.end(clip); }
  if (req.url.endsWith('.mp4')) { res.statusCode = 404; return res.end(); }
  res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
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
    // The specs panel is attached directly under the video: no gap, same width, same background.
    const panel = await page.locator('.equipment-panel').boundingBox();
    assert(Math.abs(panel.y - (box.y + box.height)) < 1.01, 'panel must touch the video: ' + (panel.y - box.y - box.height));
    assert(Math.abs(panel.width - box.width) < 1.01);
    assert.equal(await page.locator('.equipment-panel').evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('.equipment-schematic-display').evaluate(el => getComputedStyle(el).backgroundColor));
    const palette = await page.evaluate(() => ({ label: getComputedStyle(document.querySelector('.equipment-panel dt')).color, value: getComputedStyle(document.querySelector('.equipment-panel dd')).color, font: getComputedStyle(document.querySelector('.equipment-panel dd')).fontFamily }));
    assert.notEqual(palette.label, palette.value); assert.match(palette.font, /monospace|Courier/i);
    assert.equal(await page.locator('button, [controls]').filter({ hasText: /play|pause/i }).count(), 0, 'no play/pause button');
    assert.equal(await video.evaluate(v => getComputedStyle(v).objectFit), 'contain');
    assert.deepEqual(await page.locator('.content-gallery figcaption').allTextContents(), ['First', 'Second']);
    assert.equal(await page.locator('.equipment-card a').getAttribute('href'), '/projects/fixture/equipment/scanner');
    assert.equal(await page.locator('.equipment-card video').count(), 0);
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
    assert.equal(await page.getByRole('region', { name: 'Character equipment', exact: true }).count(), 0);
    // Wide frames: the player follows the media ratio.
    await page.goto(base + '/?mode=wide');
    await page.waitForSelector('.equipment-schematic-display');
    const wide = await page.locator('.equipment-schematic-display').boundingBox();
    assert(Math.abs(wide.width / wide.height - 2) < 0.02, 'wide ratio ' + wide.width / wide.height);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
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
    console.log(`PASS ${width}px: no-controls MP4 loop, hover/tap inert, attached specs panel, wide ratio, offscreen/visibility pause/resume, failure/poster/empty fallback, artwork order, cards/links, empty assignments, poster still for reduced-motion/save-data/blocked autoplay.`);
  }
} finally { await browser.close(); server.close(); }
