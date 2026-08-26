'use client';

import { useActionState, useState } from 'react';
import { Callout, Button } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { EventStatus, SessionUser } from '@/lib/api/types';
import { can } from '@/lib/auth/permissions';
import { emptyAdminState, type AdminAction } from './state';
import styles from './AdminEvent.module.css';

/**
 * The lifecycle buttons.
 *
 * Only transitions that are legal from the current status are offered — the
 * state machine's rules mirrored here so an admin is never invited to press
 * something that will 409. The API still enforces it.
 *
 * Shared between CPD and Summit: the transitions, their required roles and
 * their confirmations are identical in shape between the two modules — only
 * the permission keys differ, by module prefix (`cpd.publish` vs
 * `summit.publish`), which is the one thing `permissionPrefix` carries.
 */
const TRANSITIONS: Record<string, {
  from: EventStatus[]; label: string; permission: string;
  tone?: 'primary' | 'secondary' | 'danger'; confirm?: string; needsReason?: boolean;
}> = {
  publish: {
    from: ['DRAFT', 'PENDING_APPROVAL'],
    label: 'Publish',
    permission: 'publish',
    tone: 'primary',
    confirm: 'Publish this event? It becomes visible on the public site immediately.',
  },
  'open-registration': {
    from: ['PUBLISHED', 'REGISTRATION_CLOSED'],
    label: 'Open registration',
    permission: 'publish',
    tone: 'primary',
    confirm: 'Open registration? People will be able to sign up straight away.',
  },
  'close-registration': {
    from: ['REGISTRATION_OPEN'],
    label: 'Close registration',
    permission: 'update',
    tone: 'secondary',
    confirm: 'Close registration? Nobody new will be able to sign up.',
  },
  unpublish: {
    from: ['PUBLISHED'],
    label: 'Return to draft',
    permission: 'publish',
    tone: 'secondary',
  },
  start: {
    from: ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED'],
    label: 'Mark as started',
    permission: 'update',
    tone: 'secondary',
  },
  complete: {
    from: ['ONGOING', 'REGISTRATION_CLOSED'],
    label: 'Mark as finished',
    permission: 'update',
    tone: 'secondary',
  },
  cancel: {
    from: ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'],
    label: 'Cancel event',
    permission: 'cancel',
    tone: 'danger',
    confirm: 'Cancel this event? Everyone registered is emailed immediately. This cannot be undone.',
    needsReason: true,
  },
  archive: {
    from: ['COMPLETED', 'CANCELLED'],
    label: 'Archive',
    permission: 'archive',
    tone: 'secondary',
  },
};

export function LifecycleControls({
  eventId, status, user, permissionPrefix, action,
}: {
  eventId: string; status: EventStatus; user: SessionUser; permissionPrefix: 'cpd' | 'summit'; action: AdminAction;
}) {
  const [state, formAction] = useActionState(action, emptyAdminState);
  const [cancelling, setCancelling] = useState(false);

  const permissionFor = (t: (typeof TRANSITIONS)[string]) => `${permissionPrefix}.${t.permission}`;

  const available = Object.entries(TRANSITIONS).filter(
    ([, t]) => t.from.includes(status) && can(user, permissionFor(t)),
  );

  // Everything is either done or beyond this user's role.
  const blocked = Object.entries(TRANSITIONS).filter(
    ([, t]) => t.from.includes(status) && !can(user, permissionFor(t)),
  );

  return (
    <div className={styles.lifecycle}>
      {state.problems && state.problems.length > 0 && (
        <Callout tone="warning" title="This event is not ready to publish">
          <ul className={styles.problems}>
            {state.problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Callout>
      )}

      {state.message && !state.problems && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {available.length === 0 && blocked.length === 0 && (
        <p className={styles.lifecycleNote}>No further actions are available at this stage.</p>
      )}

      <div className={styles.lifecycleButtons}>
        {available.map(([action_, t]) => {
          if (action_ === 'cancel') {
            return (
              <Button key={action_} type="button" variant="danger" size="sm"
                onClick={() => setCancelling(true)}>
                {t.label}
              </Button>
            );
          }
          return (
            <form key={action_} action={formAction}
              onSubmit={(e) => {
                if (t.confirm && !window.confirm(t.confirm)) e.preventDefault();
              }}>
              <input type="hidden" name="id" value={eventId} />
              <input type="hidden" name="action" value={action_} />
              <SubmitButton size="sm" variant={t.tone === 'primary' ? 'primary' : 'secondary'}>
                {t.label}
              </SubmitButton>
            </form>
          );
        })}
      </div>

      {cancelling && (
        <form action={formAction} className={styles.cancelForm}
          onSubmit={(e) => {
            if (!window.confirm(TRANSITIONS.cancel.confirm)) e.preventDefault();
          }}>
          <input type="hidden" name="id" value={eventId} />
          <input type="hidden" name="action" value="cancel" />
          <label className={styles.cancelLabel} htmlFor="cancel-reason">
            Why is it being cancelled? Participants see this in the email.
          </label>
          <textarea id="cancel-reason" name="reason" required maxLength={500}
            className={styles.cancelReason} rows={2}
            placeholder="e.g. The facilitator is no longer available" />
          <div className={styles.cancelActions}>
            <SubmitButton variant="danger" size="sm" pendingLabel="Cancelling…">
              Cancel the event and notify everyone
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelling(false)}>
              Keep it
            </Button>
          </div>
        </form>
      )}

      {blocked.length > 0 && (
        // Phrased to avoid subject-verb agreement entirely — the list length
        // varies, and "Cancel event is available but need a role" reads badly.
        <p className={styles.lifecycleNote}>
          Possible at this stage, but not for your role:{' '}
          {blocked.map(([, t]) => t.label).join(', ')}.
        </p>
      )}
    </div>
  );
}
