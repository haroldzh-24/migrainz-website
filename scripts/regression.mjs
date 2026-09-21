import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Never seed or republish records in the editor's database. Each run owns a
// fresh, ignored database and private media directory; .env.local stays intact.
mkdirSync('test-results', { recursive: true });
const fixture = mkdtempSync(path.resolve('test-results/regression-'));
const env = {
  ...process.env,
  NODE_ENV: 'development',
  CMS_DATABASE: 'sqlite',
  DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
  CMS_MEDIA_DIR: path.join(fixture, 'media'),
  PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  BOOT_ONLY: '0',
  DESKTOP_TEST_FIXTURE: fixture,
};
mkdirSync(env.CMS_MEDIA_DIR);
const children = new Set();
function launch(args) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}
function completed(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Regression subprocess exited with ${signal || code}`)));
  });
}
function stop() {
  for (const child of children) {
    if (!child.pid) continue;
    // next dev starts a worker; terminate only this runner's process trees.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stop(); process.exit(1); });

try {
  console.log(`Regression fixture: ${fixture}`);
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
  await completed(launch(['scripts/verify.cjs']));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stop();
}
