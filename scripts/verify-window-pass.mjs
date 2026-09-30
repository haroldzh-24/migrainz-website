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
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${base}/projects/blushland`);
  await page.locator('[data-phase="announcement"]').waitFor({ timeout: 15000 });
  const bounds = await page.locator('.startup-window').boundingBox();
  assert(Math.abs(bounds.x + bounds.width / 2 - 720) < 2 && Math.abs(bounds.y + bounds.height / 2 - 500) < 2);
  await page.getByRole('button', { name: 'ENTER', exact: true }).click(); results.push('Boot → centered announcement → Enter dismissal');
  const app = page.getByRole('region', { name: 'PROJECT: BLUSHLAND window' });
  assert.equal(await app.getAttribute('data-maximized'), 'true');
  await page.getByRole('link', { name: 'FACTIONS', exact: true }).click();
  assert(page.url().endsWith('/factions')); assert.equal(await app.count(), 1);
  await page.goBack(); assert(page.url().endsWith('/blushland'));
  await page.goForward(); assert(page.url().endsWith('/factions'));
  results.push('Maximized project; subsection navigation and browser history preserve one window (routing shim)');
  const preview = page.locator('.faction-file .directory-thumbnail');
  await page.locator('.faction-file a').focus();
  await page.waitForTimeout(160); assert.equal(await preview.evaluate(el => getComputedStyle(el).opacity), '1');
  await page.locator('.project-app-nav a').first().focus();
  await page.locator('.faction-file').hover(); await page.waitForTimeout(160);
  assert.equal(await preview.evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await page.locator('.artwork-file img').count(), 2);
  assert(await page.locator('.artwork-file img').first().evaluate(el => el.naturalWidth > 0));
  results.push('Faction hover/focus preview; character/equipment drawings');
  await page.getByRole('button', { name: 'Minimize PROJECT: BLUSHLAND', exact: true }).click();
  const tab = page.locator('.public-window-dock').getByRole('button', { name: 'Restore PROJECT: BLUSHLAND', exact: true });
  assert.equal(await tab.count(), 1); await tab.click(); await tab.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Close PROJECT: BLUSHLAND', exact: true }).click();
  await app.waitFor({ state: 'detached' }); assert.equal(await tab.count(), 0); await page.getByRole('button', { name: 'OPEN PROJECT: BLUSHLAND' }).click();
  results.push('Minimize/restore/close tabs and reopen');
  await page.locator('.artwork-file a').first().click();
  await page.getByRole('region', { name: 'ART VIEWER window' }).waitFor();
  await page.getByRole('button', { name: 'Close ART VIEWER', exact: true }).click(); results.push('Existing ART VIEWER opens');
  await page.getByRole('button', { name: 'Minimize PROJECT: BLUSHLAND', exact: true }).click();
  await page.getByRole('button', { name: 'SYSTEM', exact: true }).click();
  assert.equal(await page.locator('.system-apps a').count(), 6);
  await page.getByRole('link', { name: 'Launch PERSONNEL' }).click();
  assert(page.url().endsWith('/projects?directory=characters'));
  assert.equal(await page.locator('#pixel-monitor').isVisible(), false); results.push('SYSTEM launch exits monitor to real directory URL');
  await page.goto(`${base}/comics/blushland/one`);
  await page.getByRole('region', { name: 'COMIC READER window' }).waitFor(); results.push('Existing COMIC READER mounts');
  // The existing ART VIEWER deliberately restores saved tabs on a full reload.
  await page.evaluate(() => sessionStorage.removeItem('migrainz-art-viewer-tabs-v2'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/projects/blushland/factions`);
  await app.waitFor();
  assert(await preview.isVisible());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Minimize PROJECT: BLUSHLAND', exact: true }).click();
  assert((await tab.boundingBox()).height >= 44); await tab.click();
  await page.screenshot({ path: path.join(output, 'mobile.png') });
  results.push('Mobile direct entry, visible thumbnails, no page overflow, touch restore tab');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await preview.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.deepEqual(errors, []); results.push('Reduced motion; no browser runtime errors');
  await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(results.join('\n'));
} finally { await browser.close(); server.close(); }
