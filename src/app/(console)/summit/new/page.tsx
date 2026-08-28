import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiRequest } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { ReferenceData, CertificateTemplate } from '@/lib/api/types';
import { SummitForm } from '../SummitForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Create a Summit' };
export const dynamic = 'force-dynamic';

export default async function NewSummitPage() {
  const user = await requireStaff('/summit/new');
  if (!can(user, 'summit.create')) redirect('/summit');

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference');
    countries = data.countries;
  } catch { /* the form still works without the country list */ }

  let certificateTemplates: CertificateTemplate[] = [];
  try {
    const { data } = await apiAsUser<CertificateTemplate[]>('/certificate-templates');
    certificateTemplates = data;
  } catch { /* form still works — the picker just offers only the default */ }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/summit" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>← Summit events</Link>
          <h1 className={styles.pageTitle}>Create a Summit</h1>
          <p className={styles.pageSub}>
            It is saved as a draft. Nothing is public until you publish it.
          </p>
        </div>
      </header>

      <SummitForm countries={countries} apiBase={apiBase} certificateTemplates={certificateTemplates} />
    </>
  );
}
