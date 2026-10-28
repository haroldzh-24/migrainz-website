// Site health check against a running seeded fixture (npm run test:regression starts one; so does
// node scripts/serve-fixture.mjs). Never point it at production: BASE_URL must be a local address, the script's own
// requests go only to that origin (redirects elsewhere are refused and reported), and Chrome runs with every other host
// unresolvable and other origins blocked (any attempt is reported).
//   BASE_URL=http://127.0.0.1:<port> node scripts/verify-site-health.mjs [--write-baseline | --self-test]
// Playwright and axe-core come from the `npm exec --package=...` folders on PATH (see package.json "test:regression");
// PLAYWRIGHT_MODULE / AXE_MODULE override that, BROWSER_PATH overrides the Chrome path.
//
// 1. Discovers pages by following links in the browser at 1366x768 (project windows render their links after
//    hydration), from the main pages; every internal link must load with 200, media links must answer a Range GET with
//    200/206, and every required route template must be reached.
// 2. Visits up to two pages per route template again at 390x844 (touch), plus the first-visit announcement at both
//    widths. Each visit: no page or console errors, no failed same-origin requests, no requests to other origins, no
//    sideways scroll, a page-specific <title>, no classified fixture titles in the page or in its JSON/RSC responses
//    fetched by the page (case-insensitive; in `next dev` there are no link prefetches, so this is mostly the page's own
//    data), and (on the template pages)
//    no axe-core violations (WCAG 2.0/2.1/2.2 A and AA plus best practice). Reduced motion, CRT mode and the dismissed
//    popups are fixed so blinking cursors, flicker and timed windows cannot change the result between runs.
// 3. Missing records must return 404.
// 4. The homepage has a working favicon, robots.txt rules and link-preview (Open Graph / Twitter) tags.
// Known findings are listed in scripts/site-health-baseline.json, keyed by rule, route template and element, each with
// a reason naming the roadmap item that removes it. Anything outside it fails, a baseline entry that no longer occurs
// fails ("stale"), and an entry without a "Roadmap" reason fails, so nothing is accepted silently.
// --write-baseline rewrites the baseline from this run (keeps existing reasons; new ones get a placeholder that fails
// until a reason is written); review the diff before committing.
// --self-test plants one of each problem (broken link, wrong 404, accessibility violation, one on a bare element, stale
// baseline entry, entry without a reason, third-party request, off-site redirect hop in the browser, classified text in
// the page and in a JSON response, console error, sideways scroll, generic title, failed request with and without a
// response, off-site redirect for the script's own requests) and passes only if every one is reported (run by
// test:regression, so the checker itself is tested).
// Writes test-results/site-health/report.json and screenshots of each template at both widths.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const base = process.env.BASE_URL || process.argv.find(arg => arg.startsWith('http'));
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) {
  console.error('Set BASE_URL to the local fixture server, e.g. http://127.0.0.1:3100');
  process.exit(1);
}
const origin = new URL(base).origin;
const writeBaseline = process.argv.includes('--write-baseline');
const selfTest = process.argv.includes('--self-test');
const require = createRequire(import.meta.url);
const searchPaths = process.env.PATH.split(path.delimiter).map(entry => path.dirname(entry));
const playwright = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require(require.resolve('playwright', { paths: searchPaths }));
const AXE_VERSION = '4.14.0'; // keep in step with package.json "test:regression" and scripts/check-all.mjs
const axeSource = readFileSync(process.env.AXE_MODULE || require.resolve('axe-core/axe.min.js', { paths: searchPaths }), 'utf8');
const baselineFile = path.resolve('scripts/site-health-baseline.json');
const savedBaseline = existsSync(baselineFile) ? JSON.parse(readFileSync(baselineFile, 'utf8')) : {};
const out = path.resolve('test-results', selfTest ? 'site-health-self-test' : 'site-health');
mkdirSync(out, { recursive: true });

