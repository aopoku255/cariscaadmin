import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import { Badge, Callout, ButtonLink, Card } from '@/components/ui';
import { eventDateRange, eventTime, timezoneLabel } from '@/lib/format';
import { statusTone, statusLabel } from '../../status';
import type { AdminSummitEvent, EventSummary } from '../types';
import type { Partner, ReferenceData } from '@/lib/api/types';
import { LifecycleControls } from '@/components/admin/event/LifecycleControls';
import { QuestionsEditor, EVALUATION_TYPES } from '@/components/admin/event/QuestionsEditor';
import { EventPartners } from '@/components/admin/event/EventPartners';
import { PricesEditor } from '@/components/admin/event/PricesEditor';
import { SpeakersEditor } from '@/components/admin/event/SpeakersEditor';
import { TracksEditor } from './TracksEditor';
import { SponsorshipTiersEditor } from './SponsorshipTiersEditor';
import {
  transitionSummitAction, saveQuestionsAction, saveEvaluationQuestionsAction,
  savePricesAction, saveSpeakersAction, saveSummitPartnersAction,
} from '../actions';
import styles from '../summit.module.css';
import admin from '../../admin.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const { data } = await apiAsUser<AdminSummitEvent>(`/summit/events/${id}`);
    return { title: data.title };
  } catch {
    return { title: 'Event' };
  }
}

