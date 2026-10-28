import path from 'node:path';

// The environment `next build` runs with (scripts/build.mjs). A separate module so scripts/verify-security-headers.mjs
// can check both cases without starting a build.
// Vercel snapshots dashboard variables into each deployment. Child-process
// fallbacks cannot configure deployed functions and must not mask missing env.
// Locally: compile against the production PostgreSQL adapter. No database is contacted:
// CMS routes are dynamic. These build-only values are not production credentials.
// NEXT_TELEMETRY_DISABLED: `next build` otherwise sends usage telemetry to telemetry.nextjs.org (also on Vercel).
export function buildEnv(env = process.env) {
  const base = { ...env, NEXT_TELEMETRY_DISABLED: '1' };
  if (env.VERCEL === '1') return base;
  return { ...base, CMS_DATABASE: 'postgres',
    DATABASE_URL: env.DATABASE_URL?.startsWith('postgres') ? env.DATABASE_URL : 'postgres://build:build@127.0.0.1:1/build',
    CMS_MEDIA_DIR: env.CMS_MEDIA_DIR || path.resolve('.build-media-unused'),
    PAYLOAD_SECRET: env.PAYLOAD_SECRET || 'build-only-placeholder-not-a-runtime-secret',
  };
}
