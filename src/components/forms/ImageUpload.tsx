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
  onChange,
  aspectRatio = '16 / 9',
  maxSizeMb = 5,
  accept = 'image/jpeg,image/png,image/webp',
}: {
  name: string;
  purpose?: string;
  initial?: { id: string; url: string } | null;
  label?: string;
  hint?: string;
  apiBase: string;
  /**
   * For a caller that already tracks this image as part of its own state
   * (SpeakersEditor's per-row `rows`, replacing the whole list on save)
   * rather than reading the hidden input from raw form data. The hidden
   * input is still rendered either way, so a plain form still works without
   * this prop.
   */
  onChange?: (file: { id: string; url: string } | null) => void;
  /** A CSS aspect-ratio value. Default matches a banner; pass '1 / 1' for a
      headshot, so the preview crops the same way the image is used elsewhere
      instead of always letterboxing to widescreen. */
  aspectRatio?: string;
  /** Matched to whichever `storage.service.js` purpose this upload uses —
      the defaults are event_banner's limits, not a universal rule. */
  maxSizeMb?: number;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ id: string; url: string } | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (next: { id: string; url: string } | null) => {
    setFile(next);
    onChange?.(next);
  };

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    setError(null);

    // Checked here too so an obvious mistake is caught before the round
    // trip. The server still decides — this is courtesy, not validation.
    if (chosen.size > maxSizeMb * 1024 * 1024) {
      setError(`That image is larger than ${maxSizeMb}MB. Please choose a smaller one.`);
      return;
    }

    const form = new FormData();
    form.append('file', chosen);
    form.append('purpose', purpose);

    startTransition(async () => {
      const result = await uploadFileAction(form);
      if (result.ok && result.file) {
        set({ id: result.file.id, url: result.file.url });
      } else {
        setError(result.message ?? 'The upload failed.');
      }
    });
  };

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      {hint && <p className={styles.hint}>{hint}</p>}

      {/* What the form actually submits. */}
      <input type="hidden" name={name} value={file?.id ?? ''} />

      {file ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${apiBase}${file.url}`} alt="" className={styles.image} style={{ aspectRatio }} />
          <div className={styles.previewActions}>
            <Button type="button" variant="secondary" size="sm" disabled={pending}
              onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending}
              onClick={() => { set(null); setError(null); }}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.dropzone}>
          <p className={styles.dropText}>
            {pending ? 'Uploading…' : `${accept.includes('webp') ? 'JPEG, PNG or WebP' : 'JPEG or PNG'} · up to ${maxSizeMb}MB`}
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
        accept={accept}
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