// Fixture-specific: data/projects.ts seeds BLUSHLAND (with The Observer), STALKER and MISC WORKS;
// seed-desktop-fixture.ts adds equipment, factions and classified sentinel records.
const SEEDS = ['/', '/projects', '/comics', '/archive', '/tracker', '/about', '/patreon'];
const REQUIRED_TEMPLATES = ['/', '/projects', '/projects/:slug', '/projects/:slug/characters', '/projects/:slug/characters/:item',
  '/projects/:slug/equipment', '/projects/:slug/equipment/:item', '/projects/:slug/factions', '/projects/:slug/factions/:item',
  '/comics', '/comics/:comic/:chapter', '/archive', '/tracker', '/about', '/patreon'];
const MIN_PAGES = 20;
const MAX_PAGES = 300;
const NOT_FOUND = [
  '/no-such-page',
  '/comics/no-such-comic/no-such-chapter',
  '/projects/no-such-project',
  '/projects/no-such-project/characters',
  '/projects/blushland/characters/no-such-character',
  '/projects/blushland/equipment/no-such-item',
  '/projects/blushland/factions/no-such-faction',
  '/projects/stalker/characters/the-observer',
];
// Titles of REDACTED fixture records: they must never reach any page (scripts/seed-desktop-fixture.ts).
const SENTINELS = ['SENTINEL-PHASE-TITLE-7Q', 'SENTINEL-CHAPTER-TITLE-7Q', 'sentinel-chapter-7q'];
const SKIP = /^\/(admin|api|auth|_next)(\/|$)/;
const MEDIA = /^\/api\/media\/file\//;
const ANNOUNCEMENT_KEY = 'migrainz-announcement:studio-transmission-001';
const WIDTHS = [{ name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true }, { name: 'desktop', width: 1366, height: 768 }];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const seeds = selfTest ? ['/', '/projects', '/self-test-broken-link'] : SEEDS;
const notFound = selfTest ? ['/projects'] : NOT_FOUND;
// The self-test baseline: one entry that never occurs (stale) and one real planted finding with no roadmap reason.
const baseline = selfTest ? { axe: { 'self-test-stale / never-present': 'planted by --self-test' }, failedRequests: { '/self-test-missing-2.png': 'planted, no reason' } } : savedBaseline;
const KINDS = ['softNotFound', 'failedRequests', 'externalRequests', 'genericTitle', 'externalPlaceholder', 'axe'];

const failures = [];
const findings = { softNotFound: new Set(), failedRequests: new Set(), externalRequests: new Set(), genericTitle: new Set(), externalPlaceholder: new Set(), axe: new Map() };
const fail = message => { failures.push(message); console.log('FAIL ' + message); };

// Route template: /projects/blushland/equipment/fixture-scanner -> /projects/:slug/equipment/:item
const template = pathname => {
  const parts = pathname.split('?')[0].split('/').filter(Boolean);
  if (parts[0] === 'projects' && parts.length >= 2) { parts[1] = ':slug'; if (parts.length >= 4) parts[3] = ':item'; }
  if (parts[0] === 'comics' && parts.length >= 3) { parts[1] = ':comic'; parts[2] = ':chapter'; }
  return '/' + parts.join('/');
};
// Key for an axe node: rule, route template and the element itself, built in the page from the live element (tag, id,
// sorted classes, first word of its aria-label; for an element with none of those, its first words of text). axe's
// CSS selectors depend on what else is on the page, so they are not used. "Close PROJECT: BLUSHLAND" and "Close COMIC
// READER" match, but only on the template where the finding was seen.
const axeKey = (rule, routeTemplate, element) => `${rule} ${routeTemplate} ${element}`;
const internalPath = (href, from) => {
  try {
    const url = new URL(href.replace(/&amp;/g, '&'), base + from);
    if (url.origin !== origin) return /^https?:$/.test(url.protocol) ? { external: url.href } : {};
    return { path: url.pathname + url.search };
  } catch { return {}; }
};

