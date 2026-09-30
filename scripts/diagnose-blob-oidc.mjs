// Read-only HTTPS/OIDC diagnostic. No uploads, deletes, recovery, DB or env writes.
// node --env-file=.env.local scripts/diagnose-blob-oidc.mjs
import { channel } from 'node:diagnostics_channel';
const storeId = 'store_oQfoWmWeYUIujVns';
const sensitive = Object.entries(process.env)
  .filter(([name, value]) => /TOKEN|SECRET|PASSWORD|PGPASSWORD|COOKIE|AUTH|KEY|DATABASE_URL/i.test(name) && value?.length >= 6)
  .map(([, value]) => value);
function safe(value) {
  let text = String(value ?? '');
  for (const secret of sensitive) text = text.split(secret).join('[REDACTED]');
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED JWT]')
    .replace(/(?:authorization|cookie|set-cookie)\s*[:=][^\r\n]*/gi, '[REDACTED HEADER]')
    .replace(/https?:\/\/[^\s'"<>]+/g, url => {
      try { const parsed = new URL(url); return parsed.origin + parsed.pathname; }
      catch { return '[REDACTED URL]'; }
    }).slice(0, 1500);
}
function errorDetails(error, depth = 0) {
  if (!error || depth > 5) return undefined;
  return {
    name: safe(error.name), message: safe(error.message), code: safe(error.code),
    ...(typeof error.status === 'number' ? { status: error.status, statusText: safe(error.statusText) } : {}),
    cause: errorDetails(error.cause, depth + 1) ?? null,
    ...(Array.isArray(error.errors) ? { errors: error.errors.map(e => errorDetails(e, depth + 1)) } : {}),
  };
}
// The Blob SDK imports its own Undici fetch. Observe only its safe transport
// fields, not the request object (which contains Authorization headers).
channel('undici:request:error').subscribe(({ request, error }) => {
  console.log(JSON.stringify({ transport: 'undici', origin: safe(request.origin), error: errorDetails(error) }));
});
channel('undici:request:headers').subscribe(({ request, response }) => {
  console.log(JSON.stringify({ transport: 'undici', origin: safe(request.origin), status: response.statusCode, statusText: safe(response.statusText) }));
});
const originalFetch = globalThis.fetch;
// Observe fetch failures before the SDK wraps them. Never inspect/log headers,
// bodies, response bodies, token claims or full request URLs.
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  try {
    const response = await originalFetch(input, init);
    console.log(JSON.stringify({ transport: 'fetch', origin: url.origin, status: response.status, statusText: safe(response.statusText) }));
    return response;
  } catch (error) {
    console.log(JSON.stringify({ transport: 'fetch', origin: url.origin, error: errorDetails(error) }));
    throw error;
  }
};
async function attempt(label, operation) {
  console.log(label);
  try { await operation(); }
  catch (error) { console.log(JSON.stringify({ label, error: errorDetails(error) })); }
}
console.log(JSON.stringify({ node: process.version, oidcPresent: Boolean(process.env.VERCEL_OIDC_TOKEN?.trim()),
  configuredStorePresent: Boolean(process.env.BLOB_STORE_ID?.trim()),
  explicitStore: storeId, tlsVerificationDisabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
  proxyVariableNames: Object.keys(process.env).filter(name => /^(HTTPS?_PROXY|ALL_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|NODE_USE_SYSTEM_CA|NODE_USE_ENV_PROXY)$/i.test(name)) }));
for (const url of ['https://oqfowmweyuiujvns.private.blob.vercel-storage.com/', 'https://vercel.com/api/blob']) {
  await attempt(`Unauthenticated HTTPS: ${url}`, async () => {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    // Drain without displaying the body. Cancelling it would emit an expected
    // Undici AbortError and obscure the connectivity result we're diagnosing.
    if (response.body) for await (const _chunk of response.body) { /* discard */ }
  });
}
if (process.env.VERCEL_OIDC_TOKEN?.trim()) {
  const { head, list } = await import('@vercel/blob');
  const auth = { oidcToken: process.env.VERCEL_OIDC_TOKEN.trim(), storeId };
  await attempt('SDK list (one object maximum; no object details printed)', async () => {
    await list({ ...auth, limit: 1, abortSignal: AbortSignal.timeout(15000) });
    console.log('SDK list succeeded');
  });
  await attempt('SDK head (existing Media filename; no object details printed)', async () => {
    await head('media/01.svg', { ...auth, abortSignal: AbortSignal.timeout(15000) });
    console.log('SDK head succeeded');
  });
}
