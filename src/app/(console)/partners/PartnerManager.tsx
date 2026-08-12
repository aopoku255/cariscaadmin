'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge, Button, Callout, Card, Field, EmptyState,
  inputClass, selectClass, textareaClass, checkRowClass,
} from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { ImageUpload } from '@/components/forms/ImageUpload';
import type { Partner, ReferenceData } from '@/lib/api/types';
import { savePartnerAction, deletePartnerAction } from './actions';
import { emptyAdminState } from '../cpd/state';
import styles from './partners.module.css';

/**
 * The partner library.
 *
 * A list with an inline editor rather than separate pages: there will be a
 * few dozen of these at most, and adding one mid-way through building an
 * event should not mean losing your place.
 */
export function PartnerManager({
  partners, countries, canManage, apiBase,
}: {
  partners: Partner[];
  countries: ReferenceData['countries'];
  canManage: boolean;
  apiBase: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(savePartnerAction, emptyAdminState);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; message: string } | null>(null);

  const open = adding || !!editing;

  const close = () => { setAdding(false); setEditing(null); router.refresh(); };

  return (
    <div className={styles.wrap}>
      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}
      {removing && <Callout tone="danger" title="Cannot remove">{removing.message}</Callout>}

      {canManage && !open && (
        <Button onClick={() => setAdding(true)}>Add a partner</Button>
      )}

      {open && (
        <Card>
          <h2 className={styles.formTitle}>{editing ? `Edit ${editing.name}` : 'Add a partner'}</h2>

          {/* Remounted per partner so defaults reset between edits. */}
          <form action={formAction} className={styles.form} key={editing?.id ?? 'new'}>
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div className={styles.pair}>
              <Field label="Name" htmlFor="name" error={state.fieldErrors?.name} required>
                <input id="name" name="name" className={inputClass} required
                  defaultValue={editing?.name} maxLength={180} />
              </Field>
              <Field label="Short name" htmlFor="shortName"
                hint="Used where the full name will not fit.">
                <input id="shortName" name="shortName" className={inputClass}
                  defaultValue={editing?.shortName ?? ''} maxLength={80} />
              </Field>
            </div>

            <div className={styles.pair}>
              <Field label="Website" htmlFor="websiteUrl" error={state.fieldErrors?.websiteUrl}>
                <input id="websiteUrl" name="websiteUrl" type="url" className={inputClass}
                  defaultValue={editing?.websiteUrl ?? ''} placeholder="https://" />
              </Field>
              <Field label="Country" htmlFor="countryCode">
                <select id="countryCode" name="countryCode" className={selectClass}
                  defaultValue={editing?.country?.code ?? ''}>
                  <option value="">Not set</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Description" htmlFor="description" hint="Optional, internal only.">
              <textarea id="description" name="description" className={textareaClass}
                defaultValue={editing?.description ?? ''} maxLength={1000} style={{ minHeight: 80 }} />
            </Field>

            <ImageUpload
              name="logoFileId"
              purpose="organization_logo"
              apiBase={apiBase}
              label="Logo"
              hint="Shown on the public event page. A transparent PNG works best."
              initial={editing?.logo ? { id: editing.logo.id, url: editing.logo.url } : null}
            />

            <label className={checkRowClass}>
              <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
              <span>
                <strong>Available to attach to events</strong>
                <span className={styles.checkNote}>
                  Turn this off to retire a partner without affecting events that
                  already credit them.
                </span>
              </span>
            </label>

            <div className={styles.formActions}>
              <SubmitButton pendingLabel="Saving…">{editing ? 'Save changes' : 'Add partner'}</SubmitButton>
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {partners.length === 0 ? (
        <EmptyState
          title="No partners yet"
          description="Add the institutions and organizations CARISCA runs programmes with. Once added, a partner can be credited on any number of events."
          action={canManage ? <Button onClick={() => setAdding(true)}>Add the first partner</Button> : undefined}
        />
      ) : (
        <ul className={styles.list}>
          {partners.map((p) => (
            <li key={p.id} className={styles.row}>
              <div className={styles.logoCell}>
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${apiBase}${p.logo.url}`} alt="" className={styles.logo} />
                ) : (
                  <span className={styles.noLogo} aria-hidden="true">
                    {(p.shortName ?? p.name).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className={styles.details}>
                <div className={styles.nameRow}>
                  <strong>{p.name}</strong>
                  {!p.isActive && <Badge tone="neutral">Retired</Badge>}
                </div>
                <p className={styles.meta}>
                  {[p.shortName, p.country?.name].filter(Boolean).join(' · ') || '-'}
                </p>
                {p.websiteUrl && (
                  <a href={p.websiteUrl} target="_blank" rel="noreferrer" className={styles.link}>
                    {p.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>

              {canManage && (
                <div className={styles.rowActions}>
                  <Button size="sm" variant="secondary" onClick={() => { setAdding(false); setEditing(p); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={async () => {
                      if (!window.confirm(`Remove ${p.name} from the library?`)) return;
                      const result = await deletePartnerAction(p.id);
                      if (!result.ok) setRemoving({ id: p.id, message: result.message ?? 'Could not remove.' });
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
