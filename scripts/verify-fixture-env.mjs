// Unit checks for scripts/fixture-env.mjs (no server, no browser, no network). Run by `npm run check`.
//   node scripts/verify-fixture-env.mjs
// Fake values only. The only real-file access is reading variable NAMES from the repo's .env* files (envFileNames),
// never values.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { BLANKED, envFileNames, fixtureEnv, fixtureEnvProblems } from './fixture-env.mjs';

const tmp = mkdtempSync(path.join(os.tmpdir(), 'fixture-env-'));
try {
  const fixture = path.join(tmp, 'fixture');
  const dir = path.join(tmp, 'repo');
  (await import('node:fs')).mkdirSync(dir);
  writeFileSync(path.join(dir, '.env.local'), 'DATABASE_URL=postgres://user:pass@example.neon.tech/db\nexport CUSTOM_SECRET=abc\n# COMMENTED=1\nPAYLOAD_SECRET=x\n');
  const base = { PATH: process.env.PATH, VERCEL: '1', BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_fake', PATREON_CLIENT_SECRET: 'fake', CUSTOM_SECRET: 'from-shell' };

  // Credentials from the shell and names from .env files are blanked; the fixture's own values are set.
  const env = fixtureEnv(fixture, { base, dir });
  for (const name of BLANKED) assert.equal(env[name], '', `${name} blanked`);
  assert.equal(env.CUSTOM_SECRET, '', 'names found in .env.local are blanked (so next dev cannot fill them)');
  assert.equal(env.COMMENTED, undefined, 'commented lines are ignored');
  assert.equal(env.CMS_DATABASE, 'sqlite');
  assert.ok(env.DATABASE_URL.startsWith('file:') && env.DATABASE_URL.includes('fixture'), 'database inside the fixture');
  assert.match(env.PAYLOAD_SECRET, /^[0-9a-f]{64}$/, 'random secret, not the one from .env.local');
  assert.deepEqual(fixtureEnvProblems(env, fixture), [], 'a correct fixture environment passes');
  assert.equal(fixtureEnv(fixture, { base, dir, extra: { DEV_ALLOWED_ORIGINS: 'a,b' } }).DEV_ALLOWED_ORIGINS, 'a,b', 'extras are kept');

  // Fail closed on anything that could reach production.
  const problems = extra => fixtureEnvProblems({ ...env, ...extra }, fixture).join(' | ');
  assert.match(problems({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_fake' }), /BLOB_READ_WRITE_TOKEN/, 'a Blob token refuses the start');
  assert.match(problems({ VERCEL: '1' }), /VERCEL /, 'VERCEL=1 refuses the start');
  assert.match(problems({ DATABASE_URL: 'postgres://u:p@h/db' }), /DATABASE_URL/, 'a Postgres database refuses the start');
  assert.match(problems({ DATABASE_URL: 'file:///elsewhere/content.db' }), /DATABASE_URL/, 'a SQLite file outside the fixture refuses the start');
  assert.match(problems({ CMS_DATABASE: 'postgres' }), /CMS_DATABASE/);
  assert.match(problems({ CMS_MEDIA_DIR: path.join(tmp, 'media') }), /CMS_MEDIA_DIR/, 'media outside the fixture refuses the start');
  assert.match(problems({ SOMETHING: 'https://x.public.blob.vercel-storage.com/a' }), /SOMETHING/, 'a Blob address in any variable refuses the start');
  assert.match(problems({ NEON_API_KEY: 'k' }), /NEON_API_KEY/, 'credential-like names refuse the start');
  assert.ok(!problems({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_fake' }).includes('vercel_blob_rw_fake'), 'problems name variables, never values');

  // Both fixture runners use this check before starting anything.
  // (Static check of the source: the check must come before the first process the runner starts.)
  for (const [runner, firstStart] of [['scripts/regression.mjs', 'await completed(launch('], ['scripts/serve-fixture.mjs', "run(['--import"]]) {
    const source = readFileSync(runner, 'utf8');
    const check = source.indexOf('const problems = fixtureEnvProblems(env, fixture);');
    const refuse = source.indexOf("console.error('Refusing to start.", check);
    const start = source.indexOf(firstStart);
    assert.ok(check > 0 && refuse > check && start > refuse, `${runner} refuses to start before it starts anything (check ${check}, refusal ${refuse}, first start ${start})`);
  }
  // And for real: with a credential-like variable in the environment, both runners refuse, start nothing and leave no
  // fixture directory behind. (Safe to run: the refusal comes before any server, database or browser.)
  // The planted name must not be listed in a real .env file, or the runner would blank it and really start.
  const planted = 'VERIFY_FIXTURE_NEON_KEY';
  assert.ok(!envFileNames().includes(planted), `${planted} must not appear in a .env file`);
  const fixtures = () => existsSync('test-results') ? readdirSync('test-results').filter(name => name.startsWith('regression-')).length : 0;
  // If a runner wrongly starts, it must not be left running: after 20 s it gets SIGTERM (so it can stop what it
  // started), then SIGKILL, and every process group it listed in its own CHECK_PGID_FILE is killed too.
  const pgids = path.join(tmp, 'runner.pgids');
  const killGroup = (pid, signal) => { try { process.kill(-pid, signal); } catch {} };
  const runRefusing = args => new Promise(resolve => {
    const child = spawn(process.execPath, args, { env: { ...process.env, [planted]: 'fake-for-test', CHECK_PGID_FILE: pgids }, detached: process.platform !== 'win32', windowsHide: true });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(async () => {
      if (process.platform === 'win32') { child.kill('SIGKILL'); return; }
      killGroup(child.pid, 'SIGTERM');
      await sleep(6000);
      killGroup(child.pid, 'SIGKILL');
      for (const group of existsSync(pgids) ? readFileSync(pgids, 'utf8').split('\n').map(Number).filter(Boolean) : []) killGroup(group, 'SIGKILL');
    }, 20000);
    // Wait for the output to be complete ('close'), with a fallback in case a leftover process holds the pipes.
    let exitStatus;
    const finish = () => { clearTimeout(timer); resolve({ status: exitStatus, stdout, stderr }); };
    child.once('exit', status => { exitStatus = status; setTimeout(finish, 3000).unref(); });
    child.once('close', status => { exitStatus ??= status; finish(); });
  });
  for (const args of [['scripts/regression.mjs'], ['scripts/serve-fixture.mjs', '0']]) {
    const before = fixtures();
    const run = await runRefusing(args);
    assert.equal(run.status, 1, `${args[0]} exits 1 when a credential is set`);
    assert.match(run.stderr, new RegExp(`Refusing to start\\. Offending variables: .*${planted}`), `${args[0]} names the variable`);
    assert.ok(!run.stderr.includes('fake-for-test') && !run.stdout.includes('fake-for-test'), `${args[0]} never prints the value`);
    assert.ok(!/Regression fixture:|Local:/.test(run.stdout), `${args[0]} started nothing`);
    assert.equal(fixtures(), before, `${args[0]} removed its fixture directory`);
  }
  console.log('PASS: fixture environment blanks Blob/Patreon/Vercel and .env* names, and refuses production databases, storage and credentials (names only); both runners refuse a planted credential before starting anything.');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
