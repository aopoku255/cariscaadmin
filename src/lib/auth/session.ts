import 'server-only';
import { cookies } from 'next/headers';
import { apiRequest, ApiError } from '@/lib/api/client';
import type { SessionUser } from '@/lib/api/types';

/**
 * Tokens live in httpOnly cookies, never in localStorage.
 *
 * The access token is short-lived (15 minutes) and the refresh token rotates
 * on every use, so a stolen refresh token is detectable by the API's reuse
 * detection. Nothing token-shaped is ever exposed to client JavaScript, which
 * is what keeps an XSS bug from becoming an account takeover.
 */

const ACCESS = 'carisca_at';
const REFRESH = 'carisca_rt';

const secure = process.env.NODE_ENV === 'production';

const baseCookie = {
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
};

export interface Tokens { accessToken: string; refreshToken: string }

export async function setSessionCookies({ accessToken, refreshToken }: Tokens) {
  const jar = await cookies();
  // Access token expiry is enforced by the API; the cookie simply outlives a
  // page view. The refresh token is the one with a meaningful lifetime.
  jar.set(ACCESS, accessToken, { ...baseCookie, maxAge: 60 * 60 });
  jar.set(REFRESH, refreshToken, { ...baseCookie, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH)?.value ?? null;
}

/**
 * Exchanges the refresh token for a new pair.
 *
 * Returns null rather than throwing when the refresh token is dead — an
 * expired session is an ordinary state, not an error, and the caller should
 * treat it as "signed out".
 */
export async function refreshSession(): Promise<Tokens | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await apiRequest<Tokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    await setSessionCookies(data);
    return data;
  } catch {
    await clearSessionCookies();
    return null;
  }
}

/**
 * The current user, or null.
 *
 * Transparently refreshes once on a 401 so a participant filling in a long
 * registration form is not thrown out mid-way when their access token expires.
 */
export async function getSession(): Promise<SessionUser | null> {
  const token = await getAccessToken();

  if (token) {
    try {
      // /auth/me wraps the record: { user: { ... } }.
      const { data } = await apiRequest<{ user: SessionUser }>('/auth/me', { token });
      return data.user;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) return null;
    }
  }

  const refreshed = await refreshSession();
  if (!refreshed) return null;

  try {
    const { data } = await apiRequest<{ user: SessionUser }>('/auth/me', { token: refreshed.accessToken });
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Calls the API as the signed-in user, refreshing once if the token has just
 * expired. Every authenticated server action goes through this.
 */
export async function apiAsUser<T>(
  path: string,
  options: Parameters<typeof apiRequest>[1] = {},
): Promise<{ data: T; message: string | null }> {
  const token = await getAccessToken();

  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
  }

  const refreshed = await refreshSession();
  if (!refreshed) throw new ApiError(401, { message: 'Your session has expired. Please sign in again.' });

  return apiRequest<T>(path, { ...options, token: refreshed.accessToken });
}
