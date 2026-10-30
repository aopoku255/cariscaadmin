import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest } from '@/lib/api/client';
import type { ReferenceData } from '@/lib/api/types';
import type { AdminCpdEvent } from '../../cpd/types';
import { AddParticipantForm } from './AddParticipantForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Add a participant to an event' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ eventId?: string }>;

export default async function AddParticipantToEventPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff('/registrations/new');
  if (!can(user, 'registration.create')) redirect('/registrations');
  const { eventId } = await searchParams;

  let reference: ReferenceData | null = null;
  try {
    reference = (await apiRequest<ReferenceData>('/reference')).data;
  } catch { /* the selects degrade to empty */ }

  // Events that can still take people: not drafts, not cancelled or archived.
  const open = ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'];
  const events: { id: string; title: string; kind: string }[] = [];
  for (const [path, kind] of [['/cpd/events', 'CPD'], ['/summit/events', 'Summit']] as const) {
    try {
      const { data } = await apiAsUser<AdminCpdEvent[]>(path, {
        query: { limit: 100, sort: 'start_at', order: 'desc' },
      });
      for (const e of data ?? []) {
        if (open.includes(e.status)) events.push({ id: e.id, title: e.title, kind });
      }
    } catch { /* that module's events are simply not offered */ }
  }

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/registrations" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Registrations
          </Link>
          <h1 className={styles.pageTitle}>Add a participant to an event</h1>
          <p className={styles.pageSub}>
            For someone registering by phone or in person. If their email is new we
            create their account and email them their sign-in details, then send
            their registration confirmation. If they already have an account it is
            used as it is.
          </p>
        </div>
      </header>

      <AddParticipantForm events={events} reference={reference} selectedEventId={eventId} />
    </>
  );
}
