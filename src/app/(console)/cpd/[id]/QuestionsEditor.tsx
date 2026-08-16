'use client';

import { useActionState, useState } from 'react';
import { Callout, Button, inputClass, selectClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { RegistrationQuestion, QuestionType } from '@/lib/api/types';
import { saveQuestionsAction } from '../actions';
import { emptyAdminState } from '../state';
import styles from '../cpd.module.css';

/**
 * Builds the event's registration form.
 *
 * The whole set is submitted as JSON in one hidden field, matching the API's
 * replace-everything endpoint. Editing rows in the browser and saving once is
 * far less error-prone than a request per question.
 */

interface Option {
  /**
   * The stored key. Empty for an option the admin has just added — it is
   * derived from the label at save time and then never changes, so renaming
   * "Lunch" to "Lunch (vegetarian)" does not orphan the answers already given
   * against the old key.
   */
  value: string;
  label: string;
}

interface Draft {
  key: string;
  label: string;
  helpText: string;
  type: QuestionType;
  required: boolean;
  options: Option[];
}

const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'TEXT', label: 'Short text' },
  { value: 'LONGTEXT', label: 'Long text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'EMAIL', label: 'Email address' },
  { value: 'PHONE', label: 'Phone number' },
  { value: 'DATE', label: 'Date' },
  { value: 'SELECT', label: 'Choose one (dropdown)' },
  { value: 'RADIO', label: 'Choose one (buttons)' },
  { value: 'MULTISELECT', label: 'Choose several' },
  { value: 'CHECKBOX', label: 'Single checkbox' },
  { value: 'FILE', label: 'File upload' },
];

const NEEDS_OPTIONS: QuestionType[] = ['SELECT', 'RADIO', 'MULTISELECT'];

/** Several answers allowed, so the marker is a box rather than a bullet. */
const isMulti = (type: QuestionType) => type === 'MULTISELECT';

const slug = (label: string) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

let counter = 0;
const newKey = () => `q${Date.now()}-${(counter += 1)}`;

function toDraft(q: RegistrationQuestion): Draft {
  return {
    key: q.id,
    label: q.label,
    helpText: q.helpText ?? '',
    type: q.type,
    required: q.required,
    options: q.options ?? [],
  };
}

