import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { validateProductionEnv, requiredProductionEnv } from './production-env.mjs';

const fixture = { ...process.env, CMS_DATABASE: 'postgres', DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test', CMS_MEDIA_DIR: path.resolve('.build-media-unused'), PAYLOAD_SECRET: 'test-only-secret-with-at-least-32-characters' };
validateProductionEnv(fixture);
for (const name of requiredProductionEnv) {
  const env = { ...fixture, [name]: '' };
  assert.throws(() => validateProductionEnv(env), error => error.message.includes(name) && !error.message.includes(fixture.PAYLOAD_SECRET) && !error.message.includes(fixture.DATABASE_URL));
  const build = spawnSync(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8', env: { ...env, VERCEL: '1' } });
  assert.notEqual(build.status, 0);
  assert.match(build.stderr, new RegExp(`Missing production environment variables: ${name}`));
}

const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', 'await import("./payload.config.ts")'], {
  encoding: 'utf8', env: { ...fixture, NODE_ENV: 'production', CMS_DATABASE: 'sqlite', DATABASE_URL: 'file:unused.db' },
});
assert.notEqual(result.status, 0);
assert.match(result.stderr, /SQLite is DEVELOPMENT ONLY/);
const startup = spawnSync(process.execPath, ['scripts/start.mjs'], {
  encoding: 'utf8', env: { ...fixture, CMS_DATABASE: 'sqlite', DATABASE_URL: 'file:unused.db' },
});
assert.notEqual(startup.status, 0);
assert.match(startup.stderr, /SQLite is DEVELOPMENT ONLY/);
console.log('PASS: production configuration rejects SQLite; Vercel builds reject each missing variable without exposing values.');
