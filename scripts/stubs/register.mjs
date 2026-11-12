// Test-only module hooks for scripts/verify-search-index.ts, so the server-only content helpers run outside Next:
// `server-only` (a Next build-time guard, not installed as a package) becomes an empty module and `next/headers`
// returns the fixture visitor's headers. Loaded with `node --import tsx --import ./scripts/stubs/register.mjs`.
import { registerHooks } from 'node:module';

const stubs = {
  'server-only': 'data:text/javascript,export {}',
  'next/headers': new URL('./next-headers.mjs', import.meta.url).href,
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in stubs) return { url: stubs[specifier], shortCircuit: true, format: 'module' };
    return next(specifier, context);
  },
});
