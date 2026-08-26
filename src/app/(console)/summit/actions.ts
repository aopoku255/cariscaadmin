'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminActionState } from './state';

/**
 * Server actions for the Summit admin screens.
 *
 * A thin duplicate of cpd/actions.ts, pointed at /summit/... instead of
 * /cpd/... — Next.js server actions can't be meaningfully parametrized
 * across a shared non-'use server' file, so this glue is deliberately
 * copied rather than shared. The real complexity (the editors themselves)
 * is shared; this file is the small, mechanical part that isn't.
 */

function toState(err: unknown): AdminActionState {
  if (err instanceof ApiError) {
    const fieldErrors = err.fieldErrors;

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
    summit: {
      theme: str(fd, 'theme'),
      callForPapersOpensAt: instant(fd, 'cfpOpensDate', 'cfpOpensTime'),
      callForPapersClosesAt: instant(fd, 'cfpClosesDate', 'cfpClosesTime'),
      keynoteCount: str(fd, 'keynoteCount') ? num(fd, 'keynoteCount') : undefined,
    },
  };
}

export async function createSummitAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  let id: string;
  try {
    const { data } = await apiAsUser<{ id: string }>('/summit/events', {
      method: 'POST', body: eventBody(formData),
    });
    id = data.id;
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/summit');
  redirect(`/summit/${id}?created=1`);
}

export async function updateSummitAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));
  try {
    await apiAsUser(`/summit/events/${id}`, { method: 'PATCH', body: eventBody(formData) });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  revalidatePath('/summit');
  return { ok: true, message: 'Saved.' };
}

export async function transitionSummitAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));
  const action = String(formData.get('action'));
  const reason = str(formData, 'reason');

  try {
    await apiAsUser(`/summit/events/${id}/${action}`, {
      method: 'POST',
      body: reason ? { reason } : {},
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  revalidatePath('/summit');
  revalidatePath('/events');
  return { ok: true, message: 'Done.' };
}

export async function saveQuestionsAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  let questions: unknown;
  try {
    questions = JSON.parse(String(formData.get('questions') || '[]'));
  } catch {
    return { ok: false, message: 'The question list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/summit/events/${id}/questions`, { method: 'PUT', body: { questions } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  return { ok: true, message: 'Registration questions saved.' };
}

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
    await apiAsUser(`/summit/events/${id}/speakers`, { method: 'PUT', body: { speakers } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
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
    await apiAsUser(`/summit/events/${id}/prices`, { method: 'PUT', body: { prices } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  return { ok: true, message: 'Fees saved.' };
}

/** Replaces the whole set attached to an event — the same shape as CPD's, at the Summit route. */
export async function saveSummitPartnersAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const eventId = String(formData.get('eventId'));

  let partners: unknown;
  try {
    partners = JSON.parse(String(formData.get('partners') || '[]'));
  } catch {
    return { ok: false, message: 'The partner list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/summit/events/${eventId}/partners`, { method: 'PUT', body: { partners } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${eventId}`);
  return { ok: true, message: 'Partners saved.' };
}

export async function saveTracksAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  let tracks: unknown;
  try {
    tracks = JSON.parse(String(formData.get('tracks') || '[]'));
  } catch {
    return { ok: false, message: 'The track list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/summit/events/${id}/tracks`, { method: 'PUT', body: { tracks } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  return { ok: true, message: 'Tracks saved.' };
}

export async function saveSponsorshipTiersAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = String(formData.get('id'));

  let tiers: unknown;
  try {
    tiers = JSON.parse(String(formData.get('tiers') || '[]'));
  } catch {
    return { ok: false, message: 'The tier list could not be read. Please reload and try again.' };
  }

  try {
    await apiAsUser(`/summit/events/${id}/sponsorship-tiers`, { method: 'PUT', body: { tiers } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${id}`);
  return { ok: true, message: 'Sponsorship tiers saved.' };
}

export async function claimAbstractAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const eventId = String(formData.get('eventId'));
  const abstractId = String(formData.get('abstractId'));
  const notes = str(formData, 'notes');

  try {
    await apiAsUser(`/summit/events/${eventId}/abstracts/${abstractId}/claim`, {
      method: 'POST', body: notes ? { notes } : {},
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${eventId}/abstracts`);
  revalidatePath(`/summit/${eventId}/abstracts/${abstractId}`);
  return { ok: true, message: 'Claimed for review.' };
}

export async function decideAbstractAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const eventId = String(formData.get('eventId'));
  const abstractId = String(formData.get('abstractId'));
  const decision = String(formData.get('decision'));
  const notes = str(formData, 'notes');

  try {
    await apiAsUser(`/summit/events/${eventId}/abstracts/${abstractId}/decide`, {
      method: 'POST', body: { decision, notes },
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/summit/${eventId}/abstracts`);
  revalidatePath(`/summit/${eventId}/abstracts/${abstractId}`);
  return { ok: true, message: 'Decision recorded.' };
}
