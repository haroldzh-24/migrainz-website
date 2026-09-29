import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { cookieOptions, exchangeCode, patreonConfig, privateHeaders, seal, sessionCookie, stateCookie, unseal, verifyIdentity } from '@/lib/patreon/server';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const config = patreonConfig();
  const finish = (status: string) => {
    const response = NextResponse.redirect(new URL(`/patreon?status=${status}`, config?.origin ?? request.url), { headers: privateHeaders });
    response.cookies.set(stateCookie, '', { ...cookieOptions, maxAge: 0 });
    return response;
  };
  if (!config) return finish('unavailable');
  const saved = unseal(request.cookies.get(stateCookie)?.value, 'state');
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  if (!saved || typeof saved.state !== 'string' || !state || Buffer.byteLength(state) !== Buffer.byteLength(saved.state)
    || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) return finish('invalid-state');
  if (request.nextUrl.searchParams.has('error') || !code || code.length > 4096) return finish('cancelled');
  try {
    const token = await exchangeCode(code, config);
    const viewer = await verifyIdentity(token.accessToken, config.campaignID);
    const response = finish('connected');
    response.cookies.set(sessionCookie, seal({ accessToken: token.accessToken, userID: viewer.userID, campaignID: config.campaignID, exp: Date.now() + token.maxAge * 1000 }, 'session'), { ...cookieOptions, maxAge: token.maxAge });
    return response;
  } catch { return finish('verification-failed'); }
}
