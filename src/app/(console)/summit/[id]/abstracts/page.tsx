import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import { Badge, EmptyState } from '@/components/ui';
import { timestamp } from '@/lib/format';
import type { AdminSummitEvent, AbstractSubmission } from '../../types';
import styles from '../../summit.module.css';
import admin from '../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abstract submissions' };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ status?: string }>;

const STATUS_TONE: Record<AbstractSubmission['status'], 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  SUBMITTED: 'neutral',
  UNDER_REVIEW: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'warning',
};

export default async function AbstractsQueuePage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { status } = await searchParams;
  const user = await requireStaff(`/summit/${id}/abstracts`);
  if (!can(user, 'abstract.view')) redirect(`/summit/${id}`);

  let event: AdminSummitEvent;
  try {
    const { data } = await apiAsUser<AdminSummitEvent>(`/summit/events/${id}`);
    event = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  let submissions: AbstractSubmission[] = [];
  try {
    const { data } = await apiAsUser<AbstractSubmission[]>(`/summit/events/${id}/abstracts`, {
      query: status ? { status } : undefined,
    });
    submissions = data ?? [];
  } catch { /* the page still renders, empty */ }

  const STATUSES: AbstractSubmission['status'][] = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

  return (
    <>
      <header className={admin.pageHead}>
        <div>
          <Link href={`/summit/${id}`} className={styles.back}>← {event.title}</Link>
          <h1 className={admin.pageTitle}>Abstract submissions</h1>
          <p className={admin.pageSub}>{submissions.length} in this view</p>
        </div>
      </header>

      <form className={admin.filters} method="get">
        <div className={admin.filterField}>
          <label className={admin.filterLabel} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ''}
            style={{ padding: '8px 12px', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius)', minHeight: 40 }}>
            <option value="">Any</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <button type="submit" style={{ padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', minHeight: 40 }}>
          Apply
        </button>
        {status && <Link href={`/summit/${id}/abstracts`} style={{ alignSelf: 'center', fontSize: 'var(--text-sm)' }}>Clear</Link>}
      </form>

      {submissions.length === 0 ? (
        <EmptyState title="No submissions" description="Nothing has been submitted yet, or nothing matches this filter." />
      ) : (
        <div className={admin.tableWrap}>
          <table className={admin.table}>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Author</th>
                <th scope="col">Track</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/summit/${id}/abstracts/${s.id}`}>{s.title}</Link></td>
                  <td>{s.author?.name ?? '—'}</td>
                  <td>{s.track?.name ?? '—'}</td>
                  <td><Badge tone={STATUS_TONE[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                  <td className={admin.nowrap}>{timestamp(s.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