export default async function AdminSummitEventPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireStaff(`/summit/${id}`);

  let event: AdminSummitEvent;
  try {
    const { data } = await apiAsUser<AdminSummitEvent>(`/summit/events/${id}`);
    event = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  let library: Partner[] = [];
  if (can(user, 'partners.view')) {
    try {
      const { data } = await apiAsUser<Partner[]>('/partners', { query: { limit: 100 } });
      library = data ?? [];
    } catch { /* the card degrades to read-only */ }
  }

  let currencies: ReferenceData['currencies'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference');
    currencies = data.currencies;
  } catch { /* the editor falls back to the codes it already has */ }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  let summary: EventSummary | null = null;
  if (can(user, 'registration.view')) {
    try {
      const { data } = await apiAsUser<EventSummary>(`/summit/events/${id}/summary`);
      summary = data;
    } catch { /* the page is still useful without the counts */ }
  }

  let abstractCount: number | null = null;
  if (can(user, 'abstract.view')) {
    try {
      const { data } = await apiAsUser<unknown[]>(`/summit/events/${id}/abstracts`);
      abstractCount = data?.length ?? 0;
    } catch { /* the button still works without a count */ }
  }

  const inPerson = event.occupancy?.inPerson;
  const virtual = event.occupancy?.virtual;
  const isPublic = ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED']
    .includes(event.status);

  return (
    <>
      <header className={admin.pageHead}>
        <div>
          <Link href="/summit" className={styles.back}>← Summit events</Link>
          <div className={styles.titleRow}>
            <h1 className={admin.pageTitle}>{event.title}</h1>
            <Badge tone={statusTone(event.status)}>{statusLabel[event.status]}</Badge>
          </div>
          <p className={admin.pageSub}>
            {eventDateRange(event.startAt, event.endAt, event.timezone)}
            {' · '}{eventTime(event.startAt, event.timezone)}–{eventTime(event.endAt, event.timezone)}
            {' '}{timezoneLabel(event.startAt, event.timezone)}
          </p>
        </div>
        <div className={admin.pageActions}>
          {can(user, 'summit.update') && (
            <ButtonLink href={`/summit/${event.id}/edit`} variant="secondary">Edit details</ButtonLink>
          )}
          {can(user, 'attendance.view') && (
            <ButtonLink href={`/summit/${event.id}/attendance`} variant="secondary">
              Attendance
            </ButtonLink>
          )}
          {can(user, 'registration.view') && (
            <ButtonLink href={`/summit/${event.id}/responses`} variant="secondary">
              Responses
            </ButtonLink>
          )}
          {can(user, 'abstract.view') && (
            <ButtonLink href={`/summit/${event.id}/abstracts`} variant="secondary">
              Abstracts{abstractCount !== null ? ` (${abstractCount})` : ''}
            </ButtonLink>
          )}
          {can(user, 'registration.view') && (
            <ButtonLink href={`/registrations?eventId=${event.id}`}>
              Registrations{summary ? ` (${summary.totals.all})` : ''}
            </ButtonLink>
          )}
        </div>
      </header>

      {created && (
        <Callout tone="success" title="Draft created">
          Add your tracks, fees and call-for-papers window, then publish when
          you are ready. Nothing is public yet.
        </Callout>
      )}

      {event.banner ? (
        <figure className={styles.bannerPreview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${apiBase}${event.banner.url}`} alt="" className={styles.bannerImage} />
          <figcaption className={styles.bannerCaption}>
            Banner, cropped to 16:9 exactly as participants see it.
          </figcaption>
        </figure>
      ) : can(user, 'summit.update') && (
        <Callout tone="info" title="No banner image">
          This event will show as a plain card in listings and on its own page.{' '}
          <Link href={`/summit/${event.id}/edit`}>Add a banner</Link>.
        </Callout>
      )}

      {event.status === 'CANCELLED' && (
        <Callout tone="danger" title="This event is cancelled">
          {event.cancelledReason ?? 'No reason was recorded.'}
        </Callout>
      )}

      {isPublic && (
        <p className={styles.publicLink}>
          Public page: <Link href={`/events/${event.slug}`} target="_blank">/events/{event.slug}</Link>
        </p>
      )}

      {summary && (
        <div className={admin.stats}>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Registered</p>
            <p className={admin.statValue}>{summary.totals.all}</p>
            <p className={admin.statNote}>{summary.totals.confirmed} confirmed</p>
          </div>
          <div className={admin.stat}>
            <p className={admin.statLabel}>In person</p>
            <p className={admin.statValue}>{summary.byAttendanceMode.IN_PERSON ?? 0}</p>
            <p className={admin.statNote}>
              {inPerson?.capacity ? `${inPerson.remaining} of ${inPerson.capacity} places left` : 'No limit'}
            </p>
          </div>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Online</p>
            <p className={admin.statValue}>{summary.byAttendanceMode.VIRTUAL ?? 0}</p>
            <p className={admin.statNote}>
              {virtual?.capacity ? `${virtual.remaining} of ${virtual.capacity} places left` : 'No limit'}
            </p>
          </div>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Waitlist</p>
            <p className={admin.statValue}>{summary.totals.waitlisted}</p>
            <p className={admin.statNote}>Offered a place automatically</p>
          </div>
          <div className={admin.stat}>
            <p className={admin.statLabel}>Countries</p>
            <p className={admin.statValue}>{summary.distinctCountries}</p>
            <p className={admin.statNote}>{summary.distinctOrganizations} organizations</p>
          </div>
        </div>
      )}

      <div className={styles.columns}>
        <div className={styles.mainCol}>
          <Card>
            <h2 className={styles.cardTitle}>Tracks</h2>
            <TracksEditor
              eventId={event.id}
              tracks={event.tracks ?? []}
              canEdit={can(user, 'summit.update')}
            />
          </Card>

          <Card>
            <h2 className={styles.cardTitle}>Registration questions</h2>
            <QuestionsEditor
              eventId={event.id}
              questions={event.questions ?? []}
              canEdit={can(user, 'summit.question.manage')}
              action={saveQuestionsAction}
            />
          </Card>

          {event.certificate.issues && (
            <Card>
              <h2 className={styles.cardTitle}>Post-event survey</h2>
              <QuestionsEditor
                eventId={event.id}
                questions={event.evaluationQuestions ?? []}
                canEdit={can(user, 'evaluation.manage')}
                action={saveEvaluationQuestionsAction}
                availableTypes={EVALUATION_TYPES}
                hint={event.certificate.requiresEvaluation
                  ? 'Participants must answer every required question here before they can download their certificate.'
                  : 'Not required yet — turn on "Require the post-event survey" when editing this event for it to gate the certificate.'}
              />
            </Card>
          )}

          <Card>
            <h2 className={styles.cardTitle}>Sponsorship tiers</h2>
            <SponsorshipTiersEditor
              eventId={event.id}
              tiers={event.sponsorshipTiers ?? []}
              currencies={currencies}
              canEdit={can(user, 'summit.update')}
            />
          </Card>

          {can(user, 'partners.view') && (
            <Card>
              <h2 className={styles.cardTitle}>Partners and sponsors</h2>
              <EventPartners
                eventId={event.id}
                attached={event.partners ?? []}
                library={library}
                tiers={event.sponsorshipTiers ?? []}
                canEdit={can(user, 'summit.update')}
                apiBase={apiBase}
                action={saveSummitPartnersAction}
              />
            </Card>
          )}

          <Card>
            <h2 className={styles.cardTitle}>Fees</h2>
            <PricesEditor
              eventId={event.id}
              prices={event.prices ?? []}
              currencies={currencies}
              canEdit={can(user, 'summit.update')}
              action={savePricesAction}
            />
          </Card>

          <Card>
            <h2 className={styles.cardTitle}>Speakers</h2>
            <SpeakersEditor
              eventId={event.id}
              speakers={event.speakers ?? []}
              canEdit={can(user, 'summit.update')}
              apiBase={apiBase}
              action={saveSpeakersAction}
            />
          </Card>

          {summary && summary.topOrganizations.length > 0 && (
            <Card>
              <h2 className={styles.cardTitle}>Who is coming</h2>
              <div className={styles.breakdowns}>
                <div>
                  <h3 className={styles.breakdownTitle}>Top organizations</h3>
                  <ul className={styles.breakdown}>
                    {summary.topOrganizations.slice(0, 6).map((o) => (
                      <li key={o.name}><span>{o.name}</span><span className={admin.numeric}>{o.count}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className={styles.breakdownTitle}>Countries</h3>
                  <ul className={styles.breakdown}>
                    {summary.topCountries.slice(0, 6).map((c) => (
                      <li key={c.name}><span>{c.name}</span><span className={admin.numeric}>{c.count}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>

        <aside className={styles.sideCol}>
          <Card>
            <h2 className={styles.cardTitle}>Run the event</h2>
            <LifecycleControls
              eventId={event.id}
              status={event.status}
              user={user}
              permissionPrefix="summit"
              action={transitionSummitAction}
            />
          </Card>

          <Card>
            <h2 className={styles.cardTitle}>Setup</h2>
            <ul className={styles.checklist}>
              <ChecklistItem done={!!event.shortDescription} label="Short description" />
              <ChecklistItem done={(event.prices?.length ?? 0) > 0} label="At least one fee" />
              <ChecklistItem
                done={event.deliveryMode === 'ONLINE' || !!event.location?.venue}
                label="Venue"
              />
              <ChecklistItem
                done={event.deliveryMode === 'OFFLINE' || !!event.onlineUrl}
                label="Joining link"
              />
            </ul>
          </Card>

          <Card>
            <h2 className={styles.cardTitle}>Details</h2>
            <dl className={styles.details}>
              <div><dt>Format</dt><dd>{event.deliveryMode === 'HYBRID' ? 'In person and online' : event.deliveryMode === 'ONLINE' ? 'Online' : 'In person'}</dd></div>
              {event.location?.venue && <div><dt>Venue</dt><dd>{event.location.venue}</dd></div>}
              {event.summit?.theme && <div><dt>Theme</dt><dd>{event.summit.theme}</dd></div>}
              <div><dt>Certificate</dt><dd>{event.certificate?.issues ? 'Yes' : 'No'}</dd></div>
              <div>
                <dt>Attendance</dt>
                <dd>
                  {event.attendance?.rule === 'SESSION_PERCENT'
                    ? `${event.attendance.minPercent}% of sessions`
                    : event.attendance?.rule === 'CHECK_IN' ? 'Check-in' : 'Not tracked'}
                </dd>
              </div>
              <div><dt>Waitlist</dt><dd>{event.allowWaitlist ? 'On' : 'Off'}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ChecklistItem({ done, label, note }: { done: boolean; label: string; note?: string }) {
  return (
    <li className={done ? styles.checkDone : styles.checkTodo}>
      <span aria-hidden="true">{done ? '✓' : '○'}</span>
      <span>
        {label}
        <span className="visually-hidden">{done ? ': done' : ': outstanding'}</span>
        {note && <span className={styles.checkNoteText}>{note}</span>}
      </span>
    </li>
  );
}
