import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

// Payload's migrate:create disables database connection. This generates the
// production schema only; it does not transfer data or deploy a database.
fs.mkdirSync('migrations/postgres', { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/payload/bin.js', 'migrate:create', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, CMS_DATABASE: 'postgres',
    DATABASE_URL: 'postgres://schema:schema@127.0.0.1:1/schema' },
});
process.exit(result.status ?? 1);
