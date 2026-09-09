import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', 'await import("./payload.config.ts")'], {
  encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production', CMS_DATABASE: 'sqlite', DATABASE_URL: 'file:unused.db' },
});
assert.notEqual(result.status, 0);
assert.match(result.stderr, /SQLite is DEVELOPMENT ONLY/);
const startup = spawnSync(process.execPath, ['scripts/start.mjs'], {
  encoding: 'utf8', env: { ...process.env, CMS_DATABASE: 'sqlite', DATABASE_URL: 'file:unused.db' },
});
assert.notEqual(startup.status, 0);
assert.match(startup.stderr, /SQLite is DEVELOPMENT ONLY/);
console.log('PASS: production configuration rejects SQLite before connecting.');
