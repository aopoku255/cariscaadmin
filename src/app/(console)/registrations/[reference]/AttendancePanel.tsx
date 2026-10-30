'use client';

import { useActionState } from 'react';
import { Badge, Callout } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { Registration } from '@/lib/api/types';
import { timestamp } from '@/lib/format';
import { markAttendedAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../../users/users.module.css';

/** Whether this person was admitted, and a way to record it by hand when no scan happened. */
export function AttendancePanel({ registration, canMark }: { registration: Registration; canMark: boolean }) {
  const [state, formAction] = useActionState(markAttendedAction, emptyAdminState);
  const record = registration.attendance;
  const admitted = record && ['CHECKED_IN', 'ATTENDED'].includes(record.status);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>Attendance</h2>

      {state.message && <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>}

      {admitted ? (
        <p className={styles.panelNote}>
          <Badge tone="success">Attended</Badge>{' '}
          {record.checkedInAt ? `Checked in ${timestamp(record.checkedInAt)}` : ''}
          {record.method === 'MANUAL' ? ' (marked by hand)' : ''}
        </p>
      ) : (
        <>
          <p className={styles.panelNote}>
            {record?.status === 'ABSENT' ? 'Marked absent when attendance was closed.' : 'Not yet marked as attended.'}
          </p>
          {canMark && ['CONFIRMED', 'PENDING_PAYMENT', 'REQUIRES_REVIEW'].includes(registration.status) && (
            <form action={formAction}>
              <input type="hidden" name="reference" value={registration.reference} />
              <SubmitButton size="sm" pendingLabel="Saving…">Mark as attended</SubmitButton>
            </form>
          )}
        </>
      )}
    </section>
  );
}
