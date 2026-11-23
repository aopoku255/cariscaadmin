'use client';

import { useActionState } from 'react';
import { Callout, Field, inputClass, selectClass, textareaClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { sendEmailAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../../users/users.module.css';

export function EmailForm({
  events, eventId, reference, status, attendanceMode, recipients, countFailed,
}: {
  events: { id: string; title: string }[];
  eventId?: string;
  reference?: string;
  status?: string;
  attendanceMode?: string;
  recipients: number | null;
  countFailed: boolean;
}) {
  const [state, formAction] = useActionState(sendEmailAction, emptyAdminState);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className={styles.form}>
      {reference && <input type="hidden" name="reference" value={reference} />}
      {status && <input type="hidden" name="status" value={status} />}
      {attendanceMode && <input type="hidden" name="attendanceMode" value={attendanceMode} />}

      {state.message && <Callout tone="danger" title="Could not send">{state.message}</Callout>}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>To</legend>

        <Field label="Event" htmlFor="eventId" error={err('eventId')} required>
          {/* Changing the event reloads the page so the recipient count follows it. */}
          <select id="eventId" name="eventId" className={selectClass} required
            defaultValue={eventId ?? ''} disabled={!!reference}
            onChange={(e) => { window.location.href = `/registrations/email?eventId=${e.target.value}`; }}>
            <option value="" disabled>Choose an event</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </Field>
        {reference && <input type="hidden" name="eventId" value={eventId} />}

        {eventId && (
          <p className={styles.groupNote}>
            {countFailed ? 'We could not work out how many people this reaches.'
              : recipients === 0 ? 'No one matches, so there is no one to email.'
                : `This reaches ${recipients} ${recipients === 1 ? 'person' : 'people'}. Cancelled and refunded registrations are never included.`}
          </p>
        )}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Message</legend>

        <Field label="Subject" htmlFor="subject" error={err('subject')} required>
          <input id="subject" name="subject" className={inputClass} required maxLength={150} />
        </Field>

        <Field label="Message" htmlFor="message" error={err('message')} required
          hint="Plain text. Each person is greeted by name, and the email shows the event and a link to their registration. Leave a blank line between paragraphs.">
          <textarea id="message" name="message" className={textareaClass} rows={10} required maxLength={10000} />
        </Field>
      </fieldset>

      <div className={styles.formActions}>
        <SubmitButton pendingLabel="Sending…">
          {recipients === 1 ? 'Send email' : `Send to ${recipients ?? 'everyone'}`}
        </SubmitButton>
      </div>
    </form>
  );
}
