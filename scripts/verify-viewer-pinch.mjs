// Component browser checks without CMS initialization, schema push, or migrations.
// PLAYWRIGHT_MODULE may point at an existing Playwright installation.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('test-results/window-pass');
await mkdir(output, { recursive: true });
const routing = `import React, {useSyncExternalStore} from 'react';
const subscribe = fn => {addEventListener('popstate', fn); return () => removeEventListener('popstate', fn)};
export function usePathname() {return useSyncExternalStore(subscribe, () => location.pathname)}
export default function Link({href, children, onClick, prefetch, ...props}) {return <a {...props} href={href} onClick={e => {onClick?.(e); if (!e.defaultPrevented) {e.preventDefault(); history.pushState({}, '', href); dispatchEvent(new PopStateEvent('popstate'));}}}>{children}</a>}`;
await build({ bundle: true, write: false, outfile: 'bundle.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {usePathname} from 'next/navigation';
import {SoundProvider} from './components/SoundProvider';
import {WindowManagerProvider, PublicWindowWorkspace, WindowLauncher} from './components/WindowManager';
import RouteApplication from './components/RouteApplication';
import PixelMonitorDesktop from './components/PixelMonitorDesktop';
import {PatreonAccessProvider, AccessDeniedWindow} from './components/PatreonAccess';
import StartupSequence from './components/StartupSequence';
import DesktopFile from './components/DesktopFile';
import {CharacterViewerLink} from './components/CharacterViewerLink';
import {EquipmentViewerLink} from './components/EquipmentViewerLink';
import ArtViewer from './components/ArtViewer'; import ComicReader from './components/ComicReader';
const image = {src:'/art.svg', alt:'Authorized test drawing', width:200, height:200};
const project={slug:'blushland',title:'BLUSHLAND'};
function App() {const pathname=usePathname();return <PatreonAccessProvider viewer={{signedIn:false,activePatron:false,verification:'unavailable',tierIDs:[]}} enabled={false}><SoundProvider><WindowManagerProvider><StartupSequence>
<WindowLauncher id="system">SYSTEM</WindowLauncher>
{pathname.startsWith('/comics/') ? <ComicReader project={project} chapter={{slug:'one',title:'Chapter one',description:'',pages:[image,image]}}/> : <RouteApplication id="project" title="PROJECT: BLUSHLAND" navigation={[{label:'OVERVIEW',href:'/projects/blushland'},{label:'FACTIONS',href:'/projects/blushland/factions'}]}>
<h1>{pathname.endsWith('factions') ? 'FACTIONS' : 'BLUSHLAND'}</h1>
<div className="desktop-file-list">
<DesktopFile label="Faction" type="DIR" href="/projects/blushland/factions/test" imagePreview thumbnail={image}/>
<CharacterViewerLink project={project} character={{slug:'observer',name:'Observer',role:'Scout',description:'',images:[image]}}/>
<EquipmentViewerLink project={project} equipment={{slug:'radio',name:'Radio',category:'Comms',description:'',images:[image],updated:'2026-09-30'}}/>
</div><a href="/comics/blushland/one">Comic</a></RouteApplication>}
<PublicWindowWorkspace/><PixelMonitorDesktop/><ArtViewer/><AccessDeniedWindow/>
</StartupSequence></WindowManagerProvider></SoundProvider></PatreonAccessProvider>}
createRoot(document.getElementById('root')).render(<App/>);` },
  plugins: [{ name: 'test-routing', setup(b) {
    b.onResolve({ filter: /^next\/(link|navigation)$/ }, () => ({ path: 'router', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: routing, loader: 'jsx', resolveDir: process.cwd() }));
  } }],
}).then(result => writeFile(path.join(output, 'bundle.js'), result.outputFiles[0].contents));
const css = await readFile('app/(frontend)/globals.css');
const server = createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(path.join(output, 'bundle.js'))); }
  else if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
  else if (req.url === '/art.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="coral"/><circle cx="100" cy="100" r="60" fill="navy"/></svg>'); }
  else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/style.css"/></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: 'chrome' }) });

try {
 for (const width of [1440,390]) {
 const page=await browser.newPage({viewport:{width,height:1000},hasTouch:true});
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/projects/blushland');
 await page.locator('[data-phase="announcement"]').waitFor({timeout:15000});
 await page.keyboard.press('Enter');
 await page.locator('.artwork-file a').first().click();
 for (const reader of [false,true]) {
 if(reader) {await page.getByRole('button',{name:'Close ART VIEWER',exact:true}).click();await page.goto(base+'/comics/blushland/one');}
 const canvas=page.locator(reader ? '.comic-page-stage .art-viewer-canvas' : '.art-viewer-window .art-viewer-canvas');
 await canvas.locator('img').waitFor();
 await page.waitForTimeout(300);
 const result=await canvas.evaluate(async el=>{
 const pause=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const toolbar=el.previousElementSibling;
 const output=()=>Number(toolbar.querySelector('output').dataset.scale); // the scale in percent (the reader's readout is in words)
 const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const fire=(type,id,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0}));
 // Synthetic pointer events cannot acquire native capture; emulate capture for this unit of browser input.
 el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;
 toolbar.querySelector('button').click();await pause();const initial=output();
 fire('pointerdown',1,cx-40,cy);fire('pointerdown',2,cx+40,cy);
 fire('pointermove',1,cx-80,cy);fire('pointermove',2,cx+80,cy);await pause();
 const pinch=output();
 fire('pointerup',2,cx+80,cy);fire('pointermove',1,cx-70,cy+10);await pause();
 const released=output();fire('pointercancel',1,cx-70,cy+10);
 const wheel=new WheelEvent('wheel',{ctrlKey:true,deltaY:20,clientX:cx,clientY:cy,bubbles:true,cancelable:true});el.dispatchEvent(wheel);await pause();
 const trackpad=output();
 const ordinary=new WheelEvent('wheel',{deltaY:20,bubbles:true,cancelable:true});el.dispatchEvent(ordinary);await pause();
 const scroll=output();
 const gesture=(type,scale)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{scale,clientX:cx,clientY:cy});el.dispatchEvent(e);return e.defaultPrevented};
 gesture('gesturestart',1);gesture('gesturechange',0.9);gesture('gestureend',1.1);await pause();
 const safari=output();
 toolbar.querySelector('button').click();await pause();
 return {initial,pinch,released,trackpad,scroll,safari,reset:output(),prevented:wheel.defaultPrevented,ordinaryPrevented:ordinary.defaultPrevented,touchAction:getComputedStyle(el).touchAction};
 });
 console.log(result);assert(result.pinch>result.initial);assert.equal(result.pinch,result.released);assert(result.trackpad<result.pinch);assert.equal(result.scroll,result.trackpad);assert(result.safari<result.scroll);assert.equal(result.reset,result.initial);assert(result.prevented);if(!reader)assert(!result.ordinaryPrevented); // the reader's plain wheel scrolls a zoomed page (batch 8)
assert.equal(result.touchAction,'none');
 console.log(JSON.stringify({width,reader,...result}));
 if(reader) {await page.locator('.comic-reader-window').getByRole('button',{name:'Zoom in',exact:true}).evaluate(el=>el.click());await page.getByRole('button',{name:'NEXT',exact:true}).evaluate(el=>el.click());await page.waitForTimeout(150);assert.match(await page.locator('.comic-reader-window .reader-toolbar output').textContent(),/^FIT (HEIGHT|WIDTH)$/,'a new page starts fitted again');}
 }
 await page.close();
 }
} finally {await browser.close();server.close();}






