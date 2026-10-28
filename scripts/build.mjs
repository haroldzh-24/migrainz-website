import { spawnSync } from 'node:child_process';
import { buildEnv } from './build-env.mjs';
import { validateProductionEnv } from './production-env.mjs';

// Vercel snapshots dashboard variables into each deployment. Child-process
// fallbacks cannot configure deployed functions and must not mask missing env.
if (process.env.VERCEL === '1') validateProductionEnv();

// Environment (local placeholders, telemetry off): scripts/build-env.mjs.
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit', env: buildEnv() });
process.exit(result.status ?? 1);
