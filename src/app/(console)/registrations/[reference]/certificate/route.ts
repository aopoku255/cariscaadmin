import { NextResponse, type NextRequest } from 'next/server';
import { getAccessToken, refreshSession } from '@/lib/auth/session';

/**
 * Proxies a participant's certificate for staff. A browser navigating to a
 * download cannot send the bearer token, so this runs on the server where the
 * httpOnly session cookie is readable. The API decides whether this person may
 * issue one by hand (certificate.generate) and audits it.
 */

const API_BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';

type Params = Promise<{ reference: string }>;

async function fetchCertificate(token: string | null, reference: string, format: string) {
  return fetch(
    `${API_BASE}/registrations/${encodeURIComponent(reference)}/certificate?format=${format}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' },
  );
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { reference } = await params;
  const format = request.nextUrl.searchParams.get('format') === 'png' ? 'png' : 'pdf';

  let response = await fetchCertificate(await getAccessToken(), reference, format);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      return NextResponse.redirect(new URL(`/login?next=/registrations/${reference}`, request.url));
    }
    response = await fetchCertificate(refreshed.accessToken, reference, format);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return NextResponse.json(
      { message: body?.message ?? 'The certificate could not be produced.' },
      { status: response.status },
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition': response.headers.get('content-disposition')
        ?? `attachment; filename="certificate-${reference}.${format}"`,
      'Cache-Control': 'no-store',
    },
  });
}
