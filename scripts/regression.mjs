import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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
const groups = new Set(); // every process group started, kept after the leader exits (its workers may still run)
function launch(args) {
  // Own process group on Linux/macOS so stop() can end next dev and its workers together.
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32' });
  children.add(child);
  if (child.pid) groups.add(child.pid);
  child.once('exit', () => children.delete(child));
  return child;
}
function completed(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Regression subprocess exited with ${signal || code}`)));
  });
}
// Ends only this runner's process trees: SIGTERM to each group, a few seconds to exit, then SIGKILL to every group
// this run started (Windows: taskkill /T /F, which is immediate).
async function stop() {
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
  }
  if (process.platform === 'win32') return;
  for (const deadline = Date.now() + 5000; children.size && Date.now() < deadline;) await new Promise(done => setTimeout(done, 100));
  for (const pid of groups) { try { process.kill(-pid, 'SIGKILL'); } catch {} }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await stop(); process.exit(1); });

try {
  console.log(`Regression fixture: ${fixture}`);
  await completed(launch(['--import', 'tsx', 'scripts/verify-boot-labels.ts']));
  await completed(launch(['--import', 'tsx', 'scripts/migrate-legacy-content.ts', '--apply']));
  await completed(launch(['--import', 'tsx', 'scripts/verify-content-migration.ts']));
  await completed(launch(['--import', 'tsx', 'scripts/seed-desktop-fixture.ts']));
  const port = await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => resolve(address.port));
    });
  });
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
  await completed(launch(['scripts/verify-factions.cjs']));
  await completed(launch(['scripts/verify.cjs']));
  await completed(launch(['scripts/verify-interaction-polish.mjs']));
  await completed(launch(['scripts/verify-art-viewer-keys.mjs']));
  await completed(launch(['scripts/verify-site-health.mjs']));
  await completed(launch(['scripts/verify-site-health.mjs', '--self-test']));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stop();
}
