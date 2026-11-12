import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fixtureEnv, fixtureEnvProblems } from './fixture-env.mjs';

// Never seed or republish records in the editor's database. Each run owns a
// fresh, ignored database and private media directory; .env.local stays intact.
mkdirSync('test-results', { recursive: true });
const fixture = mkdtempSync(path.resolve('test-results/regression-'));
// Same fail-closed environment as the review server (scripts/fixture-env.mjs): Blob, Patreon, Vercel and every .env*
// variable blanked, so next dev cannot fill them from .env.local.
const env = fixtureEnv(fixture);
const problems = fixtureEnvProblems(env, fixture);
if (problems.length) { rmSync(fixture, { recursive: true, force: true }); console.error('Refusing to start. Offending variables: ' + problems.join(', ')); process.exit(1); }
mkdirSync(env.CMS_MEDIA_DIR);
const children = new Set();
function launch(args) {
  // Own process group on Linux/macOS so stop() can end next dev and its workers together. Under `npm run check` the
  // group is also listed in CHECK_PGID_FILE so a forced stop of the whole check can reach it.
  const child = spawn(process.execPath, args, { env: { ...env }, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
  children.add(child);
  if (child.pid && process.env.CHECK_PGID_FILE) { try { appendFileSync(process.env.CHECK_PGID_FILE, `${child.pid}\n`); } catch {} }
  // When a step ends, end anything it left in its group at once (later its group id could be reused).
  child.once('exit', () => { children.delete(child); if (process.platform !== 'win32' && child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} } });
  return child;
}
function completed(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Regression subprocess exited with ${signal || code}`)));
  });
}
// Ends only this runner's process trees: SIGTERM to each running step's group, a few seconds to exit, then SIGKILL to
// those groups (Windows: taskkill /T /F, which is immediate). Finished steps' groups were already ended on exit.
async function stop() {
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
  }
  if (process.platform === 'win32') return;
  const running = [...children].map(child => child.pid).filter(Boolean);
  for (const deadline = Date.now() + 5000; children.size && Date.now() < deadline;) await new Promise(done => setTimeout(done, 100));
  for (const pid of running) { try { process.kill(-pid, 'SIGKILL'); } catch {} }
}
// Repeated signals (one keypress can arrive twice) don't interrupt the stop that is already running.
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, async () => { if (stopping) return; stopping = true; await stop(); process.exit(1); });

try {
  console.log(`Regression fixture: ${fixture}`);
  await completed(launch(['--import', 'tsx', 'scripts/verify-boot-labels.ts']));
  await completed(launch(['--import', 'tsx', 'scripts/migrate-legacy-content.ts', '--apply']));
  await completed(launch(['--import', 'tsx', 'scripts/verify-content-migration.ts']));
  await completed(launch(['--import', 'tsx', 'scripts/seed-desktop-fixture.ts']));
  // Batch 23: the command palette's index for an anonymous visitor and a signed-in patron (its own private fixture).
  await completed(launch(['--import', 'tsx', '--import', './scripts/stubs/register.mjs', 'scripts/verify-search-index.ts']));
  // Batch 24: the lore-link index (public only, also for a signed-in patron; a redacted name containing a public name)
  // and the linker's rules, in-process on its own private fixture.
  await completed(launch(['--import', 'tsx', '--import', './scripts/stubs/register.mjs', 'scripts/verify-lore-index.ts']));
  const freePort = () => new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
  // The dev server, started fresh twice: `next dev` grows with every route it compiles and, near its heap limit, restarts
  // itself mid-request (batch 11: after the browser scripts, during the site-health crawl). Site health gets its own
  // fresh server, so its crawl never meets that restart. Each server gets a newly probed port (11b), so the second never
  // waits for the first one's port to be released; BASE_URL follows it.
  async function startServer() {
    const port = await freePort();
    env.BASE_URL = `http://127.0.0.1:${port}`;
    const server = launch(['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)]);
    let serverFailure;
    server.once('error', error => { serverFailure = error; });
    const deadline = Date.now() + 120000;
    while (true) {
      if (serverFailure) throw serverFailure;
      if (server.exitCode !== null || server.signalCode !== null) throw new Error('Regression server stopped. Close any existing next dev server before running regression.');
      try {
        const response = await fetch(env.BASE_URL, { signal: AbortSignal.timeout(5000) });
        await response.arrayBuffer();
        if (response.ok) break;
      } catch { /* Server is still starting/compiling. */ }
      if (Date.now() >= deadline) throw new Error('Regression server did not become ready within 120 seconds.');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return server;
  }
  async function stopServer(server) {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const exited = new Promise(resolve => server.once('exit', resolve));
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else { try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); } }
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 10000))]);
    if (server.exitCode === null && server.signalCode === null && process.platform !== 'win32') { try { process.kill(-server.pid, 'SIGKILL'); } catch {} }
  }
  // 24b: the fixture server's resident memory (next dev and its workers: the server's process group) after each browser
  // script, written to the check log, to follow the growth that got it killed in this sandbox (bugs.md "Check
  // environment"). Linux only (reads /proc); elsewhere nothing is logged.
  function serverMemory(server) {
    if (process.platform !== 'linux' || !server?.pid) return undefined;
    let kb = 0;
    for (const entry of readdirSync('/proc')) {
      if (!/^\d+$/.test(entry)) continue;
      try {
        const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
        const group = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[2]);
        if (group !== server.pid) continue;
        kb += Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${entry}/status`, 'utf8'))?.[1] ?? 0);
      } catch { /* the process ended meanwhile */ }
    }
    return kb;
  }
  async function step(args) {
    try { await completed(launch(args)); }
    finally {
      const kb = serverMemory(server);
      if (kb !== undefined) console.log(`[regression] fixture server memory after ${path.basename(args.at(-1))}: ${(kb / 1048576).toFixed(2)} GB resident`);
    }
  }
  let server = await startServer();
  await step(['scripts/verify-factions.cjs']);
  await step(['scripts/verify.cjs']);
  await step(['scripts/verify-interaction-polish.mjs']);
  await step(['scripts/verify-art-viewer-keys.mjs']);
  await step(['scripts/verify-art-viewer.mjs']);
  await step(['scripts/verify-nav-status.mjs']);
  await step(['scripts/verify-operations-log.mjs']);
  await step(['scripts/verify-page-transition.mjs']);
  await step(['scripts/verify-decode.mjs']);
  await step(['scripts/verify-page-flip.mjs']);
  await step(['scripts/verify-terminal-typing.mjs']);
  await step(['scripts/verify-type-out.mjs']);
  // Batch 24: a fresh server for the second half too. In this sandbox's 6 GB limit the first server was killed for memory
  // (cgroup OOM, about 5 GB resident) during verify-equipment-directory in two runs in a row (bugs.md "Check environment").
  await stopServer(server);
  server = await startServer();
  await step(['scripts/verify-ghost-core.mjs']);
  await step(['scripts/verify-ghost-terminal.mjs']);
  await step(['scripts/verify-ghost-site.mjs']);
  await step(['scripts/verify-home.mjs']);
  await step(['--import', 'tsx', 'scripts/verify-mode-switch.mjs']);
  await step(['scripts/verify-equipment-directory.mjs']);
  await stopServer(server);
  server = await startServer();
  // Batch 22: on the fresh server, so the first server's memory growth (bugs.md) does not reach it.
  await step(['scripts/verify-plain-motion.mjs']);
  await step(['scripts/verify-command-palette.mjs']);
  await step(['scripts/verify-lore-links.mjs']);
  // Batch 26: the dossier and the scroll-told project page on their own fresh server, so the third server's growth
  // (killed for memory in batches 24 and 25, bugs.md "Check environment") does not reach them.
  await stopServer(server);
  server = await startServer();
  await step(['scripts/verify-dossier.mjs']);
  await step(['scripts/verify-scroll-file.mjs']);
  // Batch 25: one more fresh server for the site-health crawl. With verify-dossier added, the third server was killed
  // for memory (cgroup OOM, about 5.4 GB resident) during the crawl in this sandbox's 6 GB limit (bugs.md "Check environment").
  await stopServer(server);
  server = await startServer();
  await step(['scripts/verify-site-health.mjs']);
  await step(['scripts/verify-site-health.mjs', '--self-test']);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stop();
}
