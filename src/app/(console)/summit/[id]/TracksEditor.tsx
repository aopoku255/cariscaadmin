'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, inputClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { EventTrack } from '@/lib/api/types';
import { saveTracksAction } from '../actions';
import { emptyAdminState } from '../state';
import styles from '@/components/admin/event/AdminEvent.module.css';

/**
 * The Summit's parallel agenda streams — "Track A: Digital Supply Chains"
 * running alongside "Track B: Policy". Purely a grouping label: a session is
 * assigned to one of these in the sessions editor, and the public agenda
 * groups by it. Same whole-list-replace shape as speakers and fees.
 */

type Row = { key: string; name: string; description: string; color: string };

let counter = 0;
const newKey = () => `t${Date.now()}-${(counter += 1)}`;

const blankRow = (): Row => ({ key: newKey(), name: '', description: '', color: '' });

function toRow(t: EventTrack): Row {
  return { key: t.id, name: t.name, description: t.description ?? '', color: t.color ?? '' };
}

export function TracksEditor({
  eventId, tracks, canEdit,
}: { eventId: string; tracks: EventTrack[]; canEdit: boolean }) {
  const [state, formAction] = useActionState(saveTracksAction, emptyAdminState);
  const [rows, setRows] = useState<Row[]>(tracks.map(toRow));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = JSON.stringify(rows.map((r, i) => ({
    name: r.name,
    description: r.description || undefined,
    color: r.color || undefined,
    sortOrder: (i + 1) * 10,
  })));

  if (!canEdit) {
    return tracks.length === 0
      ? <p className={styles.muted}>No tracks are set — the agenda shows as one linear list.</p>
      : (
        <ul className={styles.readonlyQuestions}>
          {tracks.map((t) => <li key={t.id}><strong>{t.name}</strong></li>)}
        </ul>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="tracks" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {rows.length === 0 && (
        <p className={styles.muted}>
          No tracks yet — the agenda shows as one linear list until you add some.
          Assign sessions to a track from the Sessions editor once these exist.
        </p>
      )}

      {rows.length > 0 && (
        <ul className={styles.plainRows}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.plainRow}>
              <input
                className={inputClass}
                value={r.name}
                placeholder="e.g. Track A: Digital Supply Chains"
                aria-label={`Name for track ${i + 1}`}
                onChange={(e) => update(r.key, { name: e.target.value })}
              />
              <input
                className={inputClass}
                value={r.description}
                placeholder="Optional description"
                aria-label={`Description for track ${i + 1}`}
                onChange={(e) => update(r.key, { description: e.target.value })}
              />
              <button type="button" className={styles.removeButton}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.questionsFooter}>
        <Button type="button" variant="secondary" size="sm"
          onClick={() => setRows((rs) => [...rs, blankRow()])}>
          Add a track
        </Button>
        <SubmitButton size="sm" pendingLabel="Saving…">Save tracks</SubmitButton>
      </div>
    </form>
  );
}
