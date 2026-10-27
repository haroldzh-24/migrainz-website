// Environment for local fixture servers (the regression suite and the review server): a throwaway SQLite database
// and media folder inside the fixture directory and a random Payload secret. `next dev` fills only *undefined*
// variables from .env.local, so every Blob/Patreon/OIDC/Vercel variable and every variable named in a .env* file is
// set to an empty string here; that keeps production credentials out of fixture runs. fixtureEnvProblems() is the
// fail-closed check every caller runs before starting anything; it reports variable names, never values.
// Tested by scripts/verify-fixture-env.mjs.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BLANKED = ['VERCEL', 'VERCEL_ENV', 'VERCEL_OIDC_TOKEN', 'BLOB_READ_WRITE_TOKEN', 'BLOB_STORE_ID', 'BLOB_WEBHOOK_PUBLIC_KEY',
  'PATREON_CLIENT_ID', 'PATREON_CLIENT_SECRET', 'PATREON_REDIRECT_URI', 'PATREON_CAMPAIGN_ID', 'PATREON_URL'];
export const ENV_FILES = ['.env', '.env.local', '.env.vercel.local', '.env.development', '.env.development.local'];

// Names only: values are never read into memory beyond the line being matched.
export function envFileNames(dir = process.cwd()) {
  return ENV_FILES.flatMap(file => {
    const full = path.join(dir, file);
    return existsSync(full) ? readFileSync(full, 'utf8').split('\n')
      .map(line => line.trim().replace(/^export /, '').match(/^([A-Za-z_][A-Za-z0-9_]*) *=/)?.[1]).filter(Boolean) : [];
  });
}

export function fixtureEnv(fixture, { base = process.env, dir = process.cwd(), extra = {} } = {}) {
  return {
    ...base,
    ...Object.fromEntries([...new Set([...BLANKED, ...envFileNames(dir)])].map(name => [name, ''])),
    NODE_ENV: 'development',
    CMS_DATABASE: 'sqlite',
    DATABASE_URL: pathToFileURL(path.join(fixture, 'content.db')).href,
    CMS_MEDIA_DIR: path.join(fixture, 'media'),
    PAYLOAD_SECRET: randomBytes(32).toString('hex'),
    BOOT_ONLY: '0',
    DESKTOP_TEST_FIXTURE: fixture,
    ...extra,
  };
}

export function fixtureEnvProblems(env, fixture) {
  const inside = value => path.resolve(value).startsWith(path.resolve(fixture) + path.sep);
  const problems = [];
  if (!String(env.DATABASE_URL).startsWith('file:') || !inside(fileURLToPath(env.DATABASE_URL))) problems.push('DATABASE_URL (not inside the fixture directory)');
  if (env.CMS_DATABASE !== 'sqlite') problems.push('CMS_DATABASE (not sqlite)');
  if (!env.CMS_MEDIA_DIR || !inside(env.CMS_MEDIA_DIR)) problems.push('CMS_MEDIA_DIR (not inside the fixture directory)');
  for (const name of BLANKED) if (env[name]) problems.push(name + ' (must be blank for fixtures)');
  for (const [name, value] of Object.entries(env)) {
    if (name === 'DATABASE_URL' || !value) continue;
    if (/^postgres(ql)?:[/][/]/i.test(value) || /neon[.]tech|supabase[.]co|vercel-storage[.]com|blob[.]vercel/i.test(value)) problems.push(name + ' (remote database or storage address)');
    else if (/(BLOB|PATREON|OIDC|POSTGRES|NEON|SUPABASE).*(TOKEN|SECRET|URL|KEY|ID)$/i.test(name)) problems.push(name + ' (credential-like variable is set)');
  }
  return [...new Set(problems)];
}
