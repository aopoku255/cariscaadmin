import { NextResponse, type NextRequest } from 'next/server';

/**
 * Keeps the session alive.
 *
 * Refreshing has to happen here rather than during a page render: Next.js only
 * permits cookie writes in middleware, Server Actions and Route Handlers, and
 * a render that tries to write one throws
 * "Cookies can only be modified in a Server Action or Route Handler".
 *
 * It also has to persist. Refresh tokens rotate and the API revokes the whole
 * family on reuse, so refreshing without storing the new token would present a
 * spent token on the next request and sign the user out everywhere. Middleware
 * can set cookies on the response, so the rotation is recorded exactly once.
 *
 * The access cookie is given the same lifetime as the token it carries, which
 * makes its absence a reliable signal that a refresh is due.
 */

const ACCESS = 'carisca_at';
const REFRESH = 'carisca_rt';

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const secure = process.env.NODE_ENV === 'production';

export async function middleware(request: NextRequest) {
  const hasAccess = request.cookies.has(ACCESS);
  const refreshToken = request.cookies.get(REFRESH)?.value;

  // Either signed out, or the access token is still good.
  if (hasAccess || !refreshToken) return NextResponse.next();

  try {
    const response = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // The refresh token is spent or revoked: clear both so the app treats
      // this as signed out rather than retrying on every request.
      const out = NextResponse.next();
      out.cookies.delete(ACCESS);
      out.cookies.delete(REFRESH);
      return out;
    }

    const { data } = await response.json();
    const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };

    // Forwarded on this request too, so the page renders signed in rather
    // than waiting for the next navigation.
    request.cookies.set(ACCESS, data.accessToken);
    request.cookies.set(REFRESH, data.refreshToken);

    const out = NextResponse.next({ request: { headers: request.headers } });
    out.cookies.set(ACCESS, data.accessToken, { ...base, maxAge: 15 * 60 });
    out.cookies.set(REFRESH, data.refreshToken, { ...base, maxAge: 30 * 24 * 60 * 60 });
    return out;
  } catch {
    // The API being unreachable must not take the whole site down; pages
    // render signed out and recover on the next request.
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Everything except static assets and images, which carry no session.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
