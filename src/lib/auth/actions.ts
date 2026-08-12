'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { apiRequest, ApiError } from '@/lib/api/client';
import type { SessionUser } from '@/lib/api/types';
import { setSessionCookies, clearSessionCookies, getRefreshToken } from './session';
import type { FormState } from './form-state';

/**
 * Authentication for the console.
 *
 * A trimmed version of the public site's: staff sign in and out, and nothing
 * else. There is no self-registration and no password reset here — accounts
 * are created by an administrator, and resets go through the public site.
 */

function toState(err: unknown): FormState {
  if (err instanceof ApiError) {
    const fieldErrors = err.fieldErrors;
    return {
      ok: false,
      message: Object.keys(fieldErrors).length ? undefined : err.message,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }
  return { ok: false, message: 'We could not reach the server. Please try again.' };
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('That does not look like an email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const next = String(formData.get('next') || '/');
  let user: SessionUser;

  try {
    const { data } = await apiRequest<{
      user: SessionUser; accessToken: string; refreshToken: string;
    }>('/auth/login', { method: 'POST', body: parsed.data });

    user = data.user;
    await setSessionCookies(data);
  } catch (err) {
    return toState(err);
  }

  // Say so here rather than signing them in and bouncing them off a guard.
  if (!user.isStaff) {
    await clearSessionCookies();
    return {
      ok: false,
      message: 'This account does not have staff access. Use the public site to manage your registrations.',
    };
  }

  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logoutAction() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    // Revoke server-side too; clearing the cookie alone leaves a live token.
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch { /* the local session goes regardless */ }
  }
  await clearSessionCookies();
  revalidatePath('/', 'layout');
  redirect('/login');
}
