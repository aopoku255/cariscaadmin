import Link from 'next/link';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminUser, Role, PageMeta } from '@/lib/api/types';
import { Badge, EmptyState, Callout, ButtonLink } from '@/components/ui';
import { userStatusLabel, userStatusTone, dateOnly, timestamp } from '@/lib/format';
import styles from '../admin.module.css';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string; status?: string; role?: string; isStaff?: string; page?: string;
}>;

function withParams(base: Record<string, string | undefined>, overrides: Record<string, string | number>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return `/users?${q.toString()}`;
}

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/users');
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  let users: AdminUser[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  try {
    const result = await apiAsUser<AdminUser[]>('/admin/users', {
      query: {
        q: params.q,
        status: params.status,
        role: params.role,
        isStaff: params.isStaff,
        page,
        limit: 50,
        sort: 'created_at',
        order: 'desc',
      },
    });
    users = result.data ?? [];
    meta = (result as { meta?: PageMeta }).meta;
  } catch {
    failed = true;
  }

  // Powers the role filter. Only visible to people who can read RBAC; for
  // everyone else the filter degrades to the other three.
  let roles: Role[] = [];
  if (can(user, 'rbac.view')) {
    try {
      const { data } = await apiAsUser<Role[]>('/admin/roles');
      roles = data ?? [];
    } catch { /* the filter is simply not offered */ }
  }

  const filterState = {
    q: params.q, status: params.status, role: params.role, isStaff: params.isStaff,
  };
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
          <h1 className={styles.pageTitle}>Users</h1>
          <p className={styles.pageSub}>
            {meta ? `${meta.total} account${meta.total === 1 ? '' : 's'}` : 'Everyone with a CARISCA account'}
          </p>
        </div>
        {can(user, 'users.create') && (
          <div className={styles.pageActions}>
            <ButtonLink href="/users/new">Add a user</ButtonLink>
          </div>
        )}
      </header>

      {failed && <Callout tone="danger" title="We could not load users">Try refreshing.</Callout>}

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

        {roles.length > 0 && (
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue={params.role ?? ''} style={control}>
              <option value="">Any</option>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </div>
        )}

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="isStaff">Kind</label>
          <select id="isStaff" name="isStaff" defaultValue={params.isStaff ?? ''} style={control}>
            <option value="">Everyone</option>
            <option value="true">Staff</option>
            <option value="false">Participants</option>
          </select>
        </div>

        <button type="submit" style={{
          padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
          background: 'var(--color-accent)', color: '#fff', fontWeight: 600,
          cursor: 'pointer', minHeight: 40,
        }}>
          Apply
        </button>
        {filtered && <Link href="/users" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {users.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nobody matches those filters' : 'No accounts yet'}
          description={filtered
            ? 'Try a broader search, or clear the filters.'
            : 'Accounts appear here as people register, and when you add them.'}
          action={filtered
            ? <ButtonLink href="/users" variant="secondary">Clear filters</ButtonLink>
            : can(user, 'users.create')
              ? <ButtonLink href="/users/new">Add a user</ButtonLink>
              : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Roles</th>
                  <th scope="col">Department</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last signed in</th>
                  <th scope="col">Added</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/users/${u.id}`}><strong>{u.fullName}</strong></Link>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle)' }}>
                        {u.email}
                      </div>
                    </td>
                    <td>
                      {u.roles?.length
                        ? u.roles.map((r) => r.name).join(', ')
                        : <span style={{ color: 'var(--color-text-subtle)' }}>None</span>}
                    </td>
                    <td>{u.department?.name ?? '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Badge tone={userStatusTone[u.status]}>{userStatusLabel[u.status]}</Badge>
                        {u.isStaff && <Badge tone="info">Staff</Badge>}
                      </div>
                    </td>
                    <td className={styles.nowrap}>
                      {u.lastLoginAt ? timestamp(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className={styles.nowrap}>{dateOnly(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pagerInfo}>
                Page {meta.page} of {meta.totalPages} · {meta.total} accounts
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
