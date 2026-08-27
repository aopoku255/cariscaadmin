'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge, Button, Callout, Card, Field, EmptyState, inputClass, textareaClass, checkRowClass,
} from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { ImageUpload } from '@/components/forms/ImageUpload';
import type { CertificateTemplate } from '@/lib/api/types';
import {
  saveCertificateTemplateAction, deleteCertificateTemplateAction, previewCertificateTemplateAction,
} from './actions';
import { emptyAdminState } from '../cpd/state';
import styles from '../partners/partners.module.css';
import previewStyles from './certificate-templates.module.css';

/**
 * Second-signatory templates.
 *
 * Same inline list-plus-form shape as the partner library — there will be a
 * handful of these, and losing your place to a separate edit page for
 * something this small would be worse than the list scrolling a little.
 */
export function CertificateTemplateManager({
  templates, canManage, apiBase,
}: {
  templates: CertificateTemplate[];
  canManage: boolean;
  apiBase: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveCertificateTemplateAction, emptyAdminState);
  const [editing, setEditing] = useState<CertificateTemplate | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ imageDataUrl?: string; message?: string; pending: boolean }>({ pending: false });
  const formRef = useRef<HTMLFormElement>(null);

  const open = adding || !!editing;

  const close = () => { setAdding(false); setEditing(null); setPreview({ pending: false }); router.refresh(); };

  const runPreview = () => {
    if (!formRef.current) return;
    setPreview({ pending: true });
    previewCertificateTemplateAction(new FormData(formRef.current)).then((result) => {
      if (result.ok) setPreview({ imageDataUrl: result.imageDataUrl, pending: false });
      else setPreview({ message: result.message, pending: false });
    });
  };

  return (
    <div className={styles.wrap}>
      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}
      {removing && <Callout tone="danger" title="Cannot remove">{removing}</Callout>}

      {canManage && !open && (
        <Button onClick={() => setAdding(true)}>Add a template</Button>
      )}

      {open && (
        <Card>
          <h2 className={styles.formTitle}>{editing ? `Edit ${editing.name}` : 'Add a certificate template'}</h2>

          {/* Remounted per template so defaults reset between edits. */}
          <form action={formAction} className={styles.form} key={editing?.id ?? 'new'} ref={formRef}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <Field label="Template name" htmlFor="name" error={state.fieldErrors?.name} required
              hint="For your own reference in the picker — not shown on the certificate.">
              <input id="name" name="name" className={inputClass} required
                defaultValue={editing?.name} maxLength={120} />
            </Field>

            <div className={styles.pair}>
              <Field label="Signatory name" htmlFor="signatoryName" error={state.fieldErrors?.signatoryName}>
                <input id="signatoryName" name="signatoryName" className={inputClass}
                  defaultValue={editing?.signatoryName ?? ''} maxLength={160} placeholder="Dr Jane Doe" />
              </Field>
              <Field label="Title" htmlFor="signatoryTitle">
                <input id="signatoryTitle" name="signatoryTitle" className={inputClass}
                  defaultValue={editing?.signatoryTitle ?? ''} maxLength={160} placeholder="Senior Lecturer" />
              </Field>
            </div>

            <Field label="Department" htmlFor="signatoryDepartment"
              hint="Printed on the same line as the title, e.g. &ldquo;Senior Lecturer, Department of X, KNUST School of Business&rdquo;.">
              <input id="signatoryDepartment" name="signatoryDepartment" className={inputClass}
                defaultValue={editing?.signatoryDepartment ?? ''} maxLength={255} />
            </Field>

            <ImageUpload
              name="signatureFileId"
              purpose="certificate_signature"
              apiBase={apiBase}
              label="Signature"
              hint="A transparent PNG works best."
              aspectRatio="3 / 1"
              maxSizeMb={2}
              accept="image/jpeg,image/png"
              initial={editing?.signatureFile ? { id: editing.signatureFile.id, url: editing.signatureFile.url } : null}
            />

            <label className={checkRowClass}>
              <input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault ?? false} />
              <span>
                <strong>Offer this first in the picker</strong>
                <span className={styles.checkNote}>
                  Cosmetic only — it does not apply itself to any event automatically.
                </span>
              </span>
            </label>

            <label className={checkRowClass}>
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
              <span>
                <strong>Available to select on an event</strong>
                <span className={styles.checkNote}>
                  Turn this off to retire a template without affecting events already using it.
                </span>
              </span>
            </label>

            <div className={previewStyles.previewBlock}>
              <Button type="button" variant="secondary" disabled={preview.pending} onClick={runPreview}>
                {preview.pending ? 'Rendering…' : 'Preview certificate'}
              </Button>
              {preview.message && <p className={previewStyles.previewError}>{preview.message}</p>}
              {preview.imageDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.imageDataUrl} alt="Sample certificate with this signatory" className={previewStyles.previewImage} />
              )}
            </div>

            <div className={styles.formActions}>
              <SubmitButton pendingLabel="Saving…">{editing ? 'Save changes' : 'Add template'}</SubmitButton>
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Every certificate uses the artwork's own default signature until you add a template and pick it on an event."
          action={canManage ? <Button onClick={() => setAdding(true)}>Add the first template</Button> : undefined}
        />
      ) : (
        <ul className={styles.list}>
          {templates.map((t) => (
            <li key={t.id} className={styles.row}>
              <div className={styles.logoCell}>
                {t.signatureFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${apiBase}${t.signatureFile.url}`} alt="" className={styles.logo} />
                ) : (
                  <span className={styles.noLogo} aria-hidden="true">?</span>
                )}
              </div>

              <div className={styles.details}>
                <div className={styles.nameRow}>
                  <strong>{t.name}</strong>
                  {t.isDefault && <Badge tone="info">Default</Badge>}
                  {!t.isActive && <Badge tone="neutral">Retired</Badge>}
                </div>
                <p className={styles.meta}>
                  {[t.signatoryName, t.signatoryTitle].filter(Boolean).join(' · ') || 'No signatory set yet'}
                </p>
              </div>

              {canManage && (
                <div className={styles.rowActions}>
                  <Button size="sm" variant="secondary" onClick={() => { setAdding(false); setEditing(t); setPreview({ pending: false }); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={async () => {
                      if (!window.confirm(`Remove ${t.name}?`)) return;
                      const result = await deleteCertificateTemplateAction(t.id);
                      if (!result.ok) setRemoving(result.message ?? 'Could not remove.');
                      else { setRemoving(null); router.refresh(); }
                    }}>
                    Remove
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