export function QuestionsEditor({
  eventId, questions, canEdit,
}: { eventId: string; questions: RegistrationQuestion[]; canEdit: boolean }) {
  const [state, formAction] = useActionState(saveQuestionsAction, emptyAdminState);
  const [drafts, setDrafts] = useState<Draft[]>(questions.map(toDraft));

  // Drag state. `armed` is the row whose handle is being held — the <li> is
  // only draggable then, or the inputs inside it would stop being selectable.
  const [armed, setArmed] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const update = (key: string, patch: Partial<Draft>) => {
    setDrafts((d) => d.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const updateOption = (key: string, index: number, label: string) => {
    setDrafts((ds) => ds.map((q) => (q.key === key
      ? { ...q, options: q.options.map((o, i) => (i === index ? { ...o, label } : o)) }
      : q)));
  };

  const addOption = (key: string) => {
    setDrafts((ds) => ds.map((q) => (q.key === key
      ? { ...q, options: [...q.options, { value: '', label: '' }] }
      : q)));
  };

  const removeOption = (key: string, index: number) => {
    setDrafts((ds) => ds.map((q) => (q.key === key
      ? { ...q, options: q.options.filter((_, i) => i !== index) }
      : q)));
  };

  /** Shared by the drag handler and the arrow buttons. */
  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= drafts.length) return;
    setDrafts((ds) => {
      const next = [...ds];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const endDrag = () => { setArmed(null); setDragFrom(null); setDragOver(null); };

  /**
   * Switching to a choice type with no options yet seeds one empty row, so
   * there is somewhere to type immediately rather than an empty panel and a
   * warning.
   */
  const changeType = (d: Draft, type: QuestionType) => {
    const needsOptions = NEEDS_OPTIONS.includes(type);
    update(d.key, {
      type,
      options: needsOptions && d.options.length === 0 ? [{ value: '', label: '' }] : d.options,
    });
  };

  const payload = JSON.stringify(drafts.map((d, i) => ({
    label: d.label,
    helpText: d.helpText || undefined,
    type: d.type,
    required: d.required,
    sortOrder: (i + 1) * 10,
    options: NEEDS_OPTIONS.includes(d.type)
      ? d.options
        .filter((o) => o.label.trim())
        // Keep the key an existing option already had; derive one only for
        // options added in this session. The positional fallback covers a
        // label with nothing sluggable in it — "?" or "&" alone — which would
        // otherwise send an empty value and fail the API's min(1).
        .map((o, oi) => ({
          value: o.value || slug(o.label) || `option-${oi + 1}`,
          label: o.label.trim(),
        }))
      : undefined,
  })));

  if (!canEdit) {
    return questions.length === 0
      ? <p className={styles.muted}>No extra questions are configured.</p>
      : (
        <ol className={styles.readonlyQuestions}>
          {questions.map((q) => (
            <li key={q.id}>
              <strong>{q.label}</strong>
              <span className={styles.muted}> · {TYPES.find((t) => t.value === q.type)?.label}
                {q.required ? ' · required' : ''}</span>
            </li>
          ))}
        </ol>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="questions" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      <p className={styles.muted}>
        Name, email, organization and country are already collected from every
        participant&apos;s profile. Only add what is specific to this event.
        Drag a question by its handle to reorder, or use the arrows.
      </p>

      {drafts.length === 0 && (
        <p className={styles.muted}>No extra questions yet.</p>
      )}

      <ol className={styles.questionList}>
        {drafts.map((d, i) => (
          <li
            key={d.key}
            className={[
              styles.questionRow,
              dragFrom === i ? styles.questionRowDragging : '',
              dragOver === i && dragFrom !== i ? styles.questionRowOver : '',
            ].filter(Boolean).join(' ')}
            draggable={armed === d.key}
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = 'move';
              // Firefox will not start a drag without data on the transfer.
              e.dataTransfer.setData('text/plain', String(i));
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null) reorder(dragFrom, i);
              endDrag();
            }}
            onDragEnd={endDrag}
          >
            <button
              type="button"
              className={styles.dragHandle}
              // Arming on pointer-down is what keeps the row draggable only
              // from here; the arrows below remain the keyboard route.
              onMouseDown={() => setArmed(d.key)}
              onMouseUp={() => setArmed(null)}
              onTouchStart={() => setArmed(d.key)}
              onTouchEnd={() => setArmed(null)}
              aria-label={`Drag to reorder question ${i + 1}. Use the arrow buttons to move it with the keyboard.`}
              title="Drag to reorder"
            >
              <span aria-hidden="true">⠿</span>
            </button>

            <div className={styles.questionMain}>
              <input
                className={inputClass}
                value={d.label}
                placeholder="Question"
                onChange={(e) => update(d.key, { label: e.target.value })}
                aria-label={`Question ${i + 1}`}
              />

              <div className={styles.questionMeta}>
                <select
                  className={selectClass}
                  value={d.type}
                  onChange={(e) => changeType(d, e.target.value as QuestionType)}
                  aria-label={`Answer type for question ${i + 1}`}
                >
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <label className={styles.requiredToggle}>
                  <input type="checkbox" checked={d.required}
                    onChange={(e) => update(d.key, { required: e.target.checked })} />
                  <span>Required</span>
                </label>
              </div>

              {NEEDS_OPTIONS.includes(d.type) && (
                <div className={styles.options}>
                  <span className={styles.optionsLabel}>Options</span>

                  {d.options.map((o, oi) => (
                    // Index as key: options are positional and an option's
                    // label is exactly what the admin is editing, so neither
                    // makes a stable identity here.
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={oi} className={styles.optionRow}>
                      <span
                        aria-hidden="true"
                        className={`${styles.optionMarker} ${
                          isMulti(d.type) ? styles.optionMarkerSquare : styles.optionMarkerRound
                        }`}
                      />
                      <input
                        className={inputClass}
                        value={o.label}
                        placeholder={`Option ${oi + 1}`}
                        aria-label={`Option ${oi + 1} for question ${i + 1}`}
                        onChange={(e) => updateOption(d.key, oi, e.target.value)}
                        onKeyDown={(e) => {
                          // Enter adds the next option rather than submitting
                          // the form — the Google Forms behaviour, and it stops
                          // a half-built question being saved by accident.
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOption(d.key);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.optionRemove}
                        onClick={() => removeOption(d.key, oi)}
                        disabled={d.options.length === 1}
                        aria-label={`Remove option ${oi + 1} from question ${i + 1}`}
                        title={d.options.length === 1 ? 'A choice question needs at least one option' : 'Remove'}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button type="button" className={styles.addOption}
                    onClick={() => addOption(d.key)}>
                    + Add option
                  </button>

                  {d.options.every((o) => !o.label.trim()) && (
                    <p className={styles.optionsWarning}>
                      A choice question needs at least one option before it can be saved.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.questionActions}>
              <button type="button" onClick={() => reorder(i, i - 1)} disabled={i === 0}
                aria-label={`Move question ${i + 1} up`} className={styles.iconButton}>↑</button>
              <button type="button" onClick={() => reorder(i, i + 1)} disabled={i === drafts.length - 1}
                aria-label={`Move question ${i + 1} down`} className={styles.iconButton}>↓</button>
              <button type="button" className={styles.removeButton}
                onClick={() => setDrafts((ds) => ds.filter((q) => q.key !== d.key))}
                aria-label={`Remove question ${i + 1}`}>Remove</button>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.questionsFooter}>
        <Button type="button" variant="secondary" size="sm"
          onClick={() => setDrafts((ds) => [...ds, {
            key: newKey(), label: '', helpText: '', type: 'TEXT', required: false, options: [],
          }])}>
          Add a question
        </Button>

        <SubmitButton size="sm" pendingLabel="Saving…">Save questions</SubmitButton>
      </div>
    </form>
  );
}
