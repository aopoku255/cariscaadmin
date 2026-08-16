import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { AuditFacets, AuditLogEntry, PageMeta } from '@/lib/api/types';
import { EmptyState, Callout, ButtonLink } from '@/components/ui';
import { timestamp, auditActionLabel } from '@/lib/format';
import { AuditDetail } from './AuditDetail';
import styles from '../admin.module.css';
import audit from './audit.module.css';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string; action?: string; resourceType?: string; actorId?: string;
  from?: string; to?: string; page?: string;
}>;

function withParams(base: Record<string, string | undefined>, overrides: Record<string, string | number>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  return `/audit?${q.toString()}`;
}

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/audit');
  if (!can(user, 'audit.view')) redirect('/');

  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;

  const filterState = {
    q: params.q,
    action: params.action,
    resourceType: params.resourceType,
    actorId: params.actorId,
    from: params.from,
    to: params.to,
  };

  let entries: AuditLogEntry[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  try {
    const result = await apiAsUser<AuditLogEntry[]>('/admin/audit-logs', {
      query: { ...filterState, page, limit: 50 },
    });
    entries = result.data ?? [];
    meta = (result as { meta?: PageMeta }).meta;
  } catch {
    failed = true;
  }

  // Read from the log itself, so a filter can never be blind to an action a
  // newly added module started recording.
  let facets: AuditFacets = { actions: [], resourceTypes: [], actors: [] };
  try {
    const { data } = await apiAsUser<AuditFacets>('/admin/audit-logs/facets');
    if (data) facets = data;
  } catch { /* the dropdowns fall back to free-text search */ }

  const filtered = Object.values(filterState).some(Boolean);
  const canExport = can(user, 'reports.export');

  const control = {
    padding: '8px 12px',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius)',
    minHeight: 40,
  } as const;

  const exportQuery = new URLSearchParams(
    Object.entries(filterState).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Audit log</h1>
          <p className={styles.pageSub}>
            {meta ? `${meta.total} recorded action${meta.total === 1 ? '' : 's'}` : 'Every administrative action, append-only'}
          </p>
        </div>
        {canExport && entries.length > 0 && (
          <div className={styles.pageActions}>
            {/*
              Through our own route handler rather than straight at the API: a
              browser navigating to a download cannot send the bearer token, so
              a direct link would return 401. The API still records who took a
              copy. Carries the current filters, so the file matches the table.
            */}
            <a
              className="download"
              href={`/audit/export${exportQuery ? `?${exportQuery}` : ''}`}
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

      {failed && <Callout tone="danger" title="We could not load the audit log">Try refreshing.</Callout>}

      <form className={styles.filters} method="get">
        <div className={`${styles.filterField} ${styles.grow}`}>
          <label className={styles.filterLabel} htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={params.q ?? ''}
            placeholder="Action, resource or who did it"
            style={{ ...control, width: '100%' }} />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="action">Action</label>
          <select id="action" name="action" defaultValue={params.action ?? ''}
            style={{ ...control, maxWidth: 220 }}>
            <option value="">Any</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>{auditActionLabel(a)}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="resourceType">Resource</label>
          <select id="resourceType" name="resourceType" defaultValue={params.resourceType ?? ''} style={control}>
            <option value="">Any</option>
            {facets.resourceTypes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="actorId">Who</label>
          <select id="actorId" name="actorId" defaultValue={params.actorId ?? ''}
            style={{ ...control, maxWidth: 220 }}>
            <option value="">Anyone</option>
            {facets.actors.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
          </select>
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={params.from ?? ''} style={control} />
        </div>

        <div className={styles.filterField}>
          <label className={styles.filterLabel} htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={params.to ?? ''} style={control} />
        </div>

        <button type="submit" style={{
          padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none',
          background: 'var(--color-accent)', color: '#fff', fontWeight: 600,
          cursor: 'pointer', minHeight: 40,
        }}>
          Apply
        </button>
        {filtered && <Link href="/audit" style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title={filtered ? 'Nothing matches those filters' : 'Nothing recorded yet'}
          description={filtered
            ? 'Try a wider date range, or clear the filters.'
            : 'Administrative actions are recorded here as they happen.'}
          action={filtered
            ? <ButtonLink href="/audit" variant="secondary">Clear filters</ButtonLink>
            : undefined}
        />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Who</th>
                  <th scope="col">What changed</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={styles.nowrap}>{timestamp(entry.createdAt)}</td>
                    <td>
                      <span className={audit.actionCell}>
                        <strong>{auditActionLabel(entry.action)}</strong>
                        <span className={audit.actionKey}>{entry.action}</span>
                      </span>
                    </td>
                    <td>
                      <span className={audit.resource}>
                        <span>{entry.resourceType}</span>
                        {entry.resourceId && <span className={audit.resourceId}>#{entry.resourceId}</span>}
                      </span>
                    </td>
                    <td>
                      {entry.actor.name ?? entry.actor.email ?? 'System'}
                      {entry.actor.name && entry.actor.email && (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-subtle)' }}>
                          {entry.actor.email}
                        </div>
                      )}
                    </td>
                    <td><AuditDetail entry={entry} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <nav className={styles.pager} aria-label="Pagination">
              <span className={styles.pagerInfo}>
                Page {meta.page} of {meta.totalPages} · {meta.total} entries
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
