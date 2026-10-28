// Security headers for every response (roadmap M3). next.config.mjs serves them through `headers()`;
// scripts/verify-security-headers.mjs checks this module and the built routes manifest, and
// scripts/verify-site-health.mjs checks the served headers and browser CSP reports on the dev fixture.
//
// 3.1 Enforced: nosniff, referrer policy, framing by this site only, no camera/microphone/location/payment/USB.
// 3.2 Content-Security-Policy in REPORT-ONLY mode: nothing is blocked; violations only show in the browser console.
//     There is no reporting endpoint (no service, no cost). Enforcing it is roadmap 4.6 (production lane).
//
// Next applies these before a route handler runs, and a handler cannot replace them: Next only adds a handler's
// header when it is not already set (Vary and Set-Cookie aside). A route that needs another value gets its own rule
// below; for the same header, the LAST matching rule wins. (Different header names don't clash: the SVG media route's
// enforced `Content-Security-Policy: script-src 'none'` stays as it is next to the report-only policy.)

// Payload admin loads its JSON field editor (Monaco) from this CDN folder; only this version's folder is allowed.
// Keep in step with @payloadcms/ui (scripts/verify-security-headers.mjs fails when they differ, e.g. after an upgrade).
export const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/';

export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

export function contentSecurityPolicy({ dev = false, admin = false } = {}) {
  const directives = {
    'default-src': ["'self'"],
    // 'unsafe-inline': Next's inline bootstrap scripts need it without per-request nonces (nonces need a proxy).
    // 'unsafe-eval' only in development (React's dev tooling; Next's CSP guide).
    'script-src': ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...(admin ? [MONACO_CDN] : [])],
    'style-src': ["'self'", "'unsafe-inline'", ...(admin ? [MONACO_CDN] : [])],
    // Site: images and media come only from this origin (/api/media/file). Admin: upload previews use blob: and data:.
    'img-src': ["'self'", ...(admin ? ['data:', 'blob:'] : [])],
    'font-src': ["'self'", ...(admin ? [MONACO_CDN] : [])],
    'media-src': ["'self'", ...(admin ? ['blob:'] : [])],
    // ws: only in development (hot reload).
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    ...(admin ? { 'worker-src': ["'self'", 'blob:'] } : {}),
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };
  return Object.entries(directives).map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

export function securityHeaders({ dev = false } = {}) {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
        { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy({ dev }) },
      ],
    },
    // Payload admin (also matches /admin itself).
    { source: '/admin/:path*', headers: [{ key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy({ dev, admin: true }) }] },
    // Patreon sign-in routes keep their stricter referrer policy (lib/patreon/server.ts privateHeaders).
    { source: '/auth/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
  ];
}
