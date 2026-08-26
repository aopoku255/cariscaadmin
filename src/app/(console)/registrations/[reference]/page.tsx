import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { ApiError } from '@/lib/api/client';
import type { Registration } from '@/lib/api/types';
import { Badge, Callout } from '@/components/ui';
import {
  registrationStatusLabel, registrationTone, money, timestamp, eventDateRange,
} from '@/lib/format';
import { WaiveFeePanel } from './WaiveFeePanel';
import styles from '../../admin.module.css';
import panel from '../registrations.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ reference: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { reference } = await params;
  return { title: `Registration ${reference}` };
}

/** Human wording for the answer's question type, shown beside the label. */
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

export default async function RegistrationDetailPage({ params }: { params: Params }) {
  const user = await requireStaff('/registrations');
  const { reference } = await params;

  let registration: Registration;
  try {
    const { data } = await apiAsUser<Registration>(`/registrations/${encodeURIComponent(reference)}`);
    registration = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  const answers = registration.answers ?? [];
  const participant = registration.participant;
  const event = registration.event;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/registrations" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Registrations
          </Link>
          <h1 className={styles.pageTitle}>{participant?.name ?? 'Registration'}</h1>
          <p className={styles.pageSub}>
            {participant?.email}
            {event ? ` · ${event.title}` : ''}
          </p>
        </div>
        <div className={panel.badges}>
          <Badge tone={registrationTone[registration.status]}>
            {registrationStatusLabel[registration.status]}
          </Badge>
          <Badge tone="neutral">
            {registration.attendanceMode === 'VIRTUAL' ? 'Online' : 'In person'}
          </Badge>
        </div>
      </header>

      <div className={panel.detail}>
        <div className={panel.side} style={{ gap: 'var(--space-4)' }}>
          <section className={panel.panel}>
            <h2 className={panel.panelTitle}>Their answers</h2>

            {answers.length === 0 ? (
              <p className={panel.panelNote}>
                This event asks no extra questions, so there is nothing beyond
                the profile details shown alongside.
              </p>
            ) : (
              <dl className={panel.answers}>
                {answers.map((a) => (
                  <div key={a.questionId} className={panel.answer}>
                    <dt className={panel.answerLabel}>
                      {a.label ?? 'Question removed'}
                      {a.type && (
                        <span className={panel.answerType}> · {TYPE_LABEL[a.type] ?? a.type}</span>
                      )}
                    </dt>
                    <dd className={a.value ? panel.answerValue : `${panel.answerValue} ${panel.answerEmpty}`}>
                      {a.value || 'No answer given'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {(registration.comments || registration.specialRequirements) && (
            <section className={panel.panel}>
              <h2 className={panel.panelTitle}>What they told us</h2>
              {registration.specialRequirements && (
                <div className={panel.answer}>
                  <span className={panel.answerLabel}>Special requirements</span>
                  <p className={panel.answerValue}>{registration.specialRequirements}</p>
                </div>
              )}
              {registration.comments && (
                <div className={panel.answer}>
                  <span className={panel.answerLabel}>Comments</span>
                  <p className={panel.answerValue}>{registration.comments}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className={panel.side}>
          <section className={panel.panel}>
            <h2 className={panel.panelTitle}>Registration</h2>
            <dl className={panel.facts}>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Reference</dt>
                <dd className={`${panel.factValue} ${styles.mono}`}>{registration.reference}</dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Fee</dt>
                <dd className={panel.factValue}>
                  {!registration.amount ? '-'
                    : registration.amount.amountMinor === 0 ? 'Free'
                      : `${money(registration.amount)}${registration.priceTier ? ` · ${registration.priceTier}` : ''}`}
                  {registration.originalAmount && <>{' '}<Badge tone="info">Waived</Badge></>}
                </dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Registered</dt>
                <dd className={panel.factValue}>{timestamp(registration.createdAt)}</dd>
              </div>
              {registration.confirmedAt && (
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Confirmed</dt>
                  <dd className={panel.factValue}>{timestamp(registration.confirmedAt)}</dd>
                </div>
              )}
              {registration.cancelledAt && (
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Cancelled</dt>
                  <dd className={panel.factValue}>
                    {timestamp(registration.cancelledAt)}
                    {registration.cancellationReason ? ` — ${registration.cancellationReason}` : ''}
                  </dd>
                </div>
              )}
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Wants certificate</dt>
                <dd className={panel.factValue}>
                  {registration.wantsCertificate === null ? 'Not asked'
                    : registration.wantsCertificate ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Media consent</dt>
                <dd className={panel.factValue}>{registration.mediaConsentGiven ? 'Given' : 'Not given'}</dd>
              </div>
            </dl>
          </section>

          {can(user, 'registration.update') && <WaiveFeePanel registration={registration} />}

          <section className={panel.panel}>
            <h2 className={panel.panelTitle}>Participant</h2>
            <dl className={panel.facts}>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Name</dt>
                <dd className={panel.factValue}>{participant?.name ?? '-'}</dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Email</dt>
                <dd className={panel.factValue}>{participant?.email ?? '-'}</dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Organization</dt>
                <dd className={panel.factValue}>{participant?.organization ?? '-'}</dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Country</dt>
                <dd className={panel.factValue}>{participant?.countryCode ?? '-'}</dd>
              </div>
            </dl>
            {participant?.id && can(user, 'users.view') && (
              // Almost always a participant — /participants/:id redirects to
              // /users/:id itself on the rare chance this registrant is staff.
              <Link href={`/participants/${participant.id}`} style={{ fontSize: 'var(--text-sm)' }}>
                Open their account
              </Link>
            )}
          </section>

          {event && (
            <section className={panel.panel}>
              <h2 className={panel.panelTitle}>Event</h2>
              <dl className={panel.facts}>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Title</dt>
                  <dd className={panel.factValue}>{event.title}</dd>
                </div>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>When</dt>
                  <dd className={panel.factValue}>
                    {eventDateRange(event.startAt, event.endAt, event.timezone)}
                  </dd>
                </div>
              </dl>
              <Link href={`/registrations?eventId=${event.id}`} style={{ fontSize: 'var(--text-sm)' }}>
                All registrations for this event
              </Link>
            </section>
          )}
        </div>
      </div>

      {!can(user, 'registration.view') && (
        <Callout tone="info" title="Read-only">
          You are seeing this because it is your own registration.
        </Callout>
      )}
    </>
  );
}
