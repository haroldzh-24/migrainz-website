import path from 'node:path';

export const requiredProductionEnv = ['CMS_DATABASE', 'DATABASE_URL', 'CMS_MEDIA_DIR', 'PAYLOAD_SECRET'];

/** Validate without including configuration values in errors. */
export function validateProductionEnv(env = process.env) {
  const missing = requiredProductionEnv.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}. Set them for this Vercel project's Production environment and redeploy.`);
  if (env.CMS_DATABASE !== 'postgres') throw new Error('SQLite is DEVELOPMENT ONLY. Production requires managed PostgreSQL.');
  if (!/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL || '')) throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  if ((env.PAYLOAD_SECRET || '').length < 32) throw new Error('PAYLOAD_SECRET must contain at least 32 characters.');
  const directory = env.CMS_MEDIA_DIR || '';
  const publicDirectory = path.resolve('public');
  // This only compares paths; it must not bundle private media or the project.
  const resolvedDirectory = path.resolve(/* turbopackIgnore: true */ directory);
  if (!path.isAbsolute(directory) || resolvedDirectory === publicDirectory || resolvedDirectory.startsWith(publicDirectory + path.sep)) {
    throw new Error('CMS_MEDIA_DIR must be an absolute private directory outside public/.');
  }
}
