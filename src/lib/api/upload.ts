'use server';

import { getAccessToken, refreshSession } from '@/lib/auth/session';

export interface UploadedFile {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

export interface UploadResult {
  ok: boolean;
  file?: UploadedFile;
  message?: string;
}

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Uploads through the server rather than from the browser.
 *
 * The access token stays in an httpOnly cookie, so the browser cannot attach
 * it to a request itself — and it should not be able to. The file is relayed
 * as multipart; the ordinary API client is not used because it serialises
 * bodies as JSON.
 */
async function post(form: FormData, token: string | null) {
  return fetch(`${API}/files/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
}

export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
  const file = formData.get('file');
  const purpose = String(formData.get('purpose') || 'event_banner');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a file to upload.' };
  }

  const outbound = new FormData();
  outbound.append('file', file, file.name);
  outbound.append('purpose', purpose);

  try {
    let token = await getAccessToken();
    let response = await post(outbound, token);

    // A long editing session can outlive a 15-minute access token; refresh
    // once rather than losing the upload.
    if (response.status === 401) {
      const refreshed = await refreshSession();
      if (!refreshed) return { ok: false, message: 'Your session expired. Sign in and try again.' };
      token = refreshed.accessToken;

      const retry = new FormData();
      retry.append('file', file, file.name);
      retry.append('purpose', purpose);
      response = await post(retry, token);
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      // Validation details carry the useful message — "image/gif files are not
      // accepted here" beats a generic failure.
      const detail = body?.error?.details?.[0]?.message;
      return { ok: false, message: detail ?? body?.message ?? 'The upload failed.' };
    }

    return { ok: true, file: body.data as UploadedFile };
  } catch {
    return { ok: false, message: 'We could not reach the server. Please try again.' };
  }
}
