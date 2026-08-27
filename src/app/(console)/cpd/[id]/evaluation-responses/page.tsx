import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import type { EventResponses, QuestionResponses } from '@/lib/api/types';
import type { AdminCpdEvent } from '../../types';
import { Callout, EmptyState, ButtonLink } from '@/components/ui';
import { BarList } from '../responses/BarList';
import styles from '../../../admin.module.css';
import viz from '../responses/responses.module.css';

/**
 * The post-event survey's responses — same shape and rendering as the
 * registration-question summary (`../responses/page.tsx`), just reading
 * `evaluation-responses` instead. `QuestionBody` below is a near-duplicate
 * of that page's for the same reason the CPD/Summit route trees duplicate
 * each other: these are two different summaries of two different question
 * sets, not one feature that happens to render twice.
 */

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const { data } = await apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`);
    return { title: `Survey responses · ${data.title}` };
  } catch {
    return { title: 'Survey responses' };
  }
}

const TYPE_LABEL: Record<string, string> = {
  TEXT: 'Short text',
  LONGTEXT: 'Long text',
  NUMBER: 'Number',
  DATE: 'Date',
  SELECT: 'Choose one',
  RADIO: 'Choose one',
  MULTISELECT: 'Choose several',
  CHECKBOX: 'Checkbox',
  RATING: 'Rating (1–5)',
  NPS: 'Likelihood to recommend (0–10)',
};

/** The body of one question's card, chosen by what the answers actually are. */
function QuestionBody({ q, responses }: { q: QuestionResponses; responses: number }) {
  if (q.options) {
    const denominator = q.type === 'CHECKBOX' ? responses : q.answered;

    return (
      <>
        <BarList
          total={denominator}
          rows={q.options.map((o) => ({
            key: o.value,
            label: o.label,
            count: o.count,
            note: o.retired ? 'removed from the form' : undefined,
          }))}
        />
        {q.multiple && q.answered > 0 && (
          <p className={viz.note}>
            Several answers were allowed, so shares are of the {q.answered} people
            who answered and will add up to more than 100%.
          </p>
        )}
      </>
    );
  }

  if (q.text) {
    if (q.text.samples.length === 0) {
      return <p className={viz.empty}>Nobody answered this yet.</p>;
    }
    return (
      <>
        {q.text.repeated.length > 0 && (
          <div>
            <p className={viz.note}>Given more than once:</p>
            <div className={viz.repeated}>
              {q.text.repeated.map((r) => (
                <span key={r.value} className={viz.repeatedChip}>
                  {r.value} · {r.count}
                </span>
              ))}
            </div>
          </div>
        )}
        <ul className={viz.textList}>
          {q.text.samples.map((s, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className={viz.textItem}>{s}</li>
          ))}
        </ul>
        {q.text.truncated && (
          <p className={viz.note}>
            Showing the first {q.text.samples.length}. Export to CSV for the full set.
          </p>
        )}
      </>
    );
  }

  if (q.number) {
    if (!q.number.stats) return <p className={viz.empty}>Nobody answered this yet.</p>;
    const s = q.number.stats;
    return (
      <>
        <div className={viz.stats}>
          <div className={viz.stat}>
            <span className={viz.statLabel}>Average</span>
            <span className={viz.statValue}>{s.mean}</span>
          </div>
          <div className={viz.stat}>
            <span className={viz.statLabel}>Median</span>
            <span className={viz.statValue}>{s.median}</span>
          </div>
          <div className={viz.stat}>
            <span className={viz.statLabel}>Lowest</span>
            <span className={viz.statValue}>{s.min}</span>
          </div>
          <div className={viz.stat}>
            <span className={viz.statLabel}>Highest</span>
            <span className={viz.statValue}>{s.max}</span>
          </div>
        </div>
        {q.number.buckets.length > 0 && (
          <BarList
            total={s.count}
            rows={q.number.buckets.map((b) => ({ key: b.label, label: b.label, count: b.count }))}
          />
        )}
      </>
    );
  }

  if (q.date) {
    if (q.date.buckets.length === 0) return <p className={viz.empty}>Nobody answered this yet.</p>;
    return (
      <BarList
        total={q.answered}
        rows={q.date.buckets.map((b) => ({ key: b.label, label: b.label, count: b.count }))}
      />
    );
  }

  return <p className={viz.empty}>No summary for this question type.</p>;
}

export default async function EvaluationResponsesPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireStaff(`/cpd/${id}/evaluation-responses`);
  if (!can(user, 'evaluation.view')) redirect(`/cpd/${id}`);

  let event: AdminCpdEvent;
  let summary: EventResponses;
  try {
    const [e, s] = await Promise.all([
      apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`),
      apiAsUser<EventResponses>(`/cpd/events/${id}/evaluation-responses`),
    ]);
    event = e.data;
    summary = s.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  const { questions, responses } = summary;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href={`/cpd/${id}`} style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← {event.title}
          </Link>
          <h1 className={styles.pageTitle}>Survey responses</h1>
          <p className={styles.pageSub}>
            {responses} registration{responses === 1 ? '' : 's'} counted.
            Cancelled and refunded ones are left out.
          </p>
        </div>
        <div className={styles.pageActions}>
          {can(user, 'evaluation.export') && (
            <a
              className="download"
              href={`/cpd/${id}/evaluation-responses/export`}
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '9px 18px',
                borderRadius: 'var(--radius)', border: '1px solid var(--color-accent)',
                color: 'var(--color-accent-text)', textDecoration: 'none', fontWeight: 600,
              }}
            >
              Export to CSV
            </a>
          )}
        </div>
      </header>

      {questions.length === 0 ? (
        <EmptyState
          title="This event has no survey questions yet"
          description="Add questions from the event page and answers will be summarised here once the programme has ended."
          action={can(user, 'evaluation.manage')
            ? <ButtonLink href={`/cpd/${id}`}>Add survey questions</ButtonLink>
            : undefined}
        />
      ) : responses === 0 ? (
        <Callout tone="info" title="No responses yet">
          The summary appears once participants start submitting the survey.
        </Callout>
      ) : (
        <div className={viz.list}>
          {questions.map((q) => (
            <section key={q.id} className={viz.card}>
              <div className={viz.cardHead}>
                <h2 className={viz.question}>{q.label}</h2>
                <p className={viz.meta}>
                  {TYPE_LABEL[q.type] ?? q.type}
                  {q.required ? ' · required' : ''}
                  {' · '}
                  {q.answered} of {responses} answered
                  {q.skipped > 0 ? ` · ${q.skipped} skipped` : ''}
                </p>
              </div>

              <QuestionBody q={q} responses={responses} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
