import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import type { CertificateTemplate } from '@/lib/api/types';
import { Callout } from '@/components/ui';
import { CertificateTemplateManager } from './CertificateTemplateManager';
import styles from '../admin.module.css';

export const metadata = { title: 'Certificate templates' };
export const dynamic = 'force-dynamic';

export default async function CertificateTemplatesPage() {
  const user = await requireStaff('/certificate-templates');
  if (!can(user, 'certificate_templates.manage')) redirect('/');

  let templates: CertificateTemplate[] = [];
  let failed = false;
  try {
    const { data } = await apiAsUser<CertificateTemplate[]>('/certificate-templates');
    templates = data ?? [];
  } catch {
    failed = true;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Certificate templates</h1>
          <p className={styles.pageSub}>
            The second signatory on a certificate — everything else about the design
            is fixed. Pick a template on a CPD or Summit event's edit page to use it
            there; leave an event unset and it keeps the default signature.
          </p>
        </div>
      </header>

      {failed && (
        <Callout tone="danger" title="We could not load the template list">
          Try refreshing the page.
        </Callout>
      )}

      <CertificateTemplateManager
        templates={templates}
        canManage={can(user, 'certificate_templates.manage')}
        apiBase={apiBase}
      />
    </>
  );
}
