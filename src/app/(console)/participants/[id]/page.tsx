import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaff, can } from '@/lib/auth/require-staff';
import { apiAsUser } from '@/lib/auth/session';
import { apiRequest, ApiError } from '@/lib/api/client';
import type { AdminUser, AuditLogEntry, ReferenceData } from '@/lib/api/types';
import { Badge, Callout } from '@/components/ui';
import { userStatusLabel, userStatusTone, timestamp, auditActionLabel } from '@/lib/format';
import { UserForm } from '../../users/UserForm';
import { PasswordPanel } from '../../users/[id]/PasswordPanel';
import styles from '../../admin.module.css';
import panel from '../../users/users.module.css';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ created?: string; emailSent?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  try {
    const { data } = await apiAsUser<AdminUser>(`/admin/users/${id}`);
    return { title: data.fullName };
  } catch {
    return { title: 'Participant' };
  }
}

export default async function ParticipantDetailPage({
  params, searchParams,
}: { params: Params; searchParams: SearchParams }) {
  const viewer = await requireStaff('/participants');
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

  // This page is for participants; a staff record lives at /users/:id, which
  // shows the department and role editor this page deliberately omits. Ticking
  // "Staff member" on the form below and saving lands back here with
  // isStaff now true — updateUserAction revalidates this path too, so the
  // redirect below picks it up on the very next render and hands off to
  // /users/:id, where RolesPanel is waiting.
  if (target.isStaff) redirect(`/users/${id}`);

  const canEdit = can(viewer, 'users.update');

  const [countries, history] = await Promise.all([
    apiRequest<ReferenceData>('/reference')
      .then((r) => r.data.countries).catch(() => []),
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
          <Link href="/participants" style={{ fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
            ← Participants
          </Link>
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
              countries={countries}
              canSetStatus={can(viewer, 'users.deactivate')}
              // Roles never render in edit mode regardless — UserForm only
              // offers them at creation, staff get theirs from RolesPanel on
              // /users/:id once promoted. Nothing to wire up here.
              canAssignRoles={false}
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
                  <dt className={panel.factLabel}>Phone</dt>
                  <dd className={panel.factValue}>{target.phone ?? '-'}</dd>
                </div>
                <div className={panel.factRow}>
                  <dt className={panel.factLabel}>Country</dt>
                  <dd className={panel.factValue}>{target.countryCode ?? '-'}</dd>
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
                <dt className={panel.factLabel}>Organization</dt>
                <dd className={panel.factValue}>{target.organization ?? 'Not set'}</dd>
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

          {canEdit && (
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
