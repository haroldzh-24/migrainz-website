// Unit checks for scripts/fixture-env.mjs (no server, no browser, no network). Run by `npm run check`.
//   node scripts/verify-fixture-env.mjs
// Fake values only; nothing here reads a real .env file.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BLANKED, fixtureEnv, fixtureEnvProblems } from './fixture-env.mjs';

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
  for (const runner of ['scripts/regression.mjs', 'scripts/serve-fixture.mjs']) {
    const source = readFileSync(runner, 'utf8');
    assert.match(source, /fixtureEnvProblems\(env, fixture\)/, `${runner} runs the fail-closed check`);
    assert.ok(source.indexOf('fixtureEnvProblems(env, fixture)') < source.indexOf('launch(') || !source.includes('launch('), `${runner} checks before launching`);
  }
  console.log('PASS: fixture environment blanks Blob/Patreon/Vercel and .env* names, and refuses production databases, storage and credentials (names only).');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
