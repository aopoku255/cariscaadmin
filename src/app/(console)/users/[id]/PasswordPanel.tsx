'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, Field, inputClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { resetPasswordAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../users.module.css';

/**
 * Setting somebody else's password, for when they cannot receive email.
 *
 * Behind a toggle rather than always open: it destroys every session the
 * person has, and it should take a deliberate click to get there.
 */
export function PasswordPanel({ userId, name }: { userId: string; name: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, emptyAdminState);
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Password</h2>

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {!open ? (
        <>
          <p className={styles.panelNote}>
            Sets a new password for {name} and signs them out everywhere. Use it
            only when they cannot reset it themselves.
          </p>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Set a new password
          </Button>
        </>
      ) : (
        <form action={formAction} className={styles.form} style={{ gap: 'var(--space-4)' }}>
          <input type="hidden" name="id" value={userId} />

          <Field label="New password" htmlFor="password" error={state.fieldErrors?.password}
            required hint="At least 12 characters.">
            <input id="password" name="password" type="text" className={inputClass}
              required minLength={12} maxLength={200} autoComplete="new-password" />
          </Field>

          <Field label="Type it again" htmlFor="passwordConfirm"
            error={state.fieldErrors?.passwordConfirm} required>
            <input id="passwordConfirm" name="passwordConfirm" type="text" className={inputClass}
              required minLength={12} maxLength={200} autoComplete="new-password" />
          </Field>

          <div className={styles.formActions}>
            <SubmitButton size="sm" variant="danger" pendingLabel="Setting…">
              Set password
            </SubmitButton>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
