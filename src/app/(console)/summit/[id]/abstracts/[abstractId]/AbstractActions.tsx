'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, textareaClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { claimAbstractAction, decideAbstractAction } from '../../../actions';
import { emptyAdminState } from '../../../state';
import styles from '@/components/admin/event/AdminEvent.module.css';

/**
 * Claim and decide, side by side: claiming moves a submission to
 * UNDER_REVIEW and is the wider-held permission (abstract.review); deciding
 * is terminal and is the narrower one (abstract.decide) — a reviewer who can
 * read and comment is not automatically the one who gets the final say.
 */
export function AbstractActions({
  eventId, abstractId, canClaim, canDecide, editable,
}: {
  eventId: string; abstractId: string; canClaim: boolean; canDecide: boolean; editable: boolean;
}) {
  const [claimState, claimAction] = useActionState(claimAbstractAction, emptyAdminState);
  const [decideState, decideAction] = useActionState(decideAbstractAction, emptyAdminState);
  const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED' | null>(null);

  if (!editable) {
    return <p className={styles.lifecycleNote}>This submission already has a decision.</p>;
  }

  return (
    <div className={styles.lifecycle}>
      {claimState.message && <Callout tone={claimState.ok ? 'success' : 'danger'}>{claimState.message}</Callout>}
      {decideState.message && <Callout tone={decideState.ok ? 'success' : 'danger'}>{decideState.message}</Callout>}

      {canClaim && (
        <form action={claimAction} className={styles.cancelForm}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="abstractId" value={abstractId} />
          <label className={styles.cancelLabel} htmlFor="claim-notes">Review notes (staff-only)</label>
          <textarea id="claim-notes" name="notes" className={textareaClass} rows={3}
            placeholder="What you noticed reviewing this — never shown to the author." />
          <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
            Claim for review
          </SubmitButton>
        </form>
      )}

      {canDecide && (
        <div className={styles.cancelForm}>
          {decision === null ? (
            <div className={styles.lifecycleButtons}>
              <Button type="button" size="sm" onClick={() => setDecision('ACCEPTED')}>Accept</Button>
              <Button type="button" variant="danger" size="sm" onClick={() => setDecision('REJECTED')}>Reject</Button>
            </div>
          ) : (
            <form action={decideAction}
              onSubmit={(e) => {
                const verb = decision === 'ACCEPTED' ? 'accept' : 'reject';
                if (!window.confirm(`${verb === 'accept' ? 'Accept' : 'Reject'} this submission? The author is emailed immediately and this cannot be undone.`)) {
                  e.preventDefault();
                }
              }}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="abstractId" value={abstractId} />
              <input type="hidden" name="decision" value={decision} />
              <label className={styles.cancelLabel} htmlFor="decide-notes">
                {decision === 'ACCEPTED' ? 'A note for the author (optional)' : 'Why is it being rejected? The author sees this.'}
              </label>
              <textarea id="decide-notes" name="notes" className={textareaClass} rows={3} />
              <div className={styles.cancelActions}>
                <SubmitButton size="sm" variant={decision === 'ACCEPTED' ? 'primary' : 'danger'} pendingLabel="Recording…">
                  Confirm {decision === 'ACCEPTED' ? 'acceptance' : 'rejection'}
                </SubmitButton>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDecision(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