const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--no-proxy-server', `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE ${new URL(base).hostname}`] });
try {
  const api = await browser.newContext();
  // Redirects are followed by hand so a same-origin URL can never lead the script to another site.
  const makeGet = allowed => async (p, headers) => {
    let url = new URL(p, allowed);
    for (let hops = 0; ; hops++) {
      if (url.origin !== allowed) throw new Error(`refusing to request ${url.origin}`);
      const response = await api.request.get(url.href, { headers, timeout: 90000, maxRedirects: 0 });
      const location = response.headers().location;
      if (response.status() < 300 || response.status() >= 400 || !location) return response;
      const next = new URL(location, url);
      if (next.origin !== allowed) { fail(`${p} redirects to another site (${next.origin})`); return response; }
      if (hops >= 5) { fail(`${p} redirects more than 5 times`); return response; }
      url = next;
    }
  };
  const get = makeGet(origin);
  if (selfTest) {
    // The redirect guard, tested against a throwaway local server: one same-site hop is followed, an off-site one refused.
    const server = createServer((req, res) => {
      if (req.url === '/off-site') { res.writeHead(302, { location: 'https://example.org/x' }); res.end(); }
      else if (req.url === '/hop') { res.writeHead(302, { location: '/ok' }); res.end(); }
      else { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); }
    });
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    const local = makeGet(`http://127.0.0.1:${server.address().port}`);
    if ((await local('/hop')).status() !== 200) fail('self-test: a same-site redirect was not followed');
    await local('/off-site');
    server.close();
  }

  const status = new Map(); // path -> { status, from }
  const external = new Map(); // url -> first page linking to it
  const queue = seeds.map(p => ({ path: p, from: '(start)' }));
  const queued = new Set(seeds);
  const addLinks = async (hrefs, from) => {
    for (const href of hrefs) {
      if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue;
      const link = internalPath(href, from);
      if (link.external) { if (!external.has(link.external)) external.set(link.external, from); continue; }
      if (!link.path) continue;
      if (MEDIA.test(link.path)) {
        if (status.has(link.path)) continue;
        const response = await get(link.path, { Range: 'bytes=0-0' });
        status.set(link.path, { status: response.status(), from });
        if (![200, 206].includes(response.status())) fail(`media link ${link.path} returned ${response.status()} (linked from ${from})`);
        continue;
      }
      if (selfTest || SKIP.test(link.path) || queued.has(link.path)) continue;
      queued.add(link.path);
      queue.push({ path: link.path, from });
    }
  };
  const homeTitle = (await (await get('/')).text()).match(/<title>([^<]*)<\/title>/)?.[1] ?? '';

  const contexts = {};
  const contextFor = async (size, firstVisit) => {
    const key = size.name + (firstVisit ? '-first' : '');
    if (contexts[key]) return contexts[key];
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: size.isMobile, hasTouch: size.hasTouch, reducedMotion: 'reduce' });
    // Same state on every run: CRT on, green, shop ad already seen; the announcement dismissed except on first visits.
    await context.addInitScript(([key, dismiss]) => {
      try {
        localStorage.setItem('crt-effects', 'on');
        localStorage.setItem('crt-phosphor', 'green');
        sessionStorage.setItem('migrainz-shop-promo-seen', '1');
        if (dismiss) sessionStorage.setItem(key, key.split(':')[1]);
      } catch {}
    }, [ANNOUNCEMENT_KEY, !firstVisit]);
    if (selfTest) await context.addInitScript(() => addEventListener('load', () => setTimeout(() => {
      if (location.pathname !== '/') return;
      const plant = html => document.body.insertAdjacentHTML('beforeend', html);
      plant('<button class="self-test-nameless"></button>');
      plant('<section style="background:#fff"><h2 style="color:#fefefe">Bare self-test heading</h2></section>');
      plant('<img alt="" src="https://example.org/self-test.png"><img alt="" src="/self-test-missing.png"><img alt="" src="/self-test-missing-2.png">');
      plant('<img alt="" src="/self-test-redirect.png"><img alt="" src="/self-test-abort.png">');
      plant('<p hidden>sentinel-phase-title-7q</p><div style="width:4000px;height:1px"></div>');
      fetch('/self-test-data.json').catch(() => {});
      console.error('self-test console error');
    }, 0)));
    // A JSON response carrying classified text, as data fetched after hydration would.
    if (selfTest) await context.route(url => url.pathname === '/self-test-data.json', route => route.fulfill({ contentType: 'application/json', body: '{"t":"Sentinel-Chapter-Title-7q"}' }));
    // A same-origin URL that redirects off-site (the browser follows the hop), and a request that fails without a response.
    if (selfTest) await context.route(url => url.pathname === '/self-test-redirect.png', route => route.fulfill({ status: 302, headers: { location: 'https://example.net/self-test.png' } }));
    if (selfTest) await context.route(url => url.pathname === '/self-test-abort.png', route => route.abort('failed'));
    // Tests stay offline and never call third parties; any attempt is recorded as a finding. Chrome is also launched
    // with every host but the local one unresolvable, which covers redirect hops that routing doesn't see.
    await context.route(url => url.origin !== origin && /^https?:$/.test(url.protocol), route => route.abort('blockedbyclient'));
    // Recorded for every page in the context (also redirect hops, popups and the missing-record checks).
    context.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== origin && /^https?:$/.test(url.protocol)) findings.externalRequests.add(url.origin);
    });
    // Same-origin requests that fail without an HTTP response (aborted navigations aside).
    context.on('requestfailed', request => {
      const url = new URL(request.url());
      if (url.origin === origin && !/ERR_ABORTED/.test(request.failure()?.errorText ?? '') && !/hmr/i.test(url.pathname)) findings.failedRequests.add(url.pathname);
    });
    return (contexts[key] = context);
  };

  let visits = 0;
  let axeChecked = false;
  const visit = async (size, p, { firstVisit = false, full = false, label = template(p) } = {}) => {
    const page = await (await contextFor(size, firstVisit)).newPage();
    page.setDefaultTimeout(90000);
    const problems = [];
    page.on('pageerror', error => problems.push('page error: ' + error.message.split('\n')[0]));
    page.on('console', message => {
      if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) problems.push('console error: ' + message.text().split('\n')[0].slice(0, 200));
    });
    const bodies = [];
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin !== origin) return;
      if (response.status() >= 400 && url.pathname + url.search !== p && !/hmr/i.test(url.pathname)) findings.failedRequests.add(url.pathname);
      // Data fetched after hydration (JSON APIs, RSC payloads) is checked for classified text too.
      if (/json|x-component/.test(response.headers()['content-type'] ?? '')) bodies.push(response.text().then(text => [url.pathname, text]).catch(() => [url.pathname, '']));
    });
    try {
      const response = await page.goto(base + p, { waitUntil: 'load' });
      if (!response || response.status() !== 200) { problems.push(`returned ${response?.status()}`); return null; }
      if (firstVisit) await page.getByRole('button', { name: 'ENTER' }).waitFor();
      else await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
      await page.waitForLoadState('networkidle').catch(() => {});
      if (selfTest && p === '/projects') await page.evaluate(title => { document.title = title; }, homeTitle);
      const info = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        title: document.title,
        html: document.documentElement.outerHTML,
        links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
      }));
      if (info.overflow > 0) problems.push(`scrolls sideways by ${info.overflow}px`);
      if (!info.title.trim()) problems.push('empty <title>');
      else if (!firstVisit && p !== '/' && info.title === homeTitle) findings.genericTitle.add(template(p));
      const lower = info.html.toLowerCase();
      for (const sentinel of SENTINELS) if (lower.includes(sentinel.toLowerCase())) problems.push(`classified fixture text "${sentinel}" is in the page`);
      for (const [from, text] of await Promise.all(bodies)) for (const sentinel of SENTINELS)
        if (text.toLowerCase().includes(sentinel.toLowerCase())) problems.push(`classified fixture text "${sentinel}" is in the response from ${from}`);
      if (full) {
        await page.addScriptTag({ content: axeSource });
        if (!axeChecked) {
          const version = await page.evaluate(() => window.axe.version);
          if (version !== AXE_VERSION) throw new Error(`axe-core ${version} loaded; the baseline was made with ${AXE_VERSION}`);
          axeChecked = true;
        }
        const violations = await page.evaluate(async tags => {
          const describe = el => {
            if (!(el instanceof Element)) return 'unknown';
            const classes = [...el.classList].sort().map(c => '.' + c).join('');
            const id = el.id ? '#' + el.id : '';
            const label = el.getAttribute('aria-label') ? `[aria-label=${el.getAttribute('aria-label').trim().split(/\s+/)[0]}]` : '';
            const text = classes || id || label ? '' : `"${(el.textContent ?? '').trim().split(/\s+/).slice(0, 3).join(' ').slice(0, 30)}"`;
            return el.tagName.toLowerCase() + id + classes + label + text;
          };
          const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, elementRef: true });
          return result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map(n => describe(n.element)) }));
        }, AXE_TAGS);
        for (const v of violations) for (const target of v.targets) {
          const key = axeKey(v.id, template(p), target);
          if (!findings.axe.has(key)) findings.axe.set(key, { impact: v.impact, help: v.help, pages: new Set() });
          findings.axe.get(key).pages.add(`${size.width}px ${p}`);
        }
        await page.screenshot({ path: path.join(out, `${size.width}${label.replace(/[/:?=&]+/g, '_').replace(/[^\w.-]/g, '') || '_home'}.png`) });
      }
      visits++;
      return info.links;
    } finally {
      for (const problem of problems) fail(`${size.width}px ${p}: ${problem}`);
      await page.close();
    }
  };

  // 1. Discover at desktop width; the first two pages of each template get the full check.
  const [phone, desktop] = WIDTHS;
  const scanned = new Map(); // template -> paths given the full check
  while (queue.length) {
    const { path: p, from } = queue.shift();
    const t = template(p);
    const list = scanned.get(t) ?? [];
    const full = list.length < 2;
    const links = await visit(desktop, p, { full, label: list.length ? t + '-2' : t });
    status.set(p, { status: links ? 200 : 'error', from });
    if (!links) fail(`link to ${p} is broken (linked from ${from})`);
    if (full && links) scanned.set(t, [...list, p]);
    if (links) await addLinks(links, p);
    if (status.size >= MAX_PAGES) { fail(`crawl stopped at ${MAX_PAGES} pages; is a link generating endless URLs?`); queue.length = 0; }
  }
  // 2. The same template pages at phone width, then pages linked only there, then the first visit at both widths.
  if (!selfTest) {
    for (const [t, list] of scanned) for (const [i, p] of list.entries()) { const links = await visit(phone, p, { full: true, label: i ? t + '-2' : t }); if (links) await addLinks(links, p); }
    while (queue.length) {
      const { path: p, from } = queue.shift();
      const links = await visit(phone, p);
      status.set(p, { status: links ? 200 : 'error', from });
      if (!links) fail(`link to ${p} is broken (linked from ${from}, phone width)`);
    }
    for (const size of WIDTHS) await visit(size, '/', { firstVisit: true, full: true, label: '/first-visit' });
  }
  const pages = [...status].filter(([p, s]) => s.status === 200 && !MEDIA.test(p)).map(([p]) => p);
  if (!selfTest) {
    const missing = REQUIRED_TEMPLATES.filter(t => !scanned.has(t));
    if (missing.length) fail(`crawl never reached ${missing.join(', ')}; links may have broken or moved`);
    if (pages.length < MIN_PAGES) fail(`crawl reached only ${pages.length} pages (expected at least ${MIN_PAGES})`);
  }
  const media = [...status.keys()].filter(p => MEDIA.test(p)).length;
  console.log(`${failures.length ? 'INFO' : 'PASS'} crawl: ${pages.length} pages reachable by links, ${media} media links; ${visits} page loads across ${scanned.size} route templates`);

  // 3. Missing records. A 200 counts as a known "soft 404" only if the browser shows the in-world missing-record
  // page (app/(frontend)/not-found.tsx, h1 "RECORD NOT FOUND"); the HTML text alone can't tell, because every page's
  // RSC payload carries that boundary.
  for (const p of notFound) {
    const response = await get(p);
    if (response.status() === 404) continue;
    let missingPage = false;
    if (response.status() === 200) {
      const page = await (await contextFor(desktop, false)).newPage();
      try {
        await page.goto(base + p, { waitUntil: 'load' });
        await page.locator('.startup-sequence').waitFor({ state: 'hidden' });
        missingPage = (await page.locator('h1').allTextContents()).some(text => /^\s*RECORD NOT FOUND\s*$/i.test(text));
      } finally { await page.close(); }
    }
    if (missingPage) findings.softNotFound.add(p);
    else fail(`${p} should be 404, returned ${response.status()}`);
  }
  // 4. Site metadata (roadmap 2.3): favicon, robots.txt and link-preview tags on the homepage.
  if (!selfTest) {
    const home = await (await get('/')).text();
    const tags = name => [...home.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => Object.fromEntries([...tag.matchAll(/([a-z:-]+)="([^"]*)"/gi)].map(m => [m[1].toLowerCase(), m[2].replace(/&amp;/g, '&')])));
    const local = href => { const url = new URL(href, base); return url.pathname + url.search; }; // dev renders absolute URLs with localhost:3000
    const icon = tags('link').find(tag => /(^|\s)icon(\s|$)/.test(tag.rel ?? ''));
    if (!icon?.href) fail('homepage has no <link rel="icon">');
    else { const response = await get(local(icon.href)); if (response.status() !== 200) fail(`icon ${local(icon.href)} returned ${response.status()}`); }
    const robots = await get('/robots.txt');
    const robotsText = await robots.text();
    for (const rule of ['Disallow: /admin', 'Disallow: /api/', 'Allow: /api/media/file/', 'Disallow: /auth/', 'Disallow: /boot-status'])
      if (robots.status() !== 200 || !robotsText.includes(rule)) fail(`robots.txt lacks "${rule}" (status ${robots.status()})`);
    const meta = Object.fromEntries(tags('meta').map(tag => [tag.property ?? tag.name, tag.content]).filter(([key]) => key));
    for (const key of ['og:title', 'og:description', 'og:image', 'og:site_name', 'twitter:card']) if (!meta[key]) fail(`homepage has no ${key} meta tag`);
    // Absolute preview URLs. In development Next always uses localhost for them, so the fixture can only show that they
    // stay local; for production, the layout must set metadataBase from data/site.ts, and Next's own resolver (asked
    // as a production build would) must then return the live site, not localhost.
    for (const key of ['og:image', 'og:url']) if (meta[key] && !['localhost', '127.0.0.1'].includes(new URL(meta[key], base).hostname)) fail(`${key} points at ${new URL(meta[key], base).origin} in development`);
    const siteUrl = /siteUrl:\s*"([^"]+)"/.exec(readFileSync('data/site.ts', 'utf8'))?.[1];
    if (!siteUrl || !/metadataBase:\s*new URL\(site\.siteUrl\)/.test(readFileSync('app/(frontend)/layout.tsx', 'utf8'))) fail('app/(frontend)/layout.tsx does not set metadataBase from data/site.ts');
    else {
      const { getSocialImageMetadataBaseFallback } = require(path.resolve('node_modules/next/dist/lib/metadata/resolvers/resolve-url.js'));
      const saved = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV };
      try {
        process.env.NODE_ENV = 'production'; delete process.env.VERCEL_ENV;
        const resolved = getSocialImageMetadataBaseFallback(new URL(siteUrl)).origin;
        if (resolved !== new URL(siteUrl).origin) fail(`in production, preview images would resolve against ${resolved}, not ${siteUrl}`);
      } finally {
        process.env.NODE_ENV = saved.NODE_ENV;
        if (saved.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = saved.VERCEL_ENV;
      }
    }
    if (meta['og:image']) {
      const response = await get(local(meta['og:image']));
      if (response.status() !== 200 || !/^image\//.test(response.headers()['content-type'] ?? '')) fail(`og:image ${local(meta['og:image'])} returned ${response.status()} ${response.headers()['content-type']}`);
    }
  }
  // External links are never fetched; placeholder destinations are findings.
  for (const url of external.keys()) if (/^https?:\/\/(www\.)?example\.(com|org|net)\b/.test(url)) findings.externalPlaceholder.add(url);
  for (const context of Object.values(contexts)) await context.close();

  // Compare with the baseline.
  const current = Object.fromEntries(Object.entries(findings).map(([kind, set]) => [kind, [...set.keys()].sort()]));
  const labels = { softNotFound: 'missing record returns 200 instead of 404', failedRequests: 'same-origin request failed', externalRequests: 'request to another site',
    genericTitle: 'page uses the generic site title', externalPlaceholder: 'link to a placeholder site', axe: 'accessibility violation' };
  if (writeBaseline && !selfTest) {
    const today = new Date().toISOString().slice(0, 10);
    const next = { _readme: savedBaseline._readme ?? 'Known findings for scripts/verify-site-health.mjs. Each entry says why it is accepted for now and which roadmap item removes it. Entries that stop occurring must be deleted (the check fails on stale entries).' };
    for (const kind of Object.keys(current)) {
      next[kind] = {};
      for (const key of current[kind]) next[kind][key] = savedBaseline[kind]?.[key] ?? `${today}: TODO write why this is accepted and which Roadmap item removes it (${kind === 'axe' ? findings.axe.get(key).impact + ', ' + findings.axe.get(key).help : labels[kind]})`;
    }
    writeFileSync(baselineFile, JSON.stringify(next, null, 2) + '\n');
    console.log(`Baseline written to ${path.relative(process.cwd(), baselineFile)}; review the diff.`);
  } else {
    for (const kind of Object.keys(baseline)) if (kind !== '_readme' && !KINDS.includes(kind)) fail(`unknown section "${kind}" in ${path.basename(baselineFile)} (known: ${KINDS.join(', ')})`);
    for (const kind of Object.keys(current)) {
      const known = baseline[kind] ?? {};
      for (const key of current[kind]) if (!(key in known)) {
        const detail = kind === 'axe' ? ` (${findings.axe.get(key).impact}: ${findings.axe.get(key).help}; e.g. ${[...findings.axe.get(key).pages][0]})` : '';
        fail(`new ${labels[kind]}: ${key}${detail}`);
      }
      for (const key of Object.keys(known)) if (!current[kind].includes(key)) fail(`stale baseline entry (fixed? delete it from ${path.basename(baselineFile)}): ${kind} ${key}`);
      for (const [key, reason] of Object.entries(known)) if (!/Roadmap \d/.test(reason) || /TODO/.test(reason)) fail(`baseline entry without a reason and roadmap item: ${kind} ${key}`);
    }
  }
  const open = Object.entries(current).reduce((sum, [kind, list]) => sum + list.filter(key => key in (baseline[kind] ?? {})).length, 0);
  writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, pages, scanned: Object.fromEntries(scanned), external: Object.fromEntries(external),
    findings: { ...current, axe: Object.fromEntries([...findings.axe].map(([k, v]) => [k, { ...v, pages: [...v.pages] }])) }, failures }, null, 2));

  if (selfTest) {
    const expected = {
      'broken link': /link to \/self-test-broken-link is broken/,
      'wrong status for a missing record': /\/projects should be 404, returned 200/,
      'new accessibility violation': /new accessibility violation: button-name \/ button\.self-test-nameless/,
      'element key with text for a bare element': /new accessibility violation: [a-z-]+ \/ h2"Bare self-test heading"/,
      'stale baseline entry': /stale baseline entry .*self-test-stale/,
      'request to another site': /new request to another site: https:\/\/example\.org/,
      'classified text (any case)': /classified fixture text "SENTINEL-PHASE-TITLE-7Q" is in the page/,
      'console error': /console error: self-test console error/,
      'sideways scroll': /1366px \/: scrolls sideways/,
      'generic title': /new page uses the generic site title: \/projects$/,
      'failed same-origin request': /new same-origin request failed: \/self-test-missing\.png/,
      'baseline entry without a roadmap reason': /baseline entry without a reason and roadmap item: failedRequests \/self-test-missing-2\.png/,
      'classified text in a JSON response': /classified fixture text "SENTINEL-CHAPTER-TITLE-7Q" is in the response from \/self-test-data\.json/,
      'off-site redirect refused': /\/off-site redirects to another site \(https:\/\/example\.org\)/,
      'off-site redirect hop in the browser': /new request to another site: https:\/\/example\.net/,
      'request failed without a response': /new same-origin request failed: \/self-test-abort\.png/,
    };
    const missed = Object.entries(expected).filter(([, pattern]) => !failures.some(message => pattern.test(message))).map(([name]) => name);
    if (missed.length) { console.log(`FAIL self-test: the checker did not report: ${missed.join(', ')}`); process.exitCode = 1; }
    else console.log(`PASS self-test: the checker reports ${Object.keys(expected).join(', ')} (the FAIL lines above were planted)`);
  } else if (failures.length) {
    console.log(`FAIL site health: ${failures.length} problem(s); report in test-results/site-health/report.json`);
    process.exitCode = 1;
  } else console.log(`PASS site health: links, status codes, overflow, titles, console, third-party requests and accessibility (${open} known baseline finding(s) still open)`);
} finally {
  await browser.close();
}
