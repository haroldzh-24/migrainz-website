import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(process.env.PLAYWRIGHT_MODULE)
  : require(require.resolve('playwright', {
      paths: process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry)),
    }));
await mkdir('test-results', { recursive: true });
const root = process.cwd();
const bundle = await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import Watcher from './components/Watcher'; createRoot(document.getElementById('root')).render(<main className="shell"><section className="hero panel-grid"><div className="hero-copy"><h1>MIGRAINZ<br/>ARCHIVE &amp;<br/>PROJECTS</h1></div><Watcher/></section><div style={{height:1500}}>Scroll area</div></main>);`,resolveDir:root,loader:'tsx'},plugins:[{name:'render-count',setup(b){b.onLoad({filter:/Watcher\.tsx$/},async(args)=>({contents:(await readFile(args.path,'utf8')).replace('export default function Watcher() {','export default function Watcher() { window.__renders = (window.__renders || 0) + 1;'),loader:'tsx'}))}}],bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const server = createServer(async(req,res)=>{try {
 const url = new URL(req.url,'http://localhost').pathname;
 if(url === '/') {res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html data-crt="${process.env.CRT || 'on'}" data-phosphor="green"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>`);}
 else if(url === '/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}
 else {const file=url === '/style.css'?path.join(root,'app/(frontend)/globals.css'):path.join(root,'public',url);res.setHeader('Content-Type',url.endsWith('.png')?'image/png':url.endsWith('.webp')?'image/webp':url.endsWith('.svg')?'image/svg+xml':'text/css');res.end(await readFile(file));}
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
const results=[];
// CRT=on|reduced|off sets <html data-crt> (default on, as the site defaults). 'jitter' forces the Watcher jitter every 250ms while idle.
for(const variant of ['full','no-eyes','no-clip','no-3d','no-static','idle','idle-sweep','jitter','offscreen']) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForTimeout(400);
 const css={'no-eyes':'.watcher-eyes {transform:none!important}', 'no-clip':'.watcher svg g {clip-path:none!important}', 'no-3d':'.watcher-art, .watcher > svg {transform:none!important}', 'no-static':'.watcher-static{display:none!important}', 'idle-sweep':'.watcher-interference{animation-delay:-11s}'}[variant];
 if(css)await page.addStyleTag({content:css});
 if(variant==='offscreen'){await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(500);}
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
 const before=await metrics();
 const trace=[];cdp.on('Tracing.dataCollected',e=>trace.push(...e.value));
 await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReportEvents'});
 const samples=await page.evaluate(async({active,jitter})=>{
  const el=document.querySelector('#watcher'),r=el.getBoundingClientRect();window.__renders=0;let events=0;const gaps=[];let last=performance.now(),run=true;
  const jitterEl=document.querySelector('.watcher-jitter');let jitters=0;
  const jitterTimer=jitter&&jitterEl?setInterval(()=>{jitters++;jitterEl.dataset.jitter=jitters%2?'left':'right';setTimeout(()=>{delete jitterEl.dataset.jitter;},90);},250):null;
  const frame=(now)=>{gaps.push(now-last);last=now;if(run)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  const timer=active?setInterval(()=>{events++;el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:r.left+r.width*(.5+.45*Math.sin(events*.08)),clientY:r.top+r.height*(.5+.4*Math.cos(events*.06))}));},8):null;
  await new Promise(r=>setTimeout(r,2500));run=false;clearInterval(timer);clearInterval(jitterTimer);gaps.sort((a,b)=>a-b);
  return {events,jitters,renders:window.__renders,frames:gaps.length,p95ms:gaps[Math.floor(gaps.length*.95)],over25ms:gaps.filter(x=>x>25).length};
 },{active:!variant.startsWith('idle')&&variant!=='jitter'&&variant!=='offscreen',jitter:variant==='jitter'});
 await cdp.send('Tracing.end');await new Promise(r=>cdp.once('Tracing.tracingComplete',r));
 const after=await metrics(),cost={};for(const k of ['ScriptDuration','TaskDuration','RecalcStyleDuration','LayoutDuration'])cost[k+'Ms']=+(1000*(after[k]-before[k])).toFixed(2);
 for(const name of ['Paint','PrePaint','UpdateLayoutTree','RasterTask']){const entries=trace.filter(e=>e.name===name&&e.ph==='X');cost[name+'Count']=entries.length;cost[name+'Ms']=+(entries.reduce((s,e)=>s+(e.dur||0),0)/1000).toFixed(2);}
 results.push({variant,...samples,...cost});await page.close();
}
await writeFile(`test-results/watcher-profile-${process.argv[2]||'run'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
} finally {await browser.close();server.close();}
