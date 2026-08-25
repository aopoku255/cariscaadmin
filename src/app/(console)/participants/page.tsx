import Link from 'next/link';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminUser, PageMeta } from '@/lib/api/types';
import { Badge, EmptyState, Callout, ButtonLink } from '@/components/ui';
import { userStatusLabel, userStatusTone, dateOnly, timestamp } from '@/lib/format';
import styles from '../admin.module.css';

export const metadata = { title: 'Participants' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

function withParams(base: Record<string, string | undefined>, overrides: Record<string, string | number>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return `/participants?${q.toString()}`;
}

/**
 * Everyone registered as a member of the public, not staff.
 *
 * Kept apart from /users rather than filtered from one shared list: this is
 * the list that actually grows — every registration adds to it — and it has
 * no roles or department to show, just who they are and where they are from.
 * `isStaff` is fixed to false here, never taken from the query string, so a
 * staff account can never surface on this page.
 */
export default async function ParticipantsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/participants');
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  let participants: AdminUser[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  try {
    const result = await apiAsUser<AdminUser[]>('/admin/users', {
      query: {
        q: params.q,
        status: params.status,
        isStaff: 'false',
        page,
        limit: 50,
        sort: 'created_at',
        order: 'desc',
      },
    });
    participants = result.data ?? [];
    meta = (result as { meta?: PageMeta }).meta;
  } catch {
    failed = true;
  }

  const filterState = { q: params.q, status: params.status };
  const filtered = Object.values(filterState).some(Boolean);

  const control = {
    padding: '8px 12px',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius)',
    minHeight: 40,
  } as const;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Participants</h1>
          <p className={styles.pageSub}>
            {meta ? `${meta.total} participant${meta.total === 1 ? '' : 's'}` : 'Everyone registered with CARISCA'}
          </p>
        </div>
        {can(user, 'users.create') && (
          <div className={styles.pageActions}>
            <ButtonLink href="/participants/new">Add a participant</ButtonLink>
          </div>
        )}
      </header>

      {failed && <Callout tone="danger" title="We could not load participants">Try refreshing.</Callout>}

      <form className={styles.filters} method="get">
        <div className={`${styles.filterField} ${styles.grow}`}>
          <label className={styles.filterLabel} htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={params.q ?? ''}
            placeholder="Name, email or organization"
            style={{ ...control, width: '100%' }} />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={params.status ?? ''} style={control}>
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <button type="submit" style={{
          padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
          background: 'var(--color-accent)', color: '#fff', fontWeight: 600,
          cursor: 'pointer', minHeight: 40,
        }}>
          Apply
        </button>
        {filtered && <Link href="/participants" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {participants.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nobody matches those filters' : 'No participants yet'}
          description={filtered
            ? 'Try a broader search, or clear the filters.'
            : 'Accounts appear here as people register for an event, or when you add one yourself.'}
          action={filtered
            ? <ButtonLink href="/participants" variant="secondary">Clear filters</ButtonLink>
            : can(user, 'users.create')
              ? <ButtonLink href="/participants/new">Add a participant</ButtonLink>
              : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Country</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last signed in</th>
                  <th scope="col">Added</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/participants/${p.id}`}><strong>{p.fullName}</strong></Link>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle)' }}>
                        {p.email}
                      </div>
                    </td>
                    <td>{p.organization ?? '-'}</td>
                    <td>{p.countryCode ?? '-'}</td>
                    <td><Badge tone={userStatusTone[p.status]}>{userStatusLabel[p.status]}</Badge></td>
                    <td className={styles.nowrap}>
                      {p.lastLoginAt ? timestamp(p.lastLoginAt) : 'Never'}
                    </td>
                    <td className={styles.nowrap}>{dateOnly(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pagerInfo}>
                Page {meta.page} of {meta.totalPages} · {meta.total} participants
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
