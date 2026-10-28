// Checks the security headers (roadmap M3, security-headers.mjs) without a server or browser:
// 1. the policies themselves, for production and development: every directive and source exactly as listed here, so a
//    new outside source can't slip in unnoticed (AGENTS.md: new outside sources need Harold's OK);
// 2. next.config.mjs serves exactly those rules, with X-Powered-By off;
// 3. the last production build (.next/routes-manifest.json, the file Next and Vercel route with) carries them, and its
//    own path patterns give each sample path the right final headers (for the same header, the last matching rule
//    wins). The header comparison is by content, so a stale build fails here;
// 4. the Monaco CDN folder allowed for the admin matches the version Payload's admin actually loads;
// 5. the site's production browser code in the last build has no eval-like calls (its production policy has no
//    'unsafe-eval'; the dev fixture can't show this, because development allows eval). Admin uses are listed for 4.6;
// 6. admin privacy: Payload's avatar is the built-in icon (no Gravatar) and its telemetry is off.
// The served headers and browser CSP reports are checked on the dev fixture by scripts/verify-site-health.mjs; the live
// site is a separate, manual check after a deploy (roadmap 4.6).
//   npm run build && node scripts/verify-security-headers.mjs      (npm run check runs it right after the build step)
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
// Every directive and every source, per policy. Changing the policy means changing this list on purpose.
const expectedPolicy = ({ dev, admin }) => ({
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...(admin ? [MONACO_CDN] : [])],
  'style-src': ["'self'", "'unsafe-inline'", ...(admin ? [MONACO_CDN] : [])],
  'img-src': ["'self'", ...(admin ? ['data:', 'blob:'] : [])],
  'font-src': ["'self'", ...(admin ? [MONACO_CDN] : [])],
  'media-src': ["'self'", ...(admin ? ['blob:'] : [])],
  'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
  ...(admin ? { 'worker-src': ["'self'", 'blob:'] } : {}),
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
});
assert.equal(MONACO_CDN, MONACO_CDN.replace(/[^\w:/.@-]/g, ''), 'MONACO_CDN is a plain URL');
assert.match(MONACO_CDN, /^https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[\d.]+\/$/, 'the only outside source is one versioned Monaco folder');
for (const dev of [false, true]) for (const admin of [false, true]) {
  const name = `${dev ? 'development' : 'production'} ${admin ? 'admin' : 'site'}`;
  assert.deepEqual(directives(contentSecurityPolicy({ dev, admin })), expectedPolicy({ dev, admin }), `${name} policy, exactly`);
}
for (const dev of [false, true]) {
  const rules = securityHeaders({ dev });
  assert.deepEqual(rules.map(rule => rule.source), ['/:path*', '/admin/:path*', '/auth/:path*'], 'the catch-all rule comes first, so the narrower rules override it');
  assert.deepEqual(lower(rules[0].headers), { ...EXPECTED_SITE, 'content-security-policy-report-only': contentSecurityPolicy({ dev }) });
  assert.deepEqual(lower(rules[1].headers), { 'content-security-policy-report-only': contentSecurityPolicy({ dev, admin: true }) });
  assert.deepEqual(lower(rules[2].headers), { 'referrer-policy': 'no-referrer' });
}
pass('policies: enforced headers, report-only CSP for site and admin (every source listed), dev-only additions');

// 4. Monaco version (before the build checks, which need a build).
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const loaded = new Set();
for (const file of files(path.join(root, 'node_modules/@payloadcms/ui/dist')).filter(file => file.endsWith('.js')))
  for (const [, version] of readFileSync(file, 'utf8').matchAll(/cdn\.jsdelivr\.net\/npm\/monaco-editor@([\w.-]+)\//g)) loaded.add(version);
assert.equal(loaded.size, 1, `expected one Monaco CDN version in @payloadcms/ui, found: ${[...loaded].join(', ') || 'none'}`);
assert.equal(MONACO_CDN, `https://cdn.jsdelivr.net/npm/monaco-editor@${[...loaded][0]}/`, 'MONACO_CDN in security-headers.mjs must match the Monaco version Payload loads (update it after a Payload upgrade)');
pass(`admin CSP allows the Monaco folder Payload loads (monaco-editor@${[...loaded][0]})`);

// 6. Admin privacy, from the Payload config itself (loaded in a child process with build-only values; no database is
// contacted and nothing from the shell's environment is passed on).
const probe = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
  'const c = await (await import("./payload.config.ts")).default; console.log("CONFIG " + JSON.stringify({ telemetry: c.telemetry, avatar: c.admin.avatar }));'], {
  encoding: 'utf8', cwd: root, timeout: 120000,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, SYSTEMROOT: process.env.SYSTEMROOT, NODE_ENV: 'development',
    CMS_DATABASE: 'postgres', DATABASE_URL: 'postgres://check:check@127.0.0.1:1/check', CMS_MEDIA_DIR: path.join(root, '.build-media-unused'),
    PAYLOAD_SECRET: 'check-only-placeholder-not-a-runtime-secret' },
});
const probed = /^CONFIG (.*)$/m.exec(probe.stdout ?? '')?.[1];
assert.ok(probed, `could not load payload.config.ts: ${(probe.stderr || probe.error?.message || '').split('\n').slice(0, 5).join(' ')}`);
assert.deepEqual(JSON.parse(probed), { telemetry: false, avatar: 'default' }, 'Payload telemetry off and the built-in avatar (no Gravatar)');
pass('admin privacy: Payload telemetry off, built-in avatar');

