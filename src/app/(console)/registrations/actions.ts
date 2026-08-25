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
