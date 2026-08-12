import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest, ApiError } from '@/lib/api/client';
import type { ReferenceData } from '@/lib/api/types';
import { CpdForm } from '../../CpdForm';
import type { AdminCpdEvent } from '../../types';
import styles from '../../../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit event' };

type Params = Promise<{ id: string }>;

export default async function EditCpdPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireStaff(`/cpd/${id}/edit`);
  if (!can(user, 'cpd.update')) redirect(`/cpd/${id}`);

  let event: AdminCpdEvent;
  try {
    const { data } = await apiAsUser<AdminCpdEvent>(`/cpd/events/${id}`);
    event = data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference', { revalidate: 3600 });
    countries = data.countries;
  } catch { /* form still works */ }

  // The browser loads image previews directly, so it needs the public base.
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href={`/cpd/${id}`} style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← {event.title}
          </Link>
          <h1 className={styles.pageTitle}>Edit details</h1>
          <p className={styles.pageSub}>
            Changing the dates or venue emails everyone already registered.
          </p>
        </div>
      </header>

      <CpdForm event={event} countries={countries} apiBase={apiBase} />
    </>
  );
}
