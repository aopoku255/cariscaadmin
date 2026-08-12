import Link from 'next/link';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { PublicEvent, PageMeta } from '@/lib/api/types';
import { Badge, ButtonLink, EmptyState, Callout } from '@/components/ui';
import { eventDateRange } from '@/lib/format';
import { statusTone } from './status';
import styles from './admin.module.css';

export const metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

interface AdminEvent extends PublicEvent {
  capacity: number | null;
  virtualCapacity: number | null;
}

export default async function AdminOverview() {
  const user = await requireStaff();

  let events: AdminEvent[] = [];
  let meta: PageMeta | undefined;
  let failed = false;

  if (can(user, 'cpd.view')) {
    try {
      const { data } = await apiAsUser<AdminEvent[]>('/cpd/events', {
        query: { limit: 8, sort: 'start_at', order: 'asc' },
      });
      events = data ?? [];
    } catch {
      failed = true;
    }
  }

  const live = events.filter((e) => ['REGISTRATION_OPEN', 'ONGOING'].includes(e.status));
  const drafts = events.filter((e) => e.status === 'DRAFT');
  const upcoming = events.filter((e) => new Date(e.startAt) > new Date());

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Overview</h1>
          <p className={styles.pageSub}>
            {user.firstName ? `Signed in as ${user.firstName}. ` : ''}
            Here is where things stand.
          </p>
        </div>
        {can(user, 'cpd.create') && (
          <div className={styles.pageActions}>
            <ButtonLink href="/cpd/new">Create a CPD</ButtonLink>
          </div>
        )}
      </header>

      {failed && (
        <Callout tone="danger" title="We could not load events">
          Something went wrong reaching the API. Try refreshing.
        </Callout>
      )}

      {!can(user, 'cpd.view') && (
        <Callout tone="info" title="Nothing to show here">
          Your role does not include access to CPD events. Use the menu to reach the
          areas you do have access to.
        </Callout>
      )}

      {can(user, 'cpd.view') && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Open for registration</p>
              <p className={styles.statValue}>{live.length}</p>
              <p className={styles.statNote}>Accepting participants now</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Upcoming</p>
              <p className={styles.statValue}>{upcoming.length}</p>
              <p className={styles.statNote}>Scheduled ahead</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Drafts</p>
              <p className={styles.statValue}>{drafts.length}</p>
              <p className={styles.statNote}>Not yet published</p>
            </div>
          </div>

          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
            Events
          </h2>

          {events.length === 0 ? (
            <EmptyState
              title="No CPD events yet"
              description="Create one to start taking registrations. It stays a draft until you publish it, so nothing goes public by accident."
              action={can(user, 'cpd.create')
                ? <ButtonLink href="/cpd/new">Create the first CPD</ButtonLink>
                : undefined}
            />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Status</th>
                    <th scope="col">Dates</th>
                    <th scope="col" className={styles.numeric}>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <Link href={`/cpd/${event.id}`}>{event.title}</Link>
                      </td>
                      <td><Badge tone={statusTone(event.status)}>{event.status.replace(/_/g, ' ')}</Badge></td>
                      <td className={styles.nowrap}>
                        {eventDateRange(event.startAt, event.endAt, event.timezone)}
                      </td>
                      <td className={styles.numeric}>{event.capacity ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
