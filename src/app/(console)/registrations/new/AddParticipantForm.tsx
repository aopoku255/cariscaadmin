'use client';

import { useActionState } from 'react';
import {
  Callout, Field, inputClass, selectClass, checkRowClass,
} from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { ReferenceData } from '@/lib/api/types';
import { addParticipantToEventAction } from '../actions';
import { emptyAdminState } from '../../cpd/state';
import styles from '../../users/users.module.css';

export function AddParticipantForm({
  events, reference, selectedEventId,
}: {
  events: { id: string; title: string; kind: string }[];
  reference: ReferenceData | null;
  selectedEventId?: string;
}) {
  const [state, formAction] = useActionState(addParticipantToEventAction, emptyAdminState);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className={styles.form}>
      {state.message && (
        <Callout tone="danger" title="Could not add them">{state.message}</Callout>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>The event</legend>

        <Field label="Event" htmlFor="eventId" error={err('eventId')} required>
          <select id="eventId" name="eventId" className={selectClass} required
            defaultValue={selectedEventId ?? ''}>
            <option value="" disabled>Choose an event</option>
            {events.map((e) => (
              <option key={`${e.kind}-${e.id}`} value={e.id}>{e.title} ({e.kind})</option>
            ))}
          </select>
        </Field>

        <Field label="Attending" htmlFor="attendanceMode">
          <select id="attendanceMode" name="attendanceMode" className={selectClass} defaultValue="IN_PERSON">
            <option value="IN_PERSON">In person</option>
            <option value="VIRTUAL">Online</option>
          </select>
        </Field>

        <label className={checkRowClass}>
          <input type="checkbox" name="waiveFee" />
          <span>
            Waive the fee
            <span className={styles.groupNote} style={{ display: 'block' }}>
              Confirms the registration straight away with nothing to pay. Leave
              unticked and a paid event holds their place until they pay.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>The participant</legend>

        <div className={styles.pair}>
          <Field label="First name" htmlFor="firstName" error={err('firstName')} required>
            <input id="firstName" name="firstName" className={inputClass} required maxLength={80} autoComplete="off" />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={err('lastName')} required>
            <input id="lastName" name="lastName" className={inputClass} required maxLength={80} autoComplete="off" />
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Email address" htmlFor="email" error={err('email')} required
            hint="Their confirmation and, for a new account, their sign-in details go here.">
            <input id="email" name="email" type="email" className={inputClass} required maxLength={255} autoComplete="off" />
          </Field>
          <Field label="Gender" htmlFor="gender" error={err('gender')} required>
            <select id="gender" name="gender" className={selectClass} defaultValue="" required>
              <option value="" disabled>Select one</option>
              {(reference?.genders ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Phone" htmlFor="phone" error={err('phone')}>
            <input id="phone" name="phone" type="tel" className={inputClass} maxLength={32} autoComplete="off" />
          </Field>
          <Field label="Country" htmlFor="countryCode" error={err('countryCode')}
            hint="Decides the fee and payment method for events priced by region.">
            <select id="countryCode" name="countryCode" className={selectClass} defaultValue="">
              <option value="">Not given</option>
              {(reference?.countries ?? []).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Organization" htmlFor="organization" error={err('organization')}>
            <input id="organization" name="organization" className={inputClass} maxLength={160} autoComplete="off" />
          </Field>
          <Field label="Job title" htmlFor="jobTitle" error={err('jobTitle')}>
            <input id="jobTitle" name="jobTitle" className={inputClass} maxLength={160} autoComplete="off" />
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Position" htmlFor="positionKey" error={err('positionKey')}>
            <select id="positionKey" name="positionKey" className={selectClass} defaultValue="">
              <option value="">Not given</option>
              {(reference?.positions ?? []).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Sector" htmlFor="sectorKey" error={err('sectorKey')}>
            <select id="sectorKey" name="sectorKey" className={selectClass} defaultValue="">
              <option value="">Not given</option>
              {(reference?.sectors ?? []).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Password" htmlFor="password" error={err('password')}
          hint="Optional, for a new account only. Leave blank and we generate one and email it to them.">
          <input id="password" name="password" type="text" className={inputClass}
            minLength={10} maxLength={200} autoComplete="off" />
        </Field>
      </fieldset>

      <div className={styles.formActions}>
        <SubmitButton pendingLabel="Adding…">Add to event</SubmitButton>
      </div>
    </form>
  );
}