// 2. next.config.mjs, as a production build reads it.
const config = (await import(pathToFileURL(path.join(root, 'next.config.mjs')).href)).default;
assert.equal(config.poweredByHeader, false, 'poweredByHeader is off');
const served = await config.headers();
assert.deepEqual(served.slice(0, 3), securityHeaders({ dev: false }), 'next.config.mjs serves security-headers.mjs first, production values');
for (const rule of served) for (const { key } of rule.headers) assert.notEqual(key.toLowerCase(), 'x-powered-by', `no X-Powered-By (rule ${rule.source})`);
pass('next.config.mjs: production rules served, X-Powered-By off (also withPayload\'s)');

// 3. The last production build (compared by content; a build older than the headers fails here).
const manifestFile = path.join(root, '.next/routes-manifest.json');
assert.ok(existsSync(manifestFile), 'no .next/routes-manifest.json: run npm run build first');
const builtAt = new Date(statSync(manifestFile).mtimeMs).toISOString().replace(/\.\d+Z$/, 'Z');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const serverFiles = JSON.parse(readFileSync(path.join(root, '.next/required-server-files.json'), 'utf8'));
assert.equal(serverFiles.config.poweredByHeader, false, 'built config: poweredByHeader off (run npm run build if the build is older)');
assert.deepEqual(manifest.onMatchHeaders ?? [], [], 'no on-match headers');
for (const expected of securityHeaders({ dev: false })) {
  const built = manifest.headers.find(rule => rule.source === expected.source);
  assert.ok(built, `build has the ${expected.source} rule (run npm run build if the build is older)`);
  assert.deepEqual(built.headers, expected.headers, `build has the production headers for ${expected.source} (run npm run build if the build is older)`);
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
pass(`production build (${builtAt}): ${cases.length} sample paths get the right final headers (admin policy only under /admin, no-referrer under /auth)`);

// 5. Eval-like calls in the last build's browser code: eval (also indirect, or through window/self/globalThis), the
// Function constructor, and setTimeout/setInterval with a string. A chunk counts as the site's if a public route's
// server output names it; a chunk with a known site-only string must be classified as the site's, so the split can't
// silently put everything under "admin". The one allowed use is the global-object fallback `Function("return this")()`,
// which browsers never reach (they have globalThis/self first).
const EVAL = /(?<![\w$.])(?:(?:window|self|globalThis)\.)?eval\(|\(0,\s*eval\)\(|(?<![\w$.])Function\(|(?<![\w$.])(?:setTimeout|setInterval)\(\s*["'`]/g;
const ALLOWED = /^Function\("return this"\)/;
const count = text => [...text.matchAll(EVAL)].length;
assert.equal(count('a=eval(b);c=new Function("d");e=Function(`f`,g);(0,eval)(h);(0, eval)(i);window.eval(j);self.eval(k);globalThis.eval(l);setTimeout("m",1);setInterval(\'n\',1)'), 10, 'the scan finds every eval form');
assert.equal(count('isFunction(a);b.eval(c);$Function(d);typeof e=="function";setTimeout(f,1);setInterval(()=>g,1);x.Function(y)'), 0, 'the scan ignores look-alikes');
const SITE_ONLY = 'migrainz-announcement'; // the announcement's storage key, used only by the public site
const frontendRefs = files(path.join(root, '.next/server/app/(frontend)')).filter(file => /\.(js|json)$/.test(file)).map(file => readFileSync(file, 'utf8')).join('\n');
const siteUses = [];
const adminUses = [];
const anchors = [];
let siteChunks = 0;
for (const file of files(path.join(root, '.next/static')).filter(file => file.endsWith('.js'))) {
  const code = readFileSync(file, 'utf8');
  const name = path.basename(file);
  const site = frontendRefs.includes(name);
  if (site) siteChunks++;
  if (code.includes(SITE_ONLY)) anchors.push([name, site]);
  for (const match of code.matchAll(EVAL)) {
    const snippet = code.slice(match.index, match.index + 40);
    if (ALLOWED.test(snippet)) continue;
    (site ? siteUses : adminUses).push(`${name}: ${snippet}`);
  }
}
assert.ok(siteChunks > 0, 'no browser chunk is named by a public route; the site/admin split is broken');
assert.ok(anchors.length > 0, `no browser chunk contains "${SITE_ONLY}"; pick another site-only string`);
assert.deepEqual(anchors.filter(([, site]) => !site), [], `chunks with "${SITE_ONLY}" must count as site code`);
assert.deepEqual(siteUses, [], `eval-like calls in the site's production code (the production policy has no 'unsafe-eval'; enforcing it would break them):\n${siteUses.join('\n')}`);
pass(`site production code (build ${builtAt}, ${siteChunks} site chunks): no eval-like calls`);
if (adminUses.length) console.log(`INFO admin-only production code has ${adminUses.length} eval-like call(s) (the Function call is AJV compiling a JSON schema); report-only now, check before enforcing (roadmap 4.6):\n  ${adminUses.join('\n  ')}`);
console.log(`PASS security headers: ${passed} checks`);
