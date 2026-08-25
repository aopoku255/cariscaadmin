'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, Field, inputClass, textareaClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { Registration } from '@/lib/api/types';
import { money } from '@/lib/format';
import { waiveFeeAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../../users/users.module.css';

/**
 * Reduces or zeroes what someone owes for an event — a sponsor covering
 * their place, a hardship case, a speaker who should not pay to attend their
 * own session.
 *
 * Behind a toggle rather than always open, the same reasoning as resetting a
 * password: it is a deliberate act with its own audit entry, not something to
 * brush past while glancing at the record.
 */
export function WaiveFeePanel({ registration }: { registration: Registration }) {
  const [state, formAction] = useActionState(waiveFeeAction, emptyAdminState);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(registration.amount?.formatted ?? '0');

  // Nothing to waive on a registration that was never priced — an event
  // with no fee configured at all, currency and all.
  if (!registration.amount) return null;

  const alreadyWaived = !!registration.originalAmount;
  const ceiling = registration.originalAmount ?? registration.amount;

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Fee</h2>

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {!open ? (
        <>
          <p className={styles.panelNote}>
            {alreadyWaived ? (
              <>
                Reduced from {money(registration.originalAmount)} to{' '}
                {registration.amount.amountMinor === 0 ? 'free' : money(registration.amount)}.
                {registration.waiverReason && ` "${registration.waiverReason}"`}
                {registration.waivedBy && ` — ${registration.waivedBy.name}`}
              </>
            ) : (
              `Currently ${registration.amount.amountMinor === 0 ? 'free' : money(registration.amount)}.`
            )}
          </p>
          <Button size="sm" variant="secondary" onClick={() => { setOpen(true); }}>
            {alreadyWaived ? 'Adjust the waiver' : 'Waive this fee'}
          </Button>
        </>
      ) : (
        <form action={formAction} className={styles.form} style={{ gap: 'var(--space-4)' }}>
          <input type="hidden" name="reference" value={registration.reference} />

          <Field label="New amount" htmlFor="amount" error={state.fieldErrors?.amount} required
            hint={`In ${registration.amount.currency}. Cannot exceed what they were originally quoted, ${money(ceiling)}.`}>
            <input id="amount" name="amount" className={inputClass} required
              inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          </Field>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAmount('0')}>
              Waive in full
            </Button>
            {alreadyWaived && (
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setAmount(ceiling.formatted)}>
                Restore original fee
              </Button>
            )}
          </div>

          <Field label="Reason" htmlFor="reason" required hint="Recorded in the audit trail.">
            <textarea id="reason" name="reason" className={textareaClass} rows={2} required />
          </Field>

          <div className={styles.formActions}>
            <SubmitButton size="sm" pendingLabel="Saving…">Save fee</SubmitButton>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
