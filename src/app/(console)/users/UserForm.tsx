'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  Callout, Field, inputClass, selectClass, checkRowClass,
} from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { AdminUser, Department, Role, ReferenceData } from '@/lib/api/types';
import { createUserAction, updateUserAction } from './actions';
import { emptyAdminState } from '../cpd/state';
import styles from './users.module.css';

const TIMEZONES = [
  'Africa/Accra', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Europe/London', 'America/New_York', 'UTC',
];

/**
 * One form for creating and editing.
 *
 * Email and password appear only when creating: changing an address has to
 * re-verify it, which is its own flow, and setting a password is a separate,
 * deliberately noisier action on the detail page.
 */
export function UserForm({
  user, roles, departments, countries, canSetStatus, canAssignRoles,
}: {
  user?: AdminUser;
  roles: Role[];
  departments: Department[];
  countries: ReferenceData['countries'];
  canSetStatus: boolean;
  canAssignRoles: boolean;
}) {
  const [state, formAction] = useActionState(
    user ? updateUserAction : createUserAction,
    emptyAdminState,
  );

  const assigned = new Set(user?.roles?.map((r) => r.key) ?? []);
  const [staffChecked, setStaffChecked] = useState(user?.isStaff ?? false);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className={styles.form}>
      {user && <input type="hidden" name="id" value={user.id} />}

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'} title={state.ok ? undefined : 'Could not save'}>
          {state.message}
        </Callout>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Who they are</legend>

        <div className={styles.pair}>
          <Field label="First name" htmlFor="firstName" error={err('firstName')} required>
            <input id="firstName" name="firstName" className={inputClass} required
              defaultValue={user?.firstName} maxLength={80} autoComplete="off" />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={err('lastName')} required>
            <input id="lastName" name="lastName" className={inputClass} required
              defaultValue={user?.lastName} maxLength={80} autoComplete="off" />
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="Title" htmlFor="prefix" hint="Dr, Prof, Mr, Ms.">
            <input id="prefix" name="prefix" className={inputClass}
              defaultValue={user?.prefix ?? ''} maxLength={16} />
          </Field>
          <Field label="Middle name" htmlFor="middleName">
            <input id="middleName" name="middleName" className={inputClass}
              defaultValue={user?.middleName ?? ''} maxLength={80} />
          </Field>
        </div>

        {!user && (
          <Field label="Email address" htmlFor="email" error={err('email')} required
            hint="This is what they sign in with. It cannot be changed here afterwards.">
            <input id="email" name="email" type="email" className={inputClass} required
              maxLength={190} autoComplete="off" />
          </Field>
        )}

        <div className={styles.pair}>
          <Field label="Phone" htmlFor="phone" error={err('phone')}>
            <input id="phone" name="phone" type="tel" className={inputClass}
              defaultValue={user?.phone ?? ''} maxLength={32} />
          </Field>
          <Field label="Country" htmlFor="countryCode" error={err('countryCode')}>
            <select id="countryCode" name="countryCode" className={selectClass}
              defaultValue={user?.countryCode ?? ''}>
              <option value="">Not set</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      </fieldset>

      {!user && (
        <fieldset className={styles.group}>
          <legend className={styles.groupTitle}>Their first password</legend>
          <p className={styles.groupNote}>
            You set this and pass it on to them yourself — there is no invitation
            email yet. Ask them to change it from their profile once they are in.
          </p>

          <Field label="Password" htmlFor="password" error={err('password')} required
            hint="At least 12 characters. Length matters more than symbols.">
            <input id="password" name="password" type="text" className={inputClass} required
              minLength={12} maxLength={200} autoComplete="new-password"
              /* Deliberately visible: the administrator has to read it out or
                 copy it, and a masked field they cannot check invites typos. */ />
          </Field>
        </fieldset>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Where they work</legend>

        <div className={styles.pair}>
          <Field label="Organization" htmlFor="organization" error={err('organization')}>
            <input id="organization" name="organization" className={inputClass}
              defaultValue={user?.organization ?? ''} maxLength={160} />
          </Field>
          <Field label="Job title" htmlFor="jobTitle" error={err('jobTitle')}>
            <input id="jobTitle" name="jobTitle" className={inputClass}
              defaultValue={user?.jobTitle ?? ''} maxLength={160} />
          </Field>
        </div>

        <div className={styles.pair}>
          <Field label="City" htmlFor="city">
            <input id="city" name="city" className={inputClass}
              defaultValue={user?.city ?? ''} maxLength={120} />
          </Field>
          <Field label="Timezone" htmlFor="timezone">
            <select id="timezone" name="timezone" className={selectClass}
              defaultValue={user?.timezone ?? 'Africa/Accra'}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>

        <Field label="CARISCA department" htmlFor="departmentId" error={err('departmentId')}
          hint="For staff. Leave unset for external participants.">
          <select id="departmentId" name="departmentId" className={selectClass}
            defaultValue={user?.departmentId ?? ''}>
            <option value="">Not set</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.groupTitle}>Access</legend>

        <label className={checkRowClass}>
          <input type="checkbox" name="isStaff" checked={staffChecked}
            onChange={(e) => setStaffChecked(e.target.checked)} />
          <span>
            Staff member
            <span className={styles.groupNote} style={{ display: 'block' }}>
              Staff can open this admin console. Their role decides what they
              can actually do once inside.
            </span>
          </span>
        </label>

        {canSetStatus && user && (
          <Field label="Account status" htmlFor="status" error={err('status')}
            hint="Anything other than active signs them out immediately and blocks sign-in.">
            <select id="status" name="status" className={selectClass} defaultValue={user.status}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </Field>
        )}

        {/*
          Roles are part of creation but a separate action afterwards: changing
          someone's authority mid-way through a profile edit should be its own
          decision, with its own audit entry.
        */}
        {!user && canAssignRoles && (
          <Field label="Roles" htmlFor="roleKeys"
            hint={staffChecked
              ? 'Pick what they need and nothing more.'
              : 'Participants need no role. Leave these unticked unless they are staff.'}>
            <div className={styles.roleList} id="roleKeys">
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
            </div>
          </Field>
        )}
      </fieldset>

      <div className={styles.formActions}>
        <SubmitButton pendingLabel={user ? 'Saving…' : 'Creating…'}>
          {user ? 'Save changes' : 'Create account'}
        </SubmitButton>
        <Link href={user ? `/users/${user.id}` : '/users'}>Cancel</Link>
      </div>
    </form>
  );
}
