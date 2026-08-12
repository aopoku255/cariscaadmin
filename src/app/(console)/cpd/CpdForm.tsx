'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Callout, Field, inputClass, selectClass, textareaClass, checkRowClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { ImageUpload } from '@/components/forms/ImageUpload';
import type { ReferenceData } from '@/lib/api/types';
import { createCpdAction, updateCpdAction } from './actions';
import { emptyAdminState } from './state';
import type { AdminCpdEvent } from './types';
import styles from './cpd.module.css';

/** Splits an ISO instant into the date and time inputs the form uses. */
function parts(iso: string | null | undefined) {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toISOString().slice(11, 16),
  };
}

const TIMEZONES = [
  'Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Europe/London', 'America/New_York', 'UTC',
];

export function CpdForm({
  event, countries, apiBase,
}: { event?: AdminCpdEvent; countries: ReferenceData['countries']; apiBase: string }) {
  const [state, formAction] = useActionState(
    event ? updateCpdAction : createCpdAction,
    emptyAdminState,
  );

  const [deliveryMode, setDeliveryMode] = useState(event?.deliveryMode ?? 'OFFLINE');
  const [attendanceRule, setAttendanceRule] = useState(event?.attendance?.rule ?? 'CHECK_IN');
  const [issuesCertificate, setIssuesCertificate] = useState(event?.issuesCertificate ?? false);

  const start = parts(event?.startAt);
  const end = parts(event?.endAt);
  const closes = parts(event?.registrationClosesAt);
  const err = (k: string) => state.fieldErrors?.[k];

  const needsVenue = deliveryMode !== 'ONLINE';
  const needsLink = deliveryMode !== 'OFFLINE';

  return (
    <form action={formAction} className={styles.form}>
      {event && <input type="hidden" name="id" value={event.id} />}

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'} title={state.ok ? undefined : 'Could not save'}>
          {state.message}
        </Callout>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>The basics</legend>

        <Field label="Title" htmlFor="title" error={err('title')} required>
          <input id="title" name="title" className={inputClass} required
            defaultValue={event?.title} maxLength={255} />
        </Field>

        <Field label="Short description" htmlFor="shortDescription" error={err('shortDescription')}
          hint="One or two sentences. This is what appears on the events list.">
          <textarea id="shortDescription" name="shortDescription" className={textareaClass}
            maxLength={500} defaultValue={event?.shortDescription ?? ''} style={{ minHeight: 70 }} />
        </Field>

        <Field label="Full description" htmlFor="description" error={err('description')}
          hint="Leave a blank line between paragraphs.">
          <textarea id="description" name="description" className={textareaClass}
            defaultValue={event?.description ?? ''} style={{ minHeight: 160 }} />
        </Field>

        <ImageUpload
          name="bannerFileId"
          apiBase={apiBase}
          initial={event?.banner ? { id: event.banner.id, url: event.banner.url } : null}
          hint="Shown on the event page and in listings. Landscape works best. It is cropped to 16:9."
        />
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>When</legend>
        <p className={styles.groupNote}>
          Times are in the event&apos;s own timezone. Participants always see them
          in that timezone, wherever they are.
        </p>

        <div className={styles.pair}>
          <Field label="Starts" htmlFor="startDate" error={err('startAt')} required>
            <div className={styles.inline}>
              <input id="startDate" name="startDate" type="date" className={inputClass}
                required defaultValue={start.date} />
              <input name="startTime" type="time" className={inputClass}
                defaultValue={start.time || '09:00'} aria-label="Start time" />
            </div>
          </Field>

          <Field label="Ends" htmlFor="endDate" error={err('endAt')} required>
            <div className={styles.inline}>
              <input id="endDate" name="endDate" type="date" className={inputClass}
                required defaultValue={end.date} />
              <input name="endTime" type="time" className={inputClass}
                defaultValue={end.time || '16:00'} aria-label="End time" />
            </div>
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Timezone" htmlFor="timezone" required>
            <select id="timezone" name="timezone" className={selectClass}
              defaultValue={event?.timezone ?? 'Africa/Accra'}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>

          <Field label="Registration closes" htmlFor="registrationClosesDate"
            hint="Optional. Leave blank to close it manually.">
            <div className={styles.inline}>
              <input id="registrationClosesDate" name="registrationClosesDate" type="date"
                className={inputClass} defaultValue={closes.date} />
              <input name="registrationClosesTime" type="time" className={inputClass}
                defaultValue={closes.time || '23:59'} aria-label="Registration closing time" />
            </div>
          </Field>
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Where</legend>

        <Field label="Format" htmlFor="deliveryMode" required>
          <select id="deliveryMode" name="deliveryMode" className={selectClass}
            value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value as typeof deliveryMode)}>
            <option value="OFFLINE">In person only</option>
            <option value="ONLINE">Online only</option>
            <option value="HYBRID">Both in person and online</option>
          </select>
        </Field>

        {needsVenue && (
          <>
            <Field label="Venue" htmlFor="venue" error={err('venue')} required={needsVenue}
              hint="Required before you can publish an in-person event.">
              <input id="venue" name="venue" className={inputClass} defaultValue={event?.location?.venue ?? ''} />
            </Field>

            <div className={styles.pair}>
              <Field label="City" htmlFor="city">
                <input id="city" name="city" className={inputClass} defaultValue={event?.location?.city ?? ''} />
              </Field>
              <Field label="Country" htmlFor="countryCode">
                <select id="countryCode" name="countryCode" className={selectClass}
                  defaultValue={event?.location?.countryCode ?? 'GH'}>
                  <option value="">Not set</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {needsLink && (
          <Field label="Joining link" htmlFor="onlineUrl" error={err('onlineUrl')}
            hint="Only shared with confirmed participants, never shown publicly.">
            <input id="onlineUrl" name="onlineUrl" type="url" className={inputClass}
              defaultValue={event?.onlineUrl ?? ''} placeholder="https://" />
          </Field>
        )}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Places</legend>

        <div className={styles.pair}>
          <Field label="In-person capacity" htmlFor="capacity" hint="Leave blank for no limit.">
            <input id="capacity" name="capacity" type="number" min={1} className={inputClass}
              defaultValue={event?.capacity ?? ''} />
          </Field>
          <Field label="Online capacity" htmlFor="virtualCapacity" hint="Leave blank for no limit.">
            <input id="virtualCapacity" name="virtualCapacity" type="number" min={1} className={inputClass}
              defaultValue={event?.virtualCapacity ?? ''} />
          </Field>
        </div>

        <label className={checkRowClass}>
          <input type="checkbox" name="allowWaitlist" defaultChecked={event?.allowWaitlist ?? true} />
          <span>
            <strong>Keep a waitlist when full</strong>
            <span className={styles.checkNote}>
              People who register after capacity is reached are held in order and
              offered a place automatically if someone cancels.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Attendance and certificates</legend>

        <Field label="How attendance is measured" htmlFor="attendanceRule">
          <select id="attendanceRule" name="attendanceRule" className={selectClass}
            value={attendanceRule} onChange={(e) => setAttendanceRule(e.target.value as typeof attendanceRule)}>
            <option value="NONE">Not tracked</option>
            <option value="CHECK_IN">Checking in at the event is enough</option>
            <option value="SESSION_PERCENT">A minimum percentage of sessions</option>
          </select>
        </Field>

        {attendanceRule === 'SESSION_PERCENT' && (
          <Field label="Minimum attendance" htmlFor="minAttendancePercent" required
            hint="You will also need at least one required session before publishing.">
            <input id="minAttendancePercent" name="minAttendancePercent" type="number"
              min={1} max={100} className={inputClass}
              defaultValue={event?.attendance?.minPercent ?? 80} />
          </Field>
        )}

        <label className={checkRowClass}>
          <input type="checkbox" name="issuesCertificate"
            checked={issuesCertificate} onChange={(e) => setIssuesCertificate(e.target.checked)} />
          <span>
            <strong>Award a certificate</strong>
            <span className={styles.checkNote}>
              Participants who meet the attendance rule get a verifiable certificate.
            </span>
          </span>
        </label>

        {issuesCertificate && (
          <label className={checkRowClass}>
            <input type="checkbox" name="certificateRequiresPayment"
              defaultChecked={event?.certificate?.requiresPayment ?? false} />
            <span>
              <strong>Require payment before issuing</strong>
              <span className={styles.checkNote}>
                Leave this off for a free event. Otherwise eligibility waits on a
                payment that will never arrive and no certificate is ever issued.
              </span>
            </span>
          </label>
        )}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>CPD details</legend>

        <div className={styles.pair}>
          <Field label="CPD credits" htmlFor="cpdCredits" hint="Leave blank if none are awarded.">
            <input id="cpdCredits" name="cpdCredits" type="number" step="0.5" min={0}
              className={inputClass} defaultValue={event?.cpd?.credits ?? ''} />
          </Field>
          <Field label="Accrediting body" htmlFor="accreditingBody">
            <input id="accreditingBody" name="accreditingBody" className={inputClass}
              defaultValue={event?.cpd?.accreditingBody ?? ''} />
          </Field>
        </div>

        <Field label="Learning objectives" htmlFor="learningObjectives" hint="One per line.">
          <textarea id="learningObjectives" name="learningObjectives" className={textareaClass}
            defaultValue={(event?.cpd?.learningObjectives ?? []).join('\n')} />
        </Field>

        <Field label="Who it is for" htmlFor="targetAudience" hint="One per line.">
          <textarea id="targetAudience" name="targetAudience" className={textareaClass}
            defaultValue={(event?.cpd?.targetAudience ?? []).join('\n')} style={{ minHeight: 90 }} />
        </Field>

        <Field label="What participants need to bring" htmlFor="requirements">
          <textarea id="requirements" name="requirements" className={textareaClass}
            defaultValue={event?.cpd?.requirements ?? ''} style={{ minHeight: 90 }} />
        </Field>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Contact</legend>
        <div className={styles.pair}>
          <Field label="Contact email" htmlFor="contactEmail" error={err('contactEmail')}>
            <input id="contactEmail" name="contactEmail" type="email" className={inputClass}
              defaultValue={event?.contact?.email ?? 'info@carisca.knust.edu.gh'} />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone">
            <input id="contactPhone" name="contactPhone" type="tel" className={inputClass}
              defaultValue={event?.contact?.phone ?? ''} />
          </Field>
        </div>
      </fieldset>

      <div className={styles.formActions}>
        <SubmitButton size="lg" pendingLabel="Saving…">
          {event ? 'Save changes' : 'Create as draft'}
        </SubmitButton>
        <Link href={event ? `/cpd/${event.id}` : '/cpd'} className={styles.cancel}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
