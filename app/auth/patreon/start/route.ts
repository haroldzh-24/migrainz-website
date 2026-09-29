import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { cookieOptions, patreonConfig, privateHeaders, seal, stateCookie } from '@/lib/patreon/server';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const config = patreonConfig();
  if (!config || request.nextUrl.origin !== config.origin) return NextResponse.redirect(new URL('/patreon?status=unavailable', request.url), { headers: privateHeaders });
  const state = randomBytes(32).toString('base64url');
  const url = new URL('https://www.patreon.com/oauth2/authorize');
  url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientID, redirect_uri: config.redirectURI, scope: 'identity identity.memberships', state }).toString();
  const response = NextResponse.redirect(url, { headers: privateHeaders });
  response.cookies.set(stateCookie, seal({ state, exp: Date.now() + 600000 }, 'state'), { ...cookieOptions, maxAge: 600 });
  return response;
}
