import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { cookieValue, sessionCookie, viewerAccessFromHeaders } from './server';

// Never forward Payload staff cookies or client-provided entitlement headers into
// public rendering. Payload independently verifies this encrypted session.
export const contentRequest = cache(async () => {
  const incoming = await headers();
  const token = cookieValue(incoming, sessionCookie);
  return { headers: new Headers(token ? { cookie: `${sessionCookie}=${token}` } : {}) };
});
export const viewerAccess = cache(async () => viewerAccessFromHeaders((await contentRequest()).headers));
