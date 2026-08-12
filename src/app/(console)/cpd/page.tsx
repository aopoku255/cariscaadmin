import Link from 'next/link';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { PageMeta } from '@/lib/api/types';
import { Badge, ButtonLink, EmptyState, Callout } from '@/components/ui';
import { eventDateRange } from '@/lib/format';
import { statusTone, statusLabel } from '../status';
import type { AdminCpdEvent } from './types';
import styles from '../admin.module.css';

export const metadata = { title: 'CPD events' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

const STATUSES = [
  'DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED',
  'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED',
] as const;

export default async function CpdListPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/cpd');
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  let events: AdminCpdEvent[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  try {
    const result = await apiAsUser<AdminCpdEvent[]>('/cpd/events', {
      query: { q: params.q, status: params.status, page, limit: 25 },
    });
    events = result.data ?? [];
    meta = (result as { meta?: PageMeta }).meta;
  } catch {
    failed = true;
  }

  const filtered = !!(params.q || params.status);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>CPD events</h1>
          <p className={styles.pageSub}>Create, configure and publish continuing professional development.</p>
        </div>
        {can(user, 'cpd.create') && (
          <div className={styles.pageActions}>
            <ButtonLink href="/cpd/new">Create a CPD</ButtonLink>
          </div>
        )}
      </header>

      {failed && (
        <Callout tone="danger" title="We could not load events">Try refreshing the page.</Callout>
      )}

      <form className={styles.filters} method="get">
        <div className={`${styles.filterField} ${styles.grow}`}>
          <label className={styles.filterLabel} htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={params.q ?? ''} placeholder="Title, venue or city"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }} />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={params.status ?? ''}
            style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </div>
        <button type="submit" style={{ padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
          Apply
        </button>
        {filtered && <Link href="/cpd" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {events.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nothing matches those filters' : 'No CPD events yet'}
          description={filtered
            ? 'Try a different search term, or clear the filters to see everything.'
            : 'Create one to start taking registrations. It stays a draft until you publish it.'}
          action={filtered
            ? <ButtonLink href="/cpd" variant="secondary">Clear filters</ButtonLink>
            : can(user, 'cpd.create')
              ? <ButtonLink href="/cpd/new">Create the first CPD</ButtonLink>
              : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Status</th>
                  <th scope="col">Dates</th>
                  <th scope="col">Format</th>
                  <th scope="col" className={styles.numeric}>Places</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/cpd/${e.id}`}>{e.title}</Link>
                      {e.location?.city && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle)' }}>{e.location.city}</div>}
                    </td>
                    <td><Badge tone={statusTone(e.status)}>{statusLabel[e.status]}</Badge></td>
                    <td className={styles.nowrap}>{eventDateRange(e.startAt, e.endAt, e.timezone)}</td>
                    <td className={styles.nowrap}>
                      {e.deliveryMode === 'HYBRID' ? 'In person + online' : e.deliveryMode === 'ONLINE' ? 'Online' : 'In person'}
                    </td>
                    <td className={styles.numeric}>{e.capacity ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pagerInfo}>
                Page {meta.page} of {meta.totalPages} · {meta.total} events
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {meta.hasPrevious && (
                  <ButtonLink size="sm" variant="secondary"
                    href={`/cpd?page=${meta.page - 1}${params.q ? `&q=${params.q}` : ''}${params.status ? `&status=${params.status}` : ''}`}>
                    ← Previous
                  </ButtonLink>
                )}
                {meta.hasNext && (
                  <ButtonLink size="sm" variant="secondary"
                    href={`/cpd?page=${meta.page + 1}${params.q ? `&q=${params.q}` : ''}${params.status ? `&status=${params.status}` : ''}`}>
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
