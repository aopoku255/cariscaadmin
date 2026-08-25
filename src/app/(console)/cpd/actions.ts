'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminActionState } from './state';

/**
 * Server actions for the CPD admin screens.
 *
 * Nothing here decides whether the caller is allowed to act — the API refuses
 * on its own permission check, and these translate the refusal into something
 * a form can render.
 */

function toState(err: unknown): AdminActionState {
  if (err instanceof ApiError) {
    const fieldErrors = err.fieldErrors;

    // Publish validation returns a list of what is missing rather than
    // per-field errors; surface all of it so an admin fixes it in one pass.
    const problems = (err.details as { problems?: string[] })?.problems;
    if (Array.isArray(problems)) {
      return { ok: false, message: err.message, problems };
    }

    if (err.status === 403) {
      return { ok: false, message: 'Your role does not allow this action.' };
    }

    return {
      ok: false,
      message: Object.keys(fieldErrors).length ? undefined : err.message,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }
  return { ok: false, message: 'We could not reach the server. Please try again.' };
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? undefined : s;
};

const num = (fd: FormData, key: string) => {
  const s = str(fd, key);
  return s === undefined ? undefined : Number(s);
};

const bool = (fd: FormData, key: string) => fd.get(key) === 'on';

const list = (fd: FormData, key: string) => {
  const raw = str(fd, key);
  if (!raw) return undefined;
  // One per line is far easier to edit than comma-separated prose.
  return raw.split('\n').map((s) => s.trim()).filter(Boolean);
};

/** Combines the date and time inputs into an ISO instant. */
function instant(fd: FormData, dateKey: string, timeKey: string) {
  const date = str(fd, dateKey);
  if (!date) return undefined;
  const time = str(fd, timeKey) ?? '09:00';
  return new Date(`${date}T${time}:00Z`).toISOString();
}

function eventBody(fd: FormData) {
  return {
    title: str(fd, 'title'),
    shortDescription: str(fd, 'shortDescription'),
    description: str(fd, 'description'),
    // Null rather than undefined when empty: the field is always present in
    // this form, so a blank one means "no banner" and has to clear the column.
    // Omitting it would make Remove silently do nothing.
    bannerFileId: str(fd, 'bannerFileId') ? Number(str(fd, 'bannerFileId')) : null,
    startAt: instant(fd, 'startDate', 'startTime'),
    endAt: instant(fd, 'endDate', 'endTime'),
    timezone: str(fd, 'timezone') ?? 'Africa/Accra',
    deliveryMode: str(fd, 'deliveryMode') ?? 'OFFLINE',
    countryCode: str(fd, 'countryCode'),
    city: str(fd, 'city'),
    venue: str(fd, 'venue'),
    onlineUrl: str(fd, 'onlineUrl'),
    capacity: str(fd, 'capacity') ? num(fd, 'capacity') : null,
    virtualCapacity: str(fd, 'virtualCapacity') ? num(fd, 'virtualCapacity') : null,
    allowWaitlist: bool(fd, 'allowWaitlist'),
    registrationClosesAt: instant(fd, 'registrationClosesDate', 'registrationClosesTime'),
    issuesCertificate: bool(fd, 'issuesCertificate'),
    certificateRequiresPayment: bool(fd, 'certificateRequiresPayment'),
    attendanceRule: str(fd, 'attendanceRule') ?? 'CHECK_IN',
    minAttendancePercent: str(fd, 'minAttendancePercent') ? num(fd, 'minAttendancePercent') : null,
    contactEmail: str(fd, 'contactEmail'),
    contactPhone: str(fd, 'contactPhone'),
    cpd: {
      cpdCredits: str(fd, 'cpdCredits') ? num(fd, 'cpdCredits') : undefined,
      accreditingBody: str(fd, 'accreditingBody'),
      learningObjectives: list(fd, 'learningObjectives'),
      targetAudience: list(fd, 'targetAudience'),
      requirements: str(fd, 'requirements'),
    },
  };
}

export async function createCpdAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  let id: string;
  try {
    const { data } = await apiAsUser<{ id: string }>('/cpd/events', {
      method: 'POST', body: eventBody(formData),
    });
    id = data.id;
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/cpd');
  redirect(`/cpd/${id}?created=1`);
}

export async function updateCpdAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));
  try {
    await apiAsUser(`/cpd/events/${id}`, { method: 'PATCH', body: eventBody(formData) });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${id}`);
  revalidatePath('/cpd');
  return { ok: true, message: 'Saved.' };
}

/**
 * Lifecycle transitions. Which of these an admin may run is decided entirely
 * by the API — a Manager can create and edit but not publish, and pressing
 * the button anyway returns a clear refusal rather than a silent no-op.
 */
export async function transitionCpdAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));
  const action = String(formData.get('action'));
  const reason = str(formData, 'reason');

  try {
    await apiAsUser(`/cpd/events/${id}/${action}`, {
      method: 'POST',
      body: reason ? { reason } : {},
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${id}`);
  revalidatePath('/cpd');
  revalidatePath('/events');
  return { ok: true, message: 'Done.' };
}

/** Replaces the whole question set in one call, matching the API. */
export async function saveQuestionsAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  const payload = formData.get('questions');
  let questions: unknown;
  try {
    questions = JSON.parse(String(payload || '[]'));
  } catch {
    return { ok: false, message: 'The question list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/cpd/events/${id}/questions`, { method: 'PUT', body: { questions } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${id}`);
  return { ok: true, message: 'Registration questions saved.' };
}

/** Replaces the whole speaker list in one call, matching prices and questions. */
export async function saveSpeakersAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  let speakers: unknown;
  try {
    speakers = JSON.parse(String(formData.get('speakers') || '[]'));
  } catch {
    return { ok: false, message: 'The speaker list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/cpd/events/${id}/speakers`, { method: 'PUT', body: { speakers } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${id}`);
  return { ok: true, message: 'Speakers saved.' };
}

export async function savePricesAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  let prices: unknown;
  try {
    prices = JSON.parse(String(formData.get('prices') || '[]'));
  } catch {
    return { ok: false, message: 'The price list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/cpd/events/${id}/prices`, { method: 'PUT', body: { prices } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${id}`);
  return { ok: true, message: 'Fees saved.' };
}
