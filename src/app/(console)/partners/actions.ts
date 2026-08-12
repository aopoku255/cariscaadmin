'use server';

import { revalidatePath } from 'next/cache';
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

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  const s = v === null ? '' : String(v).trim();
  return s === '' ? undefined : s;
};

function body(fd: FormData) {
  return {
    name: str(fd, 'name'),
    shortName: str(fd, 'shortName') ?? null,
    description: str(fd, 'description') ?? null,
    websiteUrl: str(fd, 'websiteUrl') ?? null,
    countryCode: str(fd, 'countryCode') ?? null,
    logoFileId: str(fd, 'logoFileId') ? Number(str(fd, 'logoFileId')) : null,
    isActive: fd.get('isActive') === 'on',
  };
}

export async function savePartnerAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = str(formData, 'id');

  try {
    if (id) {
      await apiAsUser(`/partners/${id}`, { method: 'PATCH', body: body(formData) });
    } else {
      await apiAsUser('/partners', { method: 'POST', body: body(formData) });
    }
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/partners');
  return { ok: true, message: id ? 'Saved.' : 'Partner added.' };
}

export async function deletePartnerAction(id: string): Promise<AdminActionState> {
  try {
    await apiAsUser(`/partners/${id}`, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof ApiError && err.code === 'PARTNER_IN_USE') {
      // The API's message already names the event count; it is more useful
      // than anything generic we would write here.
      return { ok: false, message: err.message };
    }
    return toState(err);
  }

  revalidatePath('/partners');
  return { ok: true, message: 'Removed.' };
}

/** Replaces the whole set attached to an event, matching the API. */
export async function saveEventPartnersAction(
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
    await apiAsUser(`/cpd/events/${eventId}/partners`, { method: 'PUT', body: { partners } });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/cpd/${eventId}`);
  return { ok: true, message: 'Partners saved.' };
}
