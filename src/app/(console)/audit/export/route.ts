import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken, refreshSession } from '@/lib/auth/session';

/**
 * Proxies the audit CSV download.
 *
 * A browser navigating to a download link cannot send an Authorization header,
 * so pointing an <a> straight at the API returns a 401 and the user gets a
 * JSON error where they expected a file. This handler runs on the server,
 * where the httpOnly session cookie is readable, and streams the response back
 * with its filename intact.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';

const FORWARDED = ['q', 'action', 'resourceType', 'actorId', 'from', 'to'] as const;

async function fetchCsv(token: string | null, query: string) {
  return fetch(`${API_BASE}/admin/audit-logs/export${query ? `?${query}` : ''}`, {
    headers: {
      Accept: 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of FORWARDED) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();

  let response = await fetchCsv(await getAccessToken(), query);

  // The access token lives fifteen minutes; a console left open longer than
  // that should still produce a file rather than an error page.
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      return NextResponse.redirect(new URL('/login?next=/audit', request.url));
    }
    response = await fetchCsv(refreshed.accessToken, query);
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: 'The export could not be produced.' },
      { status: response.status },
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition': response.headers.get('content-disposition')
        ?? `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
