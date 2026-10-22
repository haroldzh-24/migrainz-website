// Serves the app on a throwaway fixture (fresh private SQLite database and media directory, seeded like the
// regression suite) so it can be opened from a phone on the same network. Never touches the editor database,
// Blob storage or the real Payload secret.
//
//   node scripts/serve-fixture.mjs [port]     start (prints the local and network URLs, keeps running)
//   node scripts/serve-fixture.mjs --stop     stop the server started earlier
//
// next dev still reads .env.local, but every variable that file defines or that could reach Blob/Patreon is
// overridden here, and process.env always wins over .env.local. Stop it before running the regression suite.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('test-results', { recursive: true });
const pidFile = path.resolve('test-results/serve-fixture.pid');
const killTree = pid => process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) : process.kill(pid, 'SIGTERM');

if (process.argv.includes('--stop')) {
  if (existsSync(pidFile)) { killTree(Number(readFileSync(pidFile, 'utf8'))); rmSync(pidFile); console.log('Stopped the fixture server.'); }
  else console.log('No fixture server recorded.');
  process.exit(0);
}

const fixture = mkdtempSync(path.resolve('test-results/regression-'));
const port = Number(process.argv[2]) || await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '0.0.0.0', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const lan = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
const blank = ['VERCEL_OIDC_TOKEN', 'BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'BLOB_WEBHOOK_PUBLIC_KEY', 'PATREON_CLIENT_ID', 'PATREON_CLIENT_SECRET', 'PATREON_REDIRECT_URI', 'PATREON_CAMPAIGN_ID', 'PATREON_URL'];
const env = {
  ...process.env,
  ...Object.fromEntries(blank.map(name => [name, ''])),
  NODE_ENV: 'development',
  CMS_DATABASE: 'sqlite',
  DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
  CMS_MEDIA_DIR: path.join(fixture, 'media'),
  PAYLOAD_SECRET: randomBytes(32).toString('hex'),
  BOOT_ONLY: '0',
  DESKTOP_TEST_FIXTURE: fixture,
  DEV_ALLOWED_ORIGINS: lan.join(','),
};
mkdirSync(env.CMS_MEDIA_DIR);
const run = args => { const r = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true }); if (r.status !== 0) { console.error('Fixture setup failed: ' + args.join(' ')); process.exit(1); } };
run(['--import', 'tsx', 'scripts/migrate-legacy-content.ts', '--apply']);
run(['--import', 'tsx', 'scripts/seed-desktop-fixture.ts']);

const log = path.join(fixture, 'server.log');
const out = (await import('node:fs')).openSync(log, 'a');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', String(port)], { env, stdio: ['ignore', out, out], windowsHide: true, detached: false });
writeFileSync(pidFile, String(server.pid));
const local = `http://127.0.0.1:${port}`;
for (const deadline = Date.now() + 180000; ; await new Promise(r => setTimeout(r, 500))) {
  if (server.exitCode !== null) { console.error('Server exited; see ' + log); process.exit(1); }
  try { const response = await fetch(local, { signal: AbortSignal.timeout(5000) }); await response.arrayBuffer(); if (response.ok) break; } catch { /* still compiling */ }
  if (Date.now() > deadline) { killTree(server.pid); console.error('Server not ready in 180s; see ' + log); process.exit(1); }
}
console.log(`Fixture: ${fixture}\nLocal:   ${local}\n${lan.map(ip => `Network: http://${ip}:${port}`).join('\n')}\nStop:    node scripts/serve-fixture.mjs --stop`);
server.on('exit', () => process.exit(0));
