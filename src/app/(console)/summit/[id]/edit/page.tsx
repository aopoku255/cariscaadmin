import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest, ApiError } from '@/lib/api/client';
import type { ReferenceData, CertificateTemplate } from '@/lib/api/types';
import { SummitForm } from '../../SummitForm';
import type { AdminSummitEvent } from '../../types';
import styles from '../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit event' };

type Params = Promise<{ id: string }>;

export default async function EditSummitPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireStaff(`/summit/${id}/edit`);
  if (!can(user, 'summit.update')) redirect(`/summit/${id}`);

  let event: AdminSummitEvent;
  try {
    const { data } = await apiAsUser<AdminSummitEvent>(`/summit/events/${id}`);
    event = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference');
    countries = data.countries;
  } catch { /* form still works */ }

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
          <Link href={`/summit/${id}`} style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← {event.title}
          </Link>
          <h1 className={styles.pageTitle}>Edit details</h1>
          <p className={styles.pageSub}>
            Changing the dates or venue emails everyone already registered.
          </p>
        </div>
      </header>

      <SummitForm event={event} countries={countries} apiBase={apiBase} certificateTemplates={certificateTemplates} />
    </>
  );
}
