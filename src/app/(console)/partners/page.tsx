import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest } from '@/lib/api/client';
import type { Partner, ReferenceData } from '@/lib/api/types';
import { Callout } from '@/components/ui';
import { PartnerManager } from './PartnerManager';
import styles from '../admin.module.css';

export const metadata = { title: 'Partners' };
export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const user = await requireStaff('/partners');
  if (!can(user, 'partners.view')) redirect('/');

  let partners: Partner[] = [];
  let failed = false;
  try {
    const { data } = await apiAsUser<Partner[]>('/partners', { query: { limit: 100 } });
    partners = data ?? [];
  } catch {
    failed = true;
  }

  let countries: ReferenceData['countries'] = [];
  try {
    const { data } = await apiRequest<ReferenceData>('/reference');
    countries = data.countries;
  } catch { /* the form works without the country list */ }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Partners</h1>
          <p className={styles.pageSub}>
            Institutions and organizations CARISCA runs programmes with. Added once
            here, then credited on any number of events.
          </p>
        </div>
      </header>

      {failed && (
        <Callout tone="danger" title="We could not load the partner library">
          Try refreshing the page.
        </Callout>
      )}

      <PartnerManager
        partners={partners}
        countries={countries}
        canManage={can(user, 'partners.manage')}
        apiBase={apiBase}
      />
    </>
  );
}
