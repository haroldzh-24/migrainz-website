// Test-only stand-in for `next/headers` (scripts/verify-search-index.ts): the request headers of the simulated visitor.
export async function headers() { return new Headers(globalThis.__fixtureRequestHeaders ?? {}); }
export async function cookies() { throw new Error('cookies() is not stubbed'); }
