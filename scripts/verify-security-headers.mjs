// Checks the security headers (roadmap M3, security-headers.mjs) without a server or browser:
// 1. the policies themselves, for production and development;
// 2. next.config.mjs serves exactly those rules, with X-Powered-By off;
// 3. the production build (.next/routes-manifest.json, the file Next and Vercel route with) carries them, and its own
//    path patterns give each sample path the right final headers (for the same header, the last matching rule wins);
// 4. the Monaco CDN folder allowed for the admin matches the version Payload's admin actually loads;
// 5. the site's production browser code has no eval-like calls (its production policy has no 'unsafe-eval'; the dev
//    fixture can't show this, because development allows eval). Admin uses are listed for roadmap 4.6.
// The served headers and browser CSP reports are checked on the dev fixture by scripts/verify-site-health.mjs; the live
// site is a separate, manual check after a deploy (roadmap 4.6).
//   npm run build && node scripts/verify-security-headers.mjs      (npm run check runs it right after the build step)
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.NODE_ENV = 'production'; // read by next.config.mjs when it is imported below
const root = path.resolve('.');
const { contentSecurityPolicy, securityHeaders, MONACO_CDN, PERMISSIONS_POLICY } = await import(pathToFileURL(path.join(root, 'security-headers.mjs')).href);
let passed = 0;
const pass = message => { passed++; console.log('PASS ' + message); };
const directives = csp => Object.fromEntries(csp.split(';').map(part => part.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...values]) => [name, values]));
const lower = headers => Object.fromEntries(headers.map(({ key, value }) => [key.toLowerCase(), value]));

// 1. The policies.
const EXPECTED_SITE = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};
assert.equal(PERMISSIONS_POLICY, EXPECTED_SITE['permissions-policy']);
assert.ok(!/browsing-topics|interest-cohort/.test(PERMISSIONS_POLICY), 'no retired Permissions-Policy features (Chrome logs an error for unknown ones)');
for (const dev of [false, true]) {
  const mode = dev ? 'development' : 'production';
  const site = directives(contentSecurityPolicy({ dev }));
  const admin = directives(contentSecurityPolicy({ dev, admin: true }));
  for (const [name, csp] of [['site', site], ['admin', admin]]) {
    assert.deepEqual(csp['default-src'], ["'self'"], `${mode} ${name}: default-src 'self'`);
    assert.deepEqual(csp['frame-ancestors'], ["'self'"], `${mode} ${name}: frame-ancestors 'self'`);
    assert.deepEqual(csp['object-src'], ["'none'"], `${mode} ${name}: object-src 'none'`);
    assert.deepEqual(csp['base-uri'], ["'self'"]);
    assert.deepEqual(csp['form-action'], ["'self'"]);
    assert.equal(csp['script-src'].includes("'unsafe-eval'"), dev, `${mode} ${name}: 'unsafe-eval' only in development`);
    assert.equal(csp['connect-src'].includes('ws:'), dev, `${mode} ${name}: ws: only in development`);
    for (const values of Object.values(csp)) for (const value of values) {
      assert.ok(!['*', 'http:', 'https:', 'https://cdn.jsdelivr.net', 'https://cdn.jsdelivr.net/'].includes(value), `${mode} ${name}: no wildcard source (${value})`);
      if (/^https:/.test(value)) assert.equal(value, MONACO_CDN, `${mode} ${name}: the only outside source is the Monaco folder`);
    }
  }
  for (const directive of ['img-src', 'media-src', 'font-src']) assert.deepEqual(site[directive], ["'self'"], `${mode} site: ${directive} 'self' only (no data:/blob:)`);
  assert.ok(!Object.values(site).flat().includes(MONACO_CDN), `${mode} site: no CDN`);
  for (const directive of ['script-src', 'style-src', 'font-src']) assert.ok(admin[directive].includes(MONACO_CDN), `${mode} admin: ${directive} allows the Monaco folder`);
  const rules = securityHeaders({ dev });
  assert.deepEqual(rules.map(rule => rule.source), ['/:path*', '/admin/:path*', '/auth/:path*'], 'the catch-all rule comes first, so the narrower rules override it');
  for (const rule of rules) for (const { key } of rule.headers) {
    assert.notEqual(key.toLowerCase(), 'content-security-policy', `${mode}: CSP stays report-only (enforcing is roadmap 4.6); the SVG media route keeps its own enforced policy`);
    assert.notEqual(key.toLowerCase(), 'x-powered-by');
  }
  assert.deepEqual(lower(rules[0].headers), { ...EXPECTED_SITE, 'content-security-policy-report-only': contentSecurityPolicy({ dev }) });
}
pass('policies: enforced headers, report-only CSP for site and admin, dev-only additions');

