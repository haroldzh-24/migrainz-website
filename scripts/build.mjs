import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Compile against the production PostgreSQL adapter. No database is contacted:
// CMS routes are dynamic. These build-only values are not production credentials.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, CMS_DATABASE: 'postgres',
    DATABASE_URL: process.env.DATABASE_URL?.startsWith('postgres') ? process.env.DATABASE_URL : 'postgres://build:build@127.0.0.1:1/build',
    CMS_MEDIA_DIR: process.env.CMS_MEDIA_DIR || path.resolve('.build-media-unused'),
    PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'build-only-placeholder-not-a-runtime-secret',
  },
});
process.exit(result.status ?? 1);
