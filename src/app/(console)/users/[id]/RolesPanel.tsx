'use client';

import { useActionState } from 'react';
import { Callout } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { AdminUser, Role } from '@/lib/api/types';
import { setRolesAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../users.module.css';

/**
 * Roles, edited on their own rather than as part of the profile form.
 *
 * Changing what someone is allowed to do is the one edit on this page worth
 * pausing over, and it produces its own audit entry — burying it among job
 * titles would make both harder to review afterwards.
 */
export function RolesPanel({
  user, roles, isSelf,
}: { user: AdminUser; roles: Role[]; isSelf: boolean }) {
  const [state, formAction] = useActionState(setRolesAction, emptyAdminState);
  const assigned = new Set(user.roles?.map((r) => r.key) ?? []);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Roles</h2>

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}
      {state.fieldErrors?.roleKeys && (
        <Callout tone="danger">{state.fieldErrors.roleKeys}</Callout>
      )}

      {isSelf ? (
        <>
          <p className={styles.panelNote}>
            You cannot change your own roles. Ask another administrator — it is
            the one change that can lock the last administrator out.
          </p>
          <p className={styles.factValue}>
            {user.roles?.map((r) => r.name).join(', ') || 'None'}
          </p>
        </>
      ) : (
        <form action={formAction} className={styles.roleList}>
          <input type="hidden" name="id" value={user.id} />

          {roles.map((r) => (
            <label key={r.key} className={styles.roleOption}>
              <input type="checkbox" name="roleKeys" value={r.key}
                defaultChecked={assigned.has(r.key)} />
              <span>
                <span className={styles.roleName}>{r.name}</span>
                {r.description && <span className={styles.roleDescription}>{r.description}</span>}
                <span className={styles.rolePermissions}>
                  {r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}
                </span>
              </span>
            </label>
          ))}

          <SubmitButton size="sm" pendingLabel="Updating…">Update roles</SubmitButton>
        </form>
      )}
    </section>
  );
}
