import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import { Badge, Card } from '@/components/ui';
import { timestamp } from '@/lib/format';
import type { AbstractSubmission } from '../../../types';
import { AbstractActions } from './AbstractActions';
import styles from '../../../summit.module.css';
import admin from '../../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Submission' };

type Params = Promise<{ id: string; abstractId: string }>;

const EDITABLE = ['SUBMITTED', 'UNDER_REVIEW'];

export default async function AbstractDetailPage({ params }: { params: Params }) {
  const { id, abstractId } = await params;
  const user = await requireStaff(`/summit/${id}/abstracts/${abstractId}`);
  if (!can(user, 'abstract.view')) redirect(`/summit/${id}`);

  let submission: AbstractSubmission;
  try {
    const { data } = await apiAsUser<AbstractSubmission>(`/summit/events/${id}/abstracts/${abstractId}`);
    submission = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  return (
    <>
      <header className={admin.pageHead}>
        <div>
          <Link href={`/summit/${id}/abstracts`} className={styles.back}>← Abstract submissions</Link>
          <div className={styles.titleRow}>
            <h1 className={admin.pageTitle}>{submission.title}</h1>
            <Badge tone="neutral">{submission.status.replace('_', ' ')}</Badge>
          </div>
          <p className={admin.pageSub}>
            {submission.reference} · submitted {timestamp(submission.submittedAt)}
          </p>
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.mainCol}>
          <Card>
            <h2 className={styles.cardTitle}>Abstract</h2>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{submission.abstractText}</p>
          </Card>

          {submission.coAuthors.length > 0 && (
            <Card>
              <h2 className={styles.cardTitle}>Co-authors</h2>
              <ul className={styles.breakdown}>
                {submission.coAuthors.map((a) => (
                  <li key={a.name}>
                    <span>{a.name}{a.affiliation ? ` — ${a.affiliation}` : ''}</span>
                    <span>{a.email ?? ''}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {submission.reviewNotes && (
            <Card>
              <h2 className={styles.cardTitle}>Review notes</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{submission.reviewNotes}</p>
            </Card>
          )}
        </div>

        <aside className={styles.sideCol}>
          <Card>
            <h2 className={styles.cardTitle}>Decide</h2>
            <AbstractActions
              eventId={id}
              abstractId={abstractId}
              canClaim={can(user, 'abstract.review')}
              canDecide={can(user, 'abstract.decide')}
              editable={EDITABLE.includes(submission.status)}
            />
          </Card>

          <Card>
            <h2 className={styles.cardTitle}>Details</h2>
            <dl className={styles.details}>
              <div><dt>Author</dt><dd>{submission.author?.name ?? '—'}</dd></div>
              <div><dt>Email</dt><dd>{submission.author?.email ?? '—'}</dd></div>
              {submission.track && <div><dt>Track</dt><dd>{submission.track.name}</dd></div>}
              {submission.paper && (
                <div>
                  <dt>Paper</dt>
                  <dd><a href={submission.paper.url} target="_blank" rel="noreferrer">{submission.paper.originalName}</a></dd>
                </div>
              )}
              {submission.decidedAt && (
                <div><dt>Decided</dt><dd>{timestamp(submission.decidedAt)} by {submission.decidedBy?.name ?? '—'}</dd></div>
              )}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
