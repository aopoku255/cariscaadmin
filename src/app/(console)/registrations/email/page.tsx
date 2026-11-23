import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { Callout } from '@/components/ui';
import { registrationStatusLabel } from '@/lib/format';
import type { AdminCpdEvent } from '../../cpd/types';
import { EmailForm } from './EmailForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Email participants' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  eventId?: string; reference?: string; status?: string; attendanceMode?: string; sent?: string;
}>;

export default async function EmailParticipantsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/registrations/email');
  if (!can(user, 'registration.email')) redirect('/registrations');
  const params = await searchParams;

  const events: { id: string; title: string }[] = [];
  for (const path of ['/cpd/events', '/summit/events']) {
    try {
      const { data } = await apiAsUser<AdminCpdEvent[]>(path, {
        query: { limit: 100, sort: 'start_at', order: 'desc' },
      });
      for (const e of data ?? []) events.push({ id: e.id, title: e.title });
    } catch { /* that module's events are simply not offered */ }
  }

  // How many people this would reach, so nobody sends blind.
  let recipients: number | null = null;
  let countFailed = false;
  if (params.eventId) {
    try {
      const { data } = await apiAsUser<{ recipients: number }>('/registrations/email', {
        method: 'POST',
        body: {
          eventId: Number(params.eventId),
          dryRun: true,
          ...(params.reference ? { references: [params.reference] } : {}),
          ...(params.status ? { statuses: [params.status] } : {}),
          ...(params.attendanceMode ? { attendanceMode: params.attendanceMode } : {}),
        },
      });
      recipients = data.recipients;
    } catch { countFailed = true; }
  }

  const base = new URLSearchParams();
  if (params.eventId) base.set('eventId', params.eventId);
  const filterLink = (key: string, value: string) => {
    const q = new URLSearchParams(base);
    if (value) q.set(key, value);
    if (key !== 'status' && params.status) q.set('status', params.status);
    if (key !== 'attendanceMode' && params.attendanceMode) q.set('attendanceMode', params.attendanceMode);
    return `/registrations/email?${q.toString()}`;
  };

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href={params.eventId ? `/registrations?eventId=${params.eventId}` : '/registrations'}
            style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Registrations
          </Link>
          <h1 className={styles.pageTitle}>Email participants</h1>
          <p className={styles.pageSub}>
            {params.reference
              ? `Writing to one participant (${params.reference}).`
              : 'Write to everyone registered for an event, or narrow it to a group.'}
          </p>
        </div>
      </header>

      {params.sent && (
        <Callout tone="success" title="On its way">
          Queued for {params.sent} {params.sent === '1' ? 'person' : 'people'}. Emails are sent in the
          background a few at a time, so a large group takes a few minutes to arrive.
        </Callout>
      )}

      {!params.reference && params.eventId && (
        <p style={{ fontSize: 'var(--text-sm)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <span>Status:</span>
          <Link href={filterLink('status', '')}>All</Link>
          {(['CONFIRMED', 'PENDING_PAYMENT', 'WAITLISTED'] as const).map((s) => (
            <Link key={s} href={filterLink('status', s)}
              style={params.status === s ? { fontWeight: 700 } : undefined}>
              {registrationStatusLabel[s]}
            </Link>
          ))}
          <span>· Attending:</span>
          <Link href={filterLink('attendanceMode', '')}>Any</Link>
          <Link href={filterLink('attendanceMode', 'IN_PERSON')}
            style={params.attendanceMode === 'IN_PERSON' ? { fontWeight: 700 } : undefined}>In person</Link>
          <Link href={filterLink('attendanceMode', 'VIRTUAL')}
            style={params.attendanceMode === 'VIRTUAL' ? { fontWeight: 700 } : undefined}>Online</Link>
        </p>
      )}

      <EmailForm
        events={events}
        eventId={params.eventId}
        reference={params.reference}
        status={params.status}
        attendanceMode={params.attendanceMode}
        recipients={recipients}
        countFailed={countFailed}
      />
    </>
  );
}
