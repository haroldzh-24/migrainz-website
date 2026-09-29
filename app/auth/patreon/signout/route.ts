import { NextResponse, type NextRequest } from 'next/server';
import { cookieOptions, privateHeaders, sessionCookie, stateCookie } from '@/lib/patreon/server';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return new NextResponse('Forbidden', { status: 403, headers: privateHeaders });
  const response = NextResponse.redirect(new URL('/patreon?status=signed-out', request.url), { status: 303, headers: privateHeaders });
  response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(stateCookie, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
