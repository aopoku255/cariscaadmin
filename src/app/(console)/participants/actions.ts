'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminUser } from '@/lib/api/types';
import type { AdminActionState } from '../cpd/state';

/**
 * Editing, roles and password reset are identical to staff — same record
 * shape, same endpoints, same "who can do what" rules enforced by the API.
 * The shared `UserForm`, `RolesPanel` and `PasswordPanel` already import
 * those actions from ../users/actions themselves, so nothing here needs to
 * redeclare them. Only creation differs enough to need its own action.
 */

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

export async function createParticipantAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  let id: string;
  let welcomeEmailSent = false;

  try {
    const { data } = await apiAsUser<AdminUser & { welcomeEmailSent: boolean }>('/admin/users', {
      method: 'POST',
      body: {
        firstName: str(formData, 'firstName'),
        lastName: str(formData, 'lastName'),
        middleName: str(formData, 'middleName') ?? null,
        prefix: str(formData, 'prefix') ?? null,
        phone: str(formData, 'phone') ?? null,
        organization: str(formData, 'organization') ?? null,
        jobTitle: str(formData, 'jobTitle') ?? null,
        countryCode: str(formData, 'countryCode') ?? null,
        city: str(formData, 'city') ?? null,
        timezone: str(formData, 'timezone') ?? null,
        email: str(formData, 'email'),
        password: str(formData, 'password'),
        // Fixed here rather than trusted from the form: this is the one place
        // that must never create a staff account no matter what a request
        // claims, so it does not read isStaff or roleKeys from the submission
        // at all. Matches what a self-registered participant gets, so every
        // account uniformly carries at least one role.
        isStaff: false,
        roleKeys: ['participant'],
      },
    });
    id = data.id;
    welcomeEmailSent = data.welcomeEmailSent;
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/participants');
  redirect(`/participants/${id}?created=1&emailSent=${welcomeEmailSent ? '1' : '0'}`);
}