// 4. Monaco version (before the build checks, which need a build).
const uiDist = path.join(root, 'node_modules/@payloadcms/ui/dist');
const loaded = new Set();
const walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, entry.name);
  if (entry.isDirectory()) walk(file);
  else if (entry.name.endsWith('.js')) for (const [, version] of readFileSync(file, 'utf8').matchAll(/cdn\.jsdelivr\.net\/npm\/monaco-editor@([\w.-]+)\//g)) loaded.add(version);
} };
walk(uiDist);
assert.equal(loaded.size, 1, `expected one Monaco CDN version in @payloadcms/ui, found: ${[...loaded].join(', ') || 'none'}`);
assert.equal(MONACO_CDN, `https://cdn.jsdelivr.net/npm/monaco-editor@${[...loaded][0]}/`, 'MONACO_CDN in security-headers.mjs must match the Monaco version Payload loads (update it after a Payload upgrade)');
pass(`admin CSP allows the Monaco folder Payload loads (monaco-editor@${[...loaded][0]})`);

// 2. next.config.mjs, as a production build reads it.
const config = (await import(pathToFileURL(path.join(root, 'next.config.mjs')).href)).default;
assert.equal(config.poweredByHeader, false, 'poweredByHeader is off');
const served = await config.headers();
assert.deepEqual(served.slice(0, 3), securityHeaders({ dev: false }), 'next.config.mjs serves security-headers.mjs first, production values');
for (const rule of served) for (const { key } of rule.headers) assert.notEqual(key.toLowerCase(), 'x-powered-by', `no X-Powered-By (rule ${rule.source})`);
pass('next.config.mjs: production rules served, X-Powered-By off (also withPayload\'s)');

