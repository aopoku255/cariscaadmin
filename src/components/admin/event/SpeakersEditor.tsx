'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, inputClass, selectClass, textareaClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { ImageUpload } from '@/components/forms/ImageUpload';
import type { EventSpeaker } from '@/lib/api/types';
import { emptyAdminState, type AdminAction } from './state';
import styles from './AdminEvent.module.css';

/**
 * Who is presenting.
 *
 * Saved as a whole-list replace, the same shape as fees and registration
 * questions: an admin edits the set in the browser and saves once, rather
 * than each row round-tripping on its own. Display order on the public page
 * follows this list's order — first added, first shown — the same as fees.
 *
 * Shared between CPD and Summit — see PricesEditor for why.
 */

type Role = EventSpeaker['role'];

type Row = {
  key: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  role: Role;
  photo: { id: string; url: string } | null;
};

const ROLES: { value: Role; label: string }[] = [
  { value: 'SPEAKER', label: 'Speaker' },
  { value: 'FACILITATOR', label: 'Facilitator' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'PANELLIST', label: 'Panellist' },
];

let counter = 0;
const newKey = () => `s${Date.now()}-${(counter += 1)}`;

const blankRow = (): Row => ({
  key: newKey(), name: '', title: '', organization: '', bio: '', role: 'SPEAKER', photo: null,
});

function toRow(s: EventSpeaker): Row {
  return {
    key: s.id,
    name: s.name,
    title: s.title ?? '',
    organization: s.organization ?? '',
    bio: s.bio ?? '',
    role: s.role,
    photo: s.photo ? { id: s.photo.id, url: s.photo.url } : null,
  };
}

export function SpeakersEditor({
  eventId, speakers, canEdit, apiBase, action,
}: {
  eventId: string;
  speakers: EventSpeaker[];
  canEdit: boolean;
  apiBase: string;
  action: AdminAction;
}) {
  const [state, formAction] = useActionState(action, emptyAdminState);
  const [rows, setRows] = useState<Row[]>(speakers.map(toRow));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = JSON.stringify(rows.map((r, i) => ({
    name: r.name,
    title: r.title || undefined,
    organization: r.organization || undefined,
    bio: r.bio || undefined,
    role: r.role,
    sortOrder: (i + 1) * 10,
    photoFileId: r.photo ? Number(r.photo.id) : null,
  })));

  if (!canEdit) {
    return speakers.length === 0
      ? <p className={styles.muted}>No speakers are listed yet.</p>
      : (
        <ul className={styles.readonlyQuestions}>
          {speakers.map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>
              <span className={styles.muted}>
                {' · '}{ROLES.find((r) => r.value === s.role)?.label}
                {s.organization ? ` · ${s.organization}` : ''}
              </span>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="speakers" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {rows.length === 0 && (
        <p className={styles.muted}>
          Nobody is listed yet. Add whoever is presenting, facilitating or on
          the panel — this shows on the public event page.
        </p>
      )}

      {rows.length > 0 && (
        <ul className={styles.speakerRows}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.speakerRow}>
              <div className={styles.speakerPhotoCol}>
                <ImageUpload
                  name={`speakerPhoto-${r.key}`}
                  purpose="speaker_photo"
                  apiBase={apiBase}
                  label=""
                  aspectRatio="1 / 1"
                  initial={r.photo}
                  onChange={(photo) => update(r.key, { photo })}
                />
              </div>

              <div className={styles.speakerFields}>
                <div className={styles.pair}>
                  <input
                    className={inputClass}
                    value={r.name}
                    placeholder="Full name"
                    aria-label={`Name for speaker ${i + 1}`}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                  />
                  <select
                    className={selectClass}
                    value={r.role}
                    aria-label={`Role for speaker ${i + 1}`}
                    onChange={(e) => update(r.key, { role: e.target.value as Role })}
                  >
                    {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </div>

                <div className={styles.pair}>
                  <input
                    className={inputClass}
                    value={r.title}
                    placeholder="Title, e.g. Dr., Prof. — shown before their name"
                    aria-label={`Title for speaker ${i + 1}`}
                    onChange={(e) => update(r.key, { title: e.target.value })}
                  />
                  <input
                    className={inputClass}
                    value={r.organization}
                    placeholder="Organization"
                    aria-label={`Organization for speaker ${i + 1}`}
                    onChange={(e) => update(r.key, { organization: e.target.value })}
                  />
                </div>

                <textarea
                  className={textareaClass}
                  value={r.bio}
                  placeholder="A short bio, shown under their name on the event page"
                  aria-label={`Bio for speaker ${i + 1}`}
                  rows={3}
                  onChange={(e) => update(r.key, { bio: e.target.value })}
                />

                <button type="button" className={styles.removeButton}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.questionsFooter}>
        <Button type="button" variant="secondary" size="sm"
          onClick={() => setRows((rs) => [...rs, blankRow()])}>
          Add a speaker
        </Button>

        <SubmitButton size="sm" pendingLabel="Saving…">Save speakers</SubmitButton>
      </div>
    </form>
  );
}
