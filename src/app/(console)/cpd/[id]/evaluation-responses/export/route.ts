import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken, refreshSession } from '@/lib/auth/session';

/**
 * Proxies the survey-responses CSV download — same reasoning as
 * `registrations/export/route.ts`: a browser navigating to a download link
 * cannot send an Authorization header, so this runs on the server, where the
 * httpOnly session cookie is readable.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';

async function fetchCsv(token: string | null, eventId: string) {
  return fetch(`${API_BASE}/cpd/events/${eventId}/evaluation-responses/export`, {
    headers: {
      Accept: 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let response = await fetchCsv(await getAccessToken(), id);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      return NextResponse.redirect(new URL(`/login?next=/cpd/${id}/evaluation-responses`, request.url));
    }
    response = await fetchCsv(refreshed.accessToken, id);
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
        ?? `attachment; filename="survey-responses-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
