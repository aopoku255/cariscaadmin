import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import type { EventResponses, QuestionResponses } from '@/lib/api/types';
import type { AdminCpdEvent } from '../../types';
import { Callout, EmptyState, ButtonLink } from '@/components/ui';
import { BarList } from './BarList';
import styles from '../../../admin.module.css';
import viz from './responses.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const { data } = await apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`);
    return { title: `Responses · ${data.title}` };
  } catch {
    return { title: 'Responses' };
  }
}

const TYPE_LABEL: Record<string, string> = {
  TEXT: 'Short text',
  LONGTEXT: 'Long text',
  NUMBER: 'Number',
  EMAIL: 'Email address',
  PHONE: 'Phone number',
  DATE: 'Date',
  SELECT: 'Choose one',
  RADIO: 'Choose one',
  MULTISELECT: 'Choose several',
  CHECKBOX: 'Checkbox',
  FILE: 'File upload',
};

/** The body of one question's card, chosen by what the answers actually are. */
function QuestionBody({ q, responses }: { q: QuestionResponses; responses: number }) {
  // Choice and checkbox: counts to compare, so bars.
  if (q.options) {
    // Shares are of the people who answered, not of everyone registered — a
    // skipped question is an unknown, not a "no", and folding skips into the
    // denominator quietly understates every option. The header line carries
    // the skip count instead. Checkbox is the exception: "not ticked" is
    // derived from everyone, so its two bars are already of the whole group.
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

  // Free text has no magnitude to plot — the answers are the content. Google
  // Forms shows the list for the same reason.
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
            // Answers are free text and repeat, so neither value nor content
            // is a stable key — position is what identifies a row here.
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className={viz.textItem}>{s}</li>
          ))}
        </ul>
        {q.text.truncated && (
          <p className={viz.note}>
            Showing the first {q.text.samples.length}. Export the registrations
            to CSV for the full set.
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

  if (q.uploaded !== undefined) {
    return (
      <div className={viz.stats}>
        <div className={viz.stat}>
          <span className={viz.statLabel}>Files uploaded</span>
          <span className={viz.statValue}>{q.uploaded}</span>
        </div>
      </div>
    );
  }

  return <p className={viz.empty}>No summary for this question type.</p>;
}

export default async function ResponsesPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireStaff(`/cpd/${id}/responses`);
  if (!can(user, 'cpd.registration.view')) redirect(`/cpd/${id}`);

  let event: AdminCpdEvent;
  let summary: EventResponses;
  try {
    const [e, s] = await Promise.all([
      apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`),
      apiAsUser<EventResponses>(`/cpd/events/${id}/responses`),
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
          <h1 className={styles.pageTitle}>Responses</h1>
          <p className={styles.pageSub}>
            {responses} registration{responses === 1 ? '' : 's'} counted.
            Cancelled and refunded ones are left out.
          </p>
        </div>
        <div className={styles.pageActions}>
          <ButtonLink href={`/registrations?eventId=${id}`} variant="secondary">
            See them individually
          </ButtonLink>
          {can(user, 'cpd.registration.export') && (
            <a
              className="download"
              href={`/registrations/export?eventId=${id}`}
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
          title="This event asks no extra questions"
          description="Add questions to the registration form and the answers will be summarised here."
          action={can(user, 'cpd.update')
            ? <ButtonLink href={`/cpd/${id}`}>Add questions</ButtonLink>
            : undefined}
        />
      ) : responses === 0 ? (
        <Callout tone="info" title="No registrations yet">
          The summary appears as soon as people start signing up.
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
