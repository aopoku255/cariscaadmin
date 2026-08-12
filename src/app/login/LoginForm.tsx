'use client';

import { useActionState } from 'react';
import { Callout, Field, inputClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { loginAction } from '@/lib/auth/actions';
import { emptyState } from '@/lib/auth/form-state';
import styles from './login.module.css';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, emptyState);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />

      {state.message && (
        <Callout tone="danger" title="We could not sign you in">{state.message}</Callout>
      )}

      <Field label="Email address" htmlFor="email" error={state.fieldErrors?.email} required>
        <input id="email" name="email" type="email" autoComplete="email"
          className={inputClass} required autoFocus />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} required>
        <input id="password" name="password" type="password" autoComplete="current-password"
          className={inputClass} required />
      </Field>

      <SubmitButton fullWidth size="lg" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
