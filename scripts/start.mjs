import { spawn } from 'node:child_process';

if (process.env.CMS_DATABASE !== 'postgres' || !/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL || '')) {
  throw new Error('SQLite is DEVELOPMENT ONLY. Configure managed PostgreSQL before starting production.');
}
if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 32 || !process.env.CMS_MEDIA_DIR) {
  throw new Error('Production requires PAYLOAD_SECRET and a private CMS_MEDIA_DIR/storage configuration.');
}
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' },
});
child.on('exit', code => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
