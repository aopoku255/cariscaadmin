'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminActionState } from '../cpd/state';

function toState(err: unknown): AdminActionState {
  if (err instanceof ApiError) {
    const fieldErrors = err.fieldErrors;
    if (err.status === 403) return { ok: false, message: 'Your role does not allow this.' };
    return {
      ok: false,
      message: Object.keys(fieldErrors).length ? undefined : err.message,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }
  return { ok: false, message: 'We could not reach the server. Please try again.' };
}

export async function waiveFeeAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const reference = String(formData.get('reference') || '');
  const amount = String(formData.get('amount') || '').trim();
  const reason = String(formData.get('reason') || '').trim() || undefined;

  if (!reference) return { ok: false, message: 'Missing registration.' };
  if (!amount) return { ok: false, fieldErrors: { amount: 'Enter an amount, or 0 to waive it in full.' } };

  try {
    await apiAsUser(`/registrations/${encodeURIComponent(reference)}/waive`, {
      method: 'POST',
      body: { amount, reason },
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/registrations/${reference}`);
  revalidatePath('/registrations');
  return { ok: true, message: 'Fee updated.' };
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? undefined : s;
};

/**
 * Adds someone to an event on their behalf. The API creates their account if
 * the email is new (emailing them their sign-in details) and registers them;
 * an email that already has an account is simply registered.
 */
export async function addParticipantToEventAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const eventId = Number(formData.get('eventId') || 0);
  if (!eventId) return { ok: false, fieldErrors: { eventId: 'Choose an event.' } };

  let reference: string;
  let accountCreated = false;
  let credentialsEmailSent = false;

  try {
    const { data } = await apiAsUser<{
      registration: { reference: string };
      accountCreated: boolean;
      credentialsEmailSent: boolean;
    }>('/registrations/admin', {
      method: 'POST',
      body: {
        eventId,
        attendanceMode: text(formData, 'attendanceMode') ?? 'IN_PERSON',
        mediaConsent: true,
        waiveFee: formData.get('waiveFee') === 'on',
        participant: {
          firstName: text(formData, 'firstName'),
          lastName: text(formData, 'lastName'),
          email: text(formData, 'email'),
          gender: text(formData, 'gender'),
          phone: text(formData, 'phone'),
          countryCode: text(formData, 'countryCode'),
          organization: text(formData, 'organization'),
          jobTitle: text(formData, 'jobTitle'),
          positionKey: text(formData, 'positionKey'),
          sectorKey: text(formData, 'sectorKey'),
          password: text(formData, 'password'),
        },
      },
    });
    reference = data.registration.reference;
    accountCreated = data.accountCreated;
    credentialsEmailSent = data.credentialsEmailSent;
  } catch (err) {
    if (err instanceof ApiError) {
      // The API nests the participant's fields; the form names them flat.
      const fieldErrors: Record<string, string> = {};
      for (const [field, message] of Object.entries(err.fieldErrors)) {
        fieldErrors[field.replace(/^participant\./, '')] = message;
      }
      if (err.status === 403) return { ok: false, message: 'Your role does not allow this.' };
      return {
        ok: false,
        message: Object.keys(fieldErrors).length ? undefined : err.message,
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
      };
    }
    return { ok: false, message: 'We could not reach the server. Please try again.' };
  }

  revalidatePath('/registrations');
  redirect(`/registrations/${reference}?added=1&account=${accountCreated ? '1' : '0'}&emailSent=${credentialsEmailSent ? '1' : '0'}`);
}

/** Marks someone as having attended — the same record a door scan creates, recorded as manual. */
export async function markAttendedAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const reference = String(formData.get('reference') || '');
  if (!reference) return { ok: false, message: 'Missing registration.' };

  try {
    await apiAsUser('/attendance/scan', { method: 'POST', body: { reference } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/registrations/${reference}`);
  return { ok: true, message: 'Marked as attended.' };
}
