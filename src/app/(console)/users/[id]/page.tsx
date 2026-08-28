import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest, ApiError } from '@/lib/api/client';
import type {
  AdminUser, AuditLogEntry, Department, ReferenceData, Role,
} from '@/lib/api/types';
import { Badge, Callout } from '@/components/ui';
import { userStatusLabel, userStatusTone, timestamp, auditActionLabel } from '@/lib/format';
import { UserForm } from '../UserForm';
import { RolesPanel } from './RolesPanel';
import { PasswordPanel } from './PasswordPanel';
import styles from '../../admin.module.css';
import panel from '../users.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string; emailSent?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const { data } = await apiAsUser<AdminUser>(`/admin/users/${id}`);
    return { title: data.fullName };
  } catch {
    return { title: 'User' };
  }
}

export default async function UserDetailPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const viewer = await requireStaff('/users');
  const { id } = await params;
  const { created, emailSent } = await searchParams;

  let target: AdminUser;
  try {
    const { data } = await apiAsUser<AdminUser>(`/admin/users/${id}`);
    target = data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // This page is staff-only; a participant's record lives at /participants/:id
  // instead, which has no roles or department to show. Redirecting rather than
  // 404ing means an old bookmark or a stale link still lands somewhere useful.
  if (!target.isStaff) redirect(`/participants/${id}`);

  const isSelf = String(viewer.id) === String(target.id);
  const canAssignRoles = can(viewer, 'rbac.manage');
  const canEdit = can(viewer, 'users.update');

  const [roles, departments, countries, history] = await Promise.all([
    canAssignRoles
      ? apiAsUser<Role[]>('/admin/roles').then((r) => r.data ?? []).catch(() => [])
      : Promise.resolve<Role[]>([]),
    canEdit
      ? apiAsUser<Department[]>('/admin/departments').then((r) => r.data ?? []).catch(() => [])
      : Promise.resolve<Department[]>([]),
    apiRequest<ReferenceData>('/reference')
      .then((r) => r.data.countries).catch(() => []),
    // What has been done to this account, from the same log the audit page
    // reads. Answering "who changed this?" on the record itself beats sending
    // an administrator off to search for it.
    can(viewer, 'audit.view')
      ? apiAsUser<AuditLogEntry[]>('/admin/audit-logs', {
        query: { resourceType: 'user', q: id, limit: 10 },
      }).then((r) => (r.data ?? []).filter((e) => e.resourceId === String(id))).catch(() => [])
      : Promise.resolve<AuditLogEntry[]>([]),
  ]);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <Link href="/users" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>← Staff</Link>
          <h1 className={styles.pageTitle}>{target.displayName || target.fullName}</h1>
          <p className={styles.pageSub}>{target.email}</p>
        </div>
        <div className={panel.badges}>
          <Badge tone={userStatusTone[target.status]}>{userStatusLabel[target.status]}</Badge>
          {!target.emailVerified && <Badge tone="warning">Email unverified</Badge>}
        </div>
      </header>

      {created && (
        emailSent === '1' ? (
          <Callout tone="success" title="Account created">
            An email with their sign-in details was sent to {target.email}.
          </Callout>
        ) : (
          <Callout tone="warning" title="Account created — but the welcome email did not send">
            Pass the password on to {target.firstName} yourself. They can
            change it from their own profile once they have signed in.
          </Callout>
        )
      )}

      <div className={panel.detail}>
        <div>
          {canEdit ? (
            <UserForm
              user={target}
              roles={roles}
              departments={departments}
              countries={countries}
              canSetStatus={can(viewer, 'users.deactivate')}
              canAssignRoles={canAssignRoles}
            />
          ) : (
            <section className={panel.panel}>
              <h2 className={panel.panelTitle}>Details</h2>
              <dl className={panel.facts}>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Organization</dt>
                  <dd className={panel.factValue}>{target.organization ?? '-'}</dd>
                </div>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Job title</dt>
                  <dd className={panel.factValue}>{target.jobTitle ?? '-'}</dd>
                </div>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Phone</dt>
                  <dd className={panel.factValue}>{target.phone ?? '-'}</dd>
                </div>
              </dl>
              <p className={panel.panelNote}>
                Your role does not allow editing accounts.
              </p>
            </section>
          )}
        </div>

        <div className={panel.side}>
          <section className={panel.panel}>
            <h2 className={panel.panelTitle}>Account</h2>
            <dl className={panel.facts}>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Department</dt>
                <dd className={panel.factValue}>{target.department?.name ?? 'Not set'}</dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Roles</dt>
                <dd className={panel.factValue}>
                  {target.roles?.map((r) => r.name).join(', ') || 'None'}
                </dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Last signed in</dt>
                <dd className={panel.factValue}>
                  {target.lastLoginAt ? timestamp(target.lastLoginAt) : 'Never'}
                </dd>
              </div>
              <div className={panel.factRow}>
                <dt className={panel.factLabel}>Added</dt>
                <dd className={panel.factValue}>{timestamp(target.createdAt)}</dd>
              </div>
            </dl>
          </section>

          {canAssignRoles && (
            <RolesPanel user={target} roles={roles} isSelf={isSelf} />
          )}

          {canEdit && !isSelf && (
            <PasswordPanel userId={target.id} name={target.firstName} />
          )}

          {history.length > 0 && (
            <section className={panel.panel}>
              <h2 className={panel.panelTitle}>Recent changes</h2>
              <dl className={panel.facts}>
                {history.map((entry) => (
                  <div key={entry.id} className={panel.factRow}>
                    <dt className={panel.factLabel}>{timestamp(entry.createdAt)}</dt>
                    <dd className={panel.factValue}>
                      {auditActionLabel(entry.action)}
                      {entry.actor.email && (
                        <span className={panel.panelNote}> · {entry.actor.email}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link href={`/audit?resourceType=user&q=${target.id}`}
                style={{ fontSize: 'var(--text-sm)' }}>
                See the full audit trail
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
