// `npm run check`: every local check in one run, required before every commit (AGENTS.md "How we work").
//   npm run check                    all steps
//   npm run check -- --list          list the steps
//   npm run check -- --only a,b      run only those steps
// package.json starts this through `npm exec` with pinned Playwright, axe-core and PGlite (test tools, not app
// dependencies), so their folders are on PATH; the older browser scripts get Playwright through PLAYWRIGHT_MODULE.
// Every step runs even after a failure. Output goes to the console and to test-results/check-<time>.txt; the exit code
// is non-zero if any step failed, timed out or was skipped. All of it is simulated: headless Chrome on throwaway SQLite
// fixtures, no real devices, no production data. Set BROWSER_PATH on Linux and macOS.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const minutes = n => n * 60000;
const STEPS = [
  { name: 'typecheck', args: ['node_modules/typescript/bin/tsc', '--noEmit'], timeout: minutes(5) },
  { name: 'build', args: ['scripts/build.mjs'], timeout: minutes(15) },
  { name: 'fixture-env', args: ['scripts/verify-fixture-env.mjs'], timeout: minutes(1) },
  { name: 'push-guard', args: ['.claude/hooks/guard-git-push.test.mjs'], timeout: minutes(1) },
  { name: 'production-guard', args: ['scripts/verify-production-guard.mjs'], timeout: minutes(3) },
  { name: 'blob-storage', args: ['--import', 'tsx', 'scripts/check-blob-storage.mjs'], timeout: minutes(3) },
  { name: 'equipment', args: ['--import', 'tsx', 'scripts/verify-equipment.ts'], timeout: minutes(5) },
  { name: 'migration', args: ['--import', 'tsx', 'scripts/verify-equipment-migration.mjs'], timeout: minutes(5) },
  { name: 'regression', args: ['scripts/regression.mjs'], timeout: minutes(30) },
  { name: 'equipment-navigation', args: ['scripts/verify-equipment-navigation.mjs'], timeout: minutes(10) },
  { name: 'equipment-browser', args: ['scripts/verify-equipment-browser.mjs'], timeout: minutes(10) },
  { name: 'viewer-pinch', args: ['scripts/verify-viewer-pinch.mjs'], timeout: minutes(10) },
  { name: 'window-pass', args: ['scripts/verify-window-pass.mjs'], timeout: minutes(10) },
];

const argv = process.argv.slice(2);
if (argv.includes('--list')) { for (const step of STEPS) console.log(`${step.name.padEnd(22)} node ${step.args.join(' ')}`); process.exit(0); }
const onlyAt = argv.indexOf('--only');
const only = onlyAt >= 0 ? (argv[onlyAt + 1] ?? '').split(',').filter(Boolean) : null;
const unknown = only?.filter(name => !STEPS.some(step => step.name === name)) ?? [];
if (unknown.length || (only && !only.length)) { console.error(`Unknown step(s): ${unknown.join(', ') || '(none given)'}. Use --list.`); process.exit(1); }
const steps = only ? STEPS.filter(step => only.includes(step.name)) : STEPS;

// The regression suite and the browser scripts need the port range and Chrome to themselves.
const pidFile = path.resolve('test-results/serve-fixture.pid');
if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, 'utf8'));
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) { console.error('The review server is running. Stop it first: node scripts/serve-fixture.mjs --stop'); process.exit(1); }
}
const env = { ...process.env };
if (!env.PLAYWRIGHT_MODULE) {
  const found = process.env.PATH.split(path.delimiter).map(dir => path.join(path.dirname(dir), 'playwright', 'index.mjs')).find(existsSync);
  if (!found) { console.error('Playwright not found on PATH. Run this through `npm run check` (it fetches the pinned test tools).'); process.exit(1); }
  env.PLAYWRIGHT_MODULE = found;
}

mkdirSync('test-results', { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const logPath = path.resolve(`test-results/check-${stamp}.txt`);
const log = createWriteStream(logPath);
const write = text => { process.stdout.write(text); log.write(text); };

const killTree = pid => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else { try { process.kill(-pid, 'SIGKILL'); } catch {} }
};
const run = step => new Promise(resolve => {
  const started = Date.now();
  write(`\n===== ${step.name}: node ${step.args.join(' ')} =====\n`);
  const child = spawn(process.execPath, step.args, { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
  child.stdout.on('data', write);
  child.stderr.on('data', write);
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, step.timeout);
  // Wait for 'exit', not 'close': a leftover grandchild (a dev server worker) can hold the pipes open.
  child.once('exit', (code, signal) => {
    clearTimeout(timer);
    if (process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
    child.stdout.destroy(); child.stderr.destroy();
    const seconds = Math.round((Date.now() - started) / 1000);
    const result = timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : code === 2 && step.name === 'migration' ? 'SKIPPED' : 'FAIL';
    write(`===== EXIT ${timedOut ? 'timeout' : signal ?? code} (${seconds}s) ${result} =====\n`);
    resolve({ name: step.name, result, seconds });
  });
  child.once('error', error => { clearTimeout(timer); write(`===== ERROR ${error.message} =====\n`); resolve({ name: step.name, result: 'FAIL', seconds: 0 }); });
});

const results = [];
for (const step of steps) results.push(await run(step));
const changed = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
write('\n===== Summary =====\n');
for (const r of results) write(`${r.result.padEnd(8)} ${r.name.padEnd(22)} ${r.seconds}s\n`);
if (changed) write(`Working tree after the run (check for files the run rewrote, e.g. next-env.d.ts, payload-types.ts, AGENTS.md):\n${changed}\n`);
const failed = results.filter(r => r.result !== 'PASS');
write(failed.length ? `FAILED: ${failed.map(r => `${r.name} (${r.result})`).join(', ')}\n` : `All ${results.length} steps passed.\n`);
write(`Log: ${path.relative(process.cwd(), logPath)}\nSimulated only: headless Chrome on throwaway SQLite fixtures; not real devices, other browsers, the live site or production data.\n`);
log.end();
process.exitCode = failed.length ? 1 : 0;
