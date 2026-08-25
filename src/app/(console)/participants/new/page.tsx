import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiRequest } from '@/lib/api/client';
import type { ReferenceData } from '@/lib/api/types';
import { UserForm } from '../../users/UserForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Add a participant' };
export const dynamic = 'force-dynamic';

/**
 * For the walk-in, phone or paper registration that never touches the public
 * site — the ordinary path for a participant is to register themselves.
 * `UserForm` renders with no roles or department here: those are staff-only
 * fields, gated off by omitting `createAsStaff`.
 */
export default async function NewParticipantPage() {
  const user = await requireStaff('/participants/new');
  if (!can(user, 'users.create')) redirect('/participants');

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference', { revalidate: 3600 });
    countries = data.countries;
  } catch { /* the form still works without the country list */ }

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/participants" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Participants
          </Link>
          <h1 className={styles.pageTitle}>Add a participant</h1>
          <p className={styles.pageSub}>
            For someone registering by phone or in person. The account works
            straight away — give them the password yourself.
          </p>
        </div>
      </header>

      <UserForm
        countries={countries}
        canSetStatus={false}
        canAssignRoles={false}
      />
    </>
  );
}
