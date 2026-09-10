import { requiredProductionEnv, validateProductionEnv } from './production-env.mjs';

for (const name of requiredProductionEnv) {
  console.log(`${name}: ${process.env[name]?.trim() ? 'present' : 'MISSING'}`);
}
try {
  validateProductionEnv();
  console.log('PASS: production environment configuration. Database connectivity and migrations are not checked.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
