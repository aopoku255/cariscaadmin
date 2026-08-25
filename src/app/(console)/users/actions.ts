'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/client';
import { apiAsUser } from '@/lib/auth/session';
import type { AdminUser } from '@/lib/api/types';
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

/** Shared between create and update; the API ignores what it does not accept. */
function profile(fd: FormData) {
  return {
    firstName: str(fd, 'firstName'),
    lastName: str(fd, 'lastName'),
    middleName: str(fd, 'middleName') ?? null,
    prefix: str(fd, 'prefix') ?? null,
    phone: str(fd, 'phone') ?? null,
    organization: str(fd, 'organization') ?? null,
    jobTitle: str(fd, 'jobTitle') ?? null,
    countryCode: str(fd, 'countryCode') ?? null,
    city: str(fd, 'city') ?? null,
    timezone: str(fd, 'timezone') ?? null,
    departmentId: str(fd, 'departmentId') ? Number(str(fd, 'departmentId')) : null,
    isStaff: fd.get('isStaff') === 'on',
  };
}

export async function createUserAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  let id: string;

  let welcomeEmailSent = false;

  try {
    const { data } = await apiAsUser<AdminUser & { welcomeEmailSent: boolean }>('/admin/users', {
      method: 'POST',
      body: {
        ...profile(formData),
        email: str(formData, 'email'),
        password: str(formData, 'password'),
        roleKeys: formData.getAll('roleKeys').map(String).filter(Boolean),
      },
    });
    id = data.id;
    welcomeEmailSent = data.welcomeEmailSent;
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/users');
  // Straight to the new record: the next thing an administrator does is check
  // it, and a "created" banner on a list of fifty rows does not show them what.
  redirect(`/users/${id}?created=1&emailSent=${welcomeEmailSent ? '1' : '0'}`);
}

export async function updateUserAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = str(formData, 'id');
  if (!id) return { ok: false, message: 'Missing user.' };

  const body: Record<string, unknown> = profile(formData);
  // Only sent when the form actually offers it — the API gates status behind
  // its own permission and rejects the field outright without it.
  const status = str(formData, 'status');
  if (status) body.status = status;

  try {
    await apiAsUser(`/admin/users/${id}`, { method: 'PATCH', body });
  } catch (err) {
    return toState(err);
  }

  // This action edits both staff and participants — UserForm is shared, see
  // its own comment — so it revalidates both sides rather than knowing which
  // one it was called from. That matters most when the edit just flipped
  // `isStaff`: it is what lets the still-mounted /participants/:id page
  // notice on its next render that the account is now staff and hand off to
  // /users/:id, instead of continuing to show a staff-shaped record on the
  // participant page.
  revalidatePath('/users');
  revalidatePath(`/users/${id}`);
  revalidatePath('/participants');
  revalidatePath(`/participants/${id}`);
  return { ok: true, message: 'Saved.' };
}

export async function setRolesAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = str(formData, 'id');
  if (!id) return { ok: false, message: 'Missing user.' };

  try {
    await apiAsUser(`/admin/users/${id}/roles`, {
      method: 'PUT',
      body: { roleKeys: formData.getAll('roleKeys').map(String).filter(Boolean) },
    });
  } catch (err) {
    return toState(err);
  }

  revalidatePath(`/users/${id}`);
  return { ok: true, message: 'Roles updated.' };
}

export async function resetPasswordAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = str(formData, 'id');
  const password = str(formData, 'password');
  if (!id) return { ok: false, message: 'Missing user.' };
  if (password !== str(formData, 'passwordConfirm')) {
    return { ok: false, fieldErrors: { passwordConfirm: 'The two passwords do not match.' } };
  }

  try {
    await apiAsUser(`/admin/users/${id}/password`, { method: 'POST', body: { password } });
  } catch (err) {
    return toState(err);
  }

  return {
    ok: true,
    message: 'Password set. They have been signed out everywhere and will need the new one.',
  };
}
