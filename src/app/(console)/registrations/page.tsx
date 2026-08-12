import Link from 'next/link';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { Registration, PageMeta } from '@/lib/api/types';
import { Badge, EmptyState, Callout, ButtonLink } from '@/components/ui';
import { registrationStatusLabel, registrationTone, money } from '@/lib/format';
import type { AdminCpdEvent } from '../cpd/types';
import styles from '../admin.module.css';

export const metadata = { title: 'Registrations' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  eventId?: string; q?: string; status?: string;
  attendanceMode?: string; page?: string;
}>;

const STATUSES = [
  'CONFIRMED', 'PENDING_PAYMENT', 'WAITLISTED', 'REQUIRES_REVIEW', 'CANCELLED', 'REFUNDED',
] as const;

/** Preserves the current filters when building a link. */
function withParams(base: Record<string, string | undefined>, overrides: Record<string, string | number>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return `/registrations?${q.toString()}`;
}

export default async function RegistrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/registrations');
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  let registrations: Registration[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  try {
    const result = await apiAsUser<Registration[]>('/registrations', {
      query: {
        eventId: params.eventId,
        q: params.q,
        status: params.status,
        attendanceMode: params.attendanceMode,
        page,
        limit: 50,
      },
    });
    registrations = result.data ?? [];
    meta = (result as { meta?: PageMeta }).meta;
  } catch {
    failed = true;
  }

  // The event picker; also tells us which event an export would cover.
  let events: AdminCpdEvent[] = [];
  try {
    const { data } = await apiAsUser<AdminCpdEvent[]>('/cpd/events', {
      query: { limit: 100, sort: 'start_at', order: 'desc' },
    });
    events = data ?? [];
  } catch { /* the filter degrades to free text */ }

  const filterState = {
    eventId: params.eventId, q: params.q,
    status: params.status, attendanceMode: params.attendanceMode,
  };
  const filtered = Object.values(filterState).some(Boolean);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Registrations</h1>
          <p className={styles.pageSub}>
            {meta ? `${meta.total} matching` : 'Everyone signed up across CPD events'}
          </p>
        </div>
        {can(user, 'cpd.registration.export') && params.eventId && (
          <div className={styles.pageActions}>
            {/*
              A plain link, not fetch: the browser handles the download and the
              Content-Disposition header, and the API audits who took a copy.
            */}
            <a
              className="download"
              href={`${process.env.NEXT_PUBLIC_API_URL}/registrations/export?eventId=${params.eventId}${params.status ? `&status=${params.status}` : ''}`}
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '9px 18px',
                borderRadius: 'var(--radius)', border: '1px solid var(--color-accent)',
                color: 'var(--color-accent-text)', textDecoration: 'none', fontWeight: 600,
              }}
            >
              Export to CSV
            </a>
          </div>
        )}
      </header>

      {failed && <Callout tone="danger" title="We could not load registrations">Try refreshing.</Callout>}

      {can(user, 'cpd.registration.export') && !params.eventId && (
        <Callout tone="info" title="Pick an event to export">
          Exports cover one event at a time. Choose an event below and the export
          button appears.
        </Callout>
      )}

      <form className={styles.filters} method="get">
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="eventId">Event</label>
          <select id="eventId" name="eventId" defaultValue={params.eventId ?? ''}
            style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40, maxWidth: 280 }}>
            <option value="">All events</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        <div className={`${styles.filterField} ${styles.grow}`}>
          <label className={styles.filterLabel} htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={params.q ?? ''} placeholder="Name, email or organization"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }} />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={params.status ?? ''}
            style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{registrationStatusLabel[s]}</option>)}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="attendanceMode">Attending</label>
          <select id="attendanceMode" name="attendanceMode" defaultValue={params.attendanceMode ?? ''}
            style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }}>
            <option value="">Either</option>
            <option value="IN_PERSON">In person</option>
            <option value="VIRTUAL">Online</option>
          </select>
        </div>

        <button type="submit" style={{ padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
          Apply
        </button>
        {filtered && <Link href="/registrations" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {registrations.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nothing matches those filters' : 'No registrations yet'}
          description={filtered
            ? 'Try a broader search, or clear the filters.'
            : 'Once people start signing up they will appear here.'}
          action={filtered
            ? <ButtonLink href="/registrations" variant="secondary">Clear filters</ButtonLink>
            : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Participant</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Event</th>
                  <th scope="col">Status</th>
                  <th scope="col">Attending</th>
                  <th scope="col" className={styles.numeric}>Fee</th>
                  <th scope="col">Reference</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.participant?.name ?? '—'}</strong>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle)' }}>
                        {r.participant?.email}
                      </div>
                    </td>
                    <td>{r.participant?.organization ?? '—'}</td>
                    <td>{r.event?.title ?? '—'}</td>
                    <td><Badge tone={registrationTone[r.status]}>{registrationStatusLabel[r.status]}</Badge></td>
                    <td className={styles.nowrap}>{r.attendanceMode === 'VIRTUAL' ? 'Online' : 'In person'}</td>
                    <td className={styles.numeric}>
                      {!r.amount ? '—' : r.amount.amountMinor === 0 ? 'Free' : money(r.amount)}
                    </td>
                    <td className={styles.mono}>{r.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pagerInfo}>
                Page {meta.page} of {meta.totalPages} · {meta.total} registrations
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {meta.hasPrevious && (
                  <ButtonLink size="sm" variant="secondary" href={withParams(filterState, { page: meta.page - 1 })}>
                    ← Previous
                  </ButtonLink>
                )}
                {meta.hasNext && (
                  <ButtonLink size="sm" variant="secondary" href={withParams(filterState, { page: meta.page + 1 })}>
                    Next →
                  </ButtonLink>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
