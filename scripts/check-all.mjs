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
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const minutes = n => n * 60000;
const STEPS = [
  { name: 'typecheck', args: ['node_modules/typescript/bin/tsc', '--noEmit'], timeout: minutes(5) },
  { name: 'build', args: ['scripts/build.mjs'], timeout: minutes(15) },
  { name: 'security-headers', args: ['scripts/verify-security-headers.mjs'], timeout: minutes(1) },
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
// Steps that start their own process groups (the regression runner: dev server and test scripts) list them here, so a
// forced stop can reach them too. Browsers need no entry: headless Chrome exits when its Playwright parent dies (its
// debugging pipe closes; checked 2026-10-27).
const pgidFile = path.resolve(`test-results/check-${stamp}.pgids`);
env.CHECK_PGID_FILE = pgidFile;
const log = createWriteStream(logPath);
const write = text => { process.stdout.write(text); log.write(text); };

// Stop a step. Linux/macOS: SIGTERM to its process group so it can clean up (regression.mjs stops its own dev server
// and browsers, which sit in their own groups), then SIGKILL to the group after a grace period. Windows: taskkill ends
// the whole tree at once (no graceful stop there).
const signalGroup = (pid, signal) => { try { process.kill(-pid, signal); return true; } catch { return false; } };
const listedGroups = () => { try { return readFileSync(pgidFile, 'utf8').split('\n').map(Number).filter(Boolean); } catch { return []; } };
const killNow = pid => { signalGroup(pid, 'SIGKILL'); for (const group of listedGroups()) signalGroup(group, 'SIGKILL'); };
const stopTree = (pid, graceMs = 8000) => {
  if (process.platform === 'win32') { spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); return; }
  if (signalGroup(pid, 'SIGTERM')) setTimeout(() => killNow(pid), graceMs);
};
let current; // the running step's child, for the signal handlers below
let interrupted = false;
// First Ctrl+C: stop the running step gracefully, skip the rest, still write the summary. Another one more than 2 s
// later: kill it now. (One keypress can arrive twice, from the terminal and from npm forwarding it, so repeats within
// 2 s are ignored.) Closing the terminal (SIGHUP) counts as a first Ctrl+C.
let firstSignalAt = 0;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => {
  if (interrupted) {
    if (Date.now() - firstSignalAt < 2000) return;
    write(`\n===== ${signal} again; killing the running step =====\n`);
    if (current?.pid) process.platform === 'win32' ? stopTree(current.pid) : killNow(current.pid);
    return;
  }
  interrupted = true;
  firstSignalAt = Date.now();
  process.exitCode = 130;
  write(`\n===== Interrupted (${signal}); stopping ${current ? 'the running step' : 'nothing'}; remaining steps are skipped =====\n`);
  if (current?.pid) stopTree(current.pid);
  setTimeout(() => process.exit(130), 20000).unref(); // last resort if a step never exits
});
const run = step => new Promise(resolve => {
  const started = Date.now();
  write(`\n===== ${step.name}: node ${step.args.join(' ')} =====\n`);
  const child = spawn(process.execPath, step.args, { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
  current = child;
  child.stdout.on('data', write);
  child.stderr.on('data', write);
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; write(`\n===== ${step.name} timed out after ${step.timeout / 60000} min; stopping it =====\n`); stopTree(child.pid); }, step.timeout);
  child.once('exit', async (code, signal) => {
    clearTimeout(timer);
    current = undefined;
    // Let the pipes drain so the last lines (often the failing assertion) reach the log, but don't wait forever: a
    // leftover grandchild (a dev server worker) can hold them open. Then end anything left in the step's group.
    await Promise.race([new Promise(done => child.once('close', done)), new Promise(done => setTimeout(done, 3000))]);
    if (process.platform !== 'win32') signalGroup(child.pid, 'SIGTERM');
    child.stdout.destroy(); child.stderr.destroy();
    const seconds = Math.round((Date.now() - started) / 1000);
    const result = timedOut ? 'TIMEOUT' : code === 0 ? 'PASS' : code === 2 && step.name === 'migration' ? 'SKIPPED' : 'FAIL';
    write(`===== EXIT ${timedOut ? 'timeout' : signal ?? code} (${seconds}s) ${result} =====\n`);
    resolve({ name: step.name, result, seconds });
  });
  child.once('error', error => { clearTimeout(timer); write(`===== ERROR ${error.message} =====\n`); resolve({ name: step.name, result: 'FAIL', seconds: 0 }); });
});

const results = [];
for (const step of steps) {
  if (interrupted) { results.push({ name: step.name, result: 'NOT RUN', seconds: 0 }); continue; }
  results.push(await run(step));
}
const changed = (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout ?? '').trimEnd();
write('\n===== Summary =====\n');
for (const r of results) write(`${r.result.padEnd(8)} ${r.name.padEnd(22)} ${r.seconds}s\n`);
if (changed) write(`Working tree after the run (check for files the run rewrote, e.g. next-env.d.ts, payload-types.ts, AGENTS.md):\n${changed}\n`);
const failed = results.filter(r => r.result !== 'PASS');
write(failed.length ? `FAILED: ${failed.map(r => `${r.name} (${r.result})`).join(', ')}\n` : `All ${results.length} steps passed.\n`);
write(`Log: ${path.relative(process.cwd(), logPath)}\nSimulated only: headless Chrome on throwaway SQLite fixtures; not real devices, other browsers, the live site or production data.\n`);
const code = interrupted ? 130 : failed.length ? 1 : 0;
rmSync(pgidFile, { force: true });
log.end(() => process.exit(code));
