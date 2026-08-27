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
    description: str(fd, 'description') ?? null,
    signatoryName: str(fd, 'signatoryName') ?? null,
    signatoryTitle: str(fd, 'signatoryTitle') ?? null,
    signatoryDepartment: str(fd, 'signatoryDepartment') ?? null,
    signatureFileId: str(fd, 'signatureFileId') ? Number(str(fd, 'signatureFileId')) : null,
    isDefault: fd.get('isDefault') === 'on',
    isActive: fd.get('isActive') === 'on',
  };
}

export async function saveCertificateTemplateAction(
  _prev: AdminActionState, formData: FormData,
): Promise<AdminActionState> {
  const id = str(formData, 'id');

  try {
    if (id) {
      await apiAsUser(`/certificate-templates/${id}`, { method: 'PATCH', body: body(formData) });
    } else {
      await apiAsUser('/certificate-templates', { method: 'POST', body: body(formData) });
    }
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/certificate-templates');
  return { ok: true, message: id ? 'Saved.' : 'Template added.' };
}

export async function deleteCertificateTemplateAction(id: string): Promise<AdminActionState> {
  try {
    await apiAsUser(`/certificate-templates/${id}`, { method: 'DELETE' });
  } catch (err) {
    return toState(err);
  }

  revalidatePath('/certificate-templates');
  return { ok: true, message: 'Removed.' };
}

/**
 * Renders a sample certificate from whatever is currently in the form,
 * saved or not. Returns the image as a data URL rather than redirecting to
 * one, since a server action can't hand back binary — the caller renders it
 * straight into an `<img>`.
 */
export async function previewCertificateTemplateAction(formData: FormData): Promise<
  { ok: true; imageDataUrl: string } | { ok: false; message: string }
> {
  const signatureFileId = str(formData, 'signatureFileId');
  if (!signatureFileId) {
    return { ok: false, message: 'Upload a signature image first.' };
  }
  if (!str(formData, 'signatoryName')) {
    return { ok: false, message: 'Enter the signatory\'s name first.' };
  }

  try {
    const { data } = await apiAsUser<{ imageDataUrl: string }>('/certificate-templates/preview', {
      method: 'POST',
      body: {
        signatoryName: str(formData, 'signatoryName'),
        signatoryTitle: str(formData, 'signatoryTitle') ?? null,
        signatoryDepartment: str(formData, 'signatoryDepartment') ?? null,
        signatureFileId: Number(signatureFileId),
      },
    });
    return { ok: true, imageDataUrl: data.imageDataUrl };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, message: err.message };
    return { ok: false, message: 'We could not reach the server. Please try again.' };
  }
}
