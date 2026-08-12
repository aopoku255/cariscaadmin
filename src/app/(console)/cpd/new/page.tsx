import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiRequest } from '@/lib/api/client';
import type { ReferenceData } from '@/lib/api/types';
import { CpdForm } from '../CpdForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Create a CPD' };
export const dynamic = 'force-dynamic';

export default async function NewCpdPage() {
  const user = await requireStaff('/cpd/new');
  // Rendering a form the API will refuse to accept wastes the admin's time.
  if (!can(user, 'cpd.create')) redirect('/cpd');

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference', { revalidate: 3600 });
    countries = data.countries;
  } catch { /* the form still works without the country list */ }

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/cpd" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>← CPD events</Link>
          <h1 className={styles.pageTitle}>Create a CPD</h1>
          <p className={styles.pageSub}>
            It is saved as a draft. Nothing is public until you publish it.
          </p>
        </div>
      </header>

      <CpdForm countries={countries} />
    </>
  );
}
