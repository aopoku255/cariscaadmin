'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui';
import { uploadFileAction, type UploadedFile } from '@/lib/api/upload';
import styles from './image-upload.module.css';

/**
 * Picks and uploads a banner.
 *
 * Uploads immediately on selection rather than waiting for the form to be
 * submitted, so the admin sees whether the image was accepted while they still
 * remember choosing it. The resulting file id rides along in a hidden input.
 */
export function ImageUpload({
  name,
  purpose = 'event_banner',
  initial = null,
  label = 'Banner image',
  hint,
  apiBase,
}: {
  name: string;
  purpose?: string;
  initial?: { id: string; url: string } | null;
  label?: string;
  hint?: string;
  apiBase: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ id: string; url: string } | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    setError(null);

    // Checked here too so an obvious mistake is caught before a 5MB round
    // trip. The server still decides — this is courtesy, not validation.
    if (chosen.size > 5 * 1024 * 1024) {
      setError('That image is larger than 5MB. Please choose a smaller one.');
      return;
    }

    const form = new FormData();
    form.append('file', chosen);
    form.append('purpose', purpose);

    startTransition(async () => {
      const result = await uploadFileAction(form);
      if (result.ok && result.file) {
        setFile({ id: result.file.id, url: result.file.url });
      } else {
        setError(result.message ?? 'The upload failed.');
      }
    });
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      {hint && <p className={styles.hint}>{hint}</p>}

      {/* What the form actually submits. */}
      <input type="hidden" name={name} value={file?.id ?? ''} />

      {file ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${apiBase}${file.url}`} alt="" className={styles.image} />
          <div className={styles.previewActions}>
            <Button type="button" variant="secondary" size="sm" disabled={pending}
              onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending}
              onClick={() => { setFile(null); setError(null); }}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.dropzone}>
          <p className={styles.dropText}>
            {pending ? 'Uploading…' : 'JPEG, PNG or WebP · up to 5MB'}
          </p>
          <Button type="button" variant="secondary" disabled={pending}
            onClick={() => inputRef.current?.click()}>
            {pending ? 'Uploading…' : 'Choose an image'}
          </Button>
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="visually-hidden"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          // Reset so choosing the same file twice still fires a change.
          e.target.value = '';
        }}
      />
    </div>
  );
}
