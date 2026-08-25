import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiRequest } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { Department, ReferenceData, Role } from '@/lib/api/types';
import { UserForm } from '../UserForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Add staff' };
export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  const user = await requireStaff('/users/new');
  // Rendering a form the API will refuse to accept wastes the admin's time.
  if (!can(user, 'users.create')) redirect('/users');

  const canAssignRoles = can(user, 'rbac.manage');

  const [roles, departments, countries] = await Promise.all([
    canAssignRoles
      ? apiAsUser<Role[]>('/admin/roles').then((r) => r.data ?? []).catch(() => [])
      : Promise.resolve<Role[]>([]),
    apiAsUser<Department[]>('/admin/departments').then((r) => r.data ?? []).catch(() => []),
    apiRequest<ReferenceData>('/reference', { revalidate: 3600 })
      .then((r) => r.data.countries).catch(() => []),
  ]);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/users" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>← Staff</Link>
          <h1 className={styles.pageTitle}>Add a staff member</h1>
          <p className={styles.pageSub}>
            The account works straight away. Give them the password yourself.
          </p>
        </div>
      </header>

      <UserForm
        createAsStaff
        roles={roles}
        departments={departments}
        countries={countries}
        canSetStatus={can(user, 'users.deactivate')}
        canAssignRoles={canAssignRoles}
      />
    </>
  );
}