// 3. The production build.
const manifestFile = path.join(root, '.next/routes-manifest.json');
assert.ok(existsSync(manifestFile), 'no .next/routes-manifest.json: run npm run build first');
const builtAt = statSync(manifestFile).mtimeMs;
for (const source of ['security-headers.mjs', 'next.config.mjs']) assert.ok(statSync(path.join(root, source)).mtimeMs <= builtAt, `${source} changed after the last build: run npm run build first`);
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const serverFiles = JSON.parse(readFileSync(path.join(root, '.next/required-server-files.json'), 'utf8'));
assert.equal(serverFiles.config.poweredByHeader, false, 'built config: poweredByHeader off');
assert.deepEqual(manifest.onMatchHeaders ?? [], [], 'no on-match headers');
for (const expected of securityHeaders({ dev: false })) {
  const built = manifest.headers.find(rule => rule.source === expected.source);
  assert.ok(built, `build has the ${expected.source} rule`);
  assert.deepEqual(built.headers, expected.headers, `build has the production headers for ${expected.source}`);
  assert.ok(!built.has && !built.missing, `${expected.source}: no conditions`);
}
for (const rule of manifest.headers) for (const { key } of rule.headers) assert.notEqual(key.toLowerCase(), 'x-powered-by', `build: no X-Powered-By (rule ${rule.source})`);
// Final headers per path, folding the built rules in order with the build's own patterns.
const finalHeaders = pathname => {
  const result = {};
  for (const rule of manifest.headers) if (new RegExp(rule.regex, manifest.caseSensitive ? '' : 'i').test(pathname)) for (const { key, value } of rule.headers) result[key.toLowerCase()] = value;
  return result;
};
const SITE_CSP = contentSecurityPolicy({ dev: false });
const ADMIN_CSP = contentSecurityPolicy({ dev: false, admin: true });
const cases = [
  ['/', SITE_CSP], ['/projects/blushland/equipment/fixture-scanner', SITE_CSP], ['/api/projects', SITE_CSP], ['/api/media/file/x.svg', SITE_CSP],
  ['/admin', ADMIN_CSP], ['/admin/', ADMIN_CSP], ['/admin/login', ADMIN_CSP], ['/admin/collections/projects/1', ADMIN_CSP],
  ['/administrator', SITE_CSP], ['/admin-notes', SITE_CSP], ['/auth/patreon/start', SITE_CSP], ['/robots.txt', SITE_CSP], ['/_next/static/chunks/x.js', SITE_CSP],
];
for (const [pathname, csp] of cases) {
  const headers = finalHeaders(pathname);
  assert.equal(headers['content-security-policy-report-only'], csp, `${pathname}: ${csp === ADMIN_CSP ? 'admin' : 'site'} policy`);
  assert.equal(headers['content-security-policy'], undefined, `${pathname}: no enforced CSP from the config`);
  for (const [key, value] of Object.entries(EXPECTED_SITE)) {
    const expected = key === 'referrer-policy' && pathname.startsWith('/auth/') ? 'no-referrer' : value;
    assert.equal(headers[key], expected, `${pathname}: ${key}`);
  }
}
pass(`production build: ${cases.length} sample paths get the right final headers (admin policy only under /admin, no-referrer under /auth)`);

// 5. Eval-like calls in the production browser code. A chunk counts as the site's if a public route's server output
// names it. The one allowed use is the global-object fallback `Function("return this")()`, which browsers never reach
// (they have globalThis/self first).
const EVAL = /(?<![\w$.])(?:eval|Function)\(/g;
const ALLOWED = /^Function\("return this"\)/;
const sample = text => [...text.matchAll(EVAL)].length;
assert.equal(sample('a=eval(b);c=new Function("d");e=Function(`f`,g)'), 3, 'the scan finds eval and the Function constructor');
assert.equal(sample('isFunction(a);b.eval(c);$Function(d);typeof e=="function"'), 0, 'the scan ignores look-alikes');
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const frontendRefs = files(path.join(root, '.next/server/app/(frontend)')).filter(file => /\.(js|json)$/.test(file)).map(file => readFileSync(file, 'utf8')).join('\n');
const siteUses = [];
const adminUses = [];
for (const file of files(path.join(root, '.next/static')).filter(file => file.endsWith('.js'))) {
  const code = readFileSync(file, 'utf8');
  const name = path.basename(file);
  for (const match of code.matchAll(EVAL)) {
    const snippet = code.slice(match.index, match.index + 40);
    if (ALLOWED.test(snippet)) continue;
    (frontendRefs.includes(name) ? siteUses : adminUses).push(`${name}: ${snippet}`);
  }
}
assert.ok(frontendRefs.length > 0, 'no public route output found in .next/server/app/(frontend)');
assert.deepEqual(siteUses, [], `eval-like calls in the site's production code (the production policy has no 'unsafe-eval'; enforcing it would break them):\n${siteUses.join('\n')}`);
pass('site production code: no eval-like calls');
if (adminUses.length) console.log(`INFO admin-only production code has ${adminUses.length} eval-like call(s) (e.g. AJV schema compiling); they are report-only now and need checking before enforcing (roadmap 4.6):\n  ${adminUses.join('\n  ')}`);
console.log(`PASS security headers: ${passed} checks`);
