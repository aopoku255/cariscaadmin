'use client';

import { useActionState, useState } from 'react';
import { Callout, Button, inputClass, selectClass, checkRowClass } from '@/components/ui';
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

interface Draft {
  key: string;
  label: string;
  helpText: string;
  type: QuestionType;
  required: boolean;
  options: { value: string; label: string }[];
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

  const update = (key: string, patch: Partial<Draft>) => {
    setDrafts((d) => d.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    [next[index], next[target]] = [next[target], next[index]];
    setDrafts(next);
  };

  const payload = JSON.stringify(drafts.map((d, i) => ({
    label: d.label,
    helpText: d.helpText || undefined,
    type: d.type,
    required: d.required,
    sortOrder: (i + 1) * 10,
    options: NEEDS_OPTIONS.includes(d.type)
      ? d.options.filter((o) => o.value && o.label)
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
      </p>

      {drafts.length === 0 && (
        <p className={styles.muted}>No extra questions yet.</p>
      )}

      <ol className={styles.questionList}>
        {drafts.map((d, i) => (
          <li key={d.key} className={styles.questionRow}>
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
                  onChange={(e) => update(d.key, { type: e.target.value as QuestionType })}
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
                  <label className={styles.optionsLabel} htmlFor={`opt-${d.key}`}>
                    Options, one per line
                  </label>
                  <textarea
                    id={`opt-${d.key}`}
                    className={inputClass}
                    rows={3}
                    value={d.options.map((o) => o.label).join('\n')}
                    placeholder={'First option\nSecond option'}
                    onChange={(e) => update(d.key, {
                      options: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
                        // Value derives from the label so an admin never has to
                        // think about machine keys.
                        .map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), label })),
                    })}
                  />
                  {d.options.length === 0 && (
                    <p className={styles.optionsWarning}>
                      A choice question needs at least one option before it can be saved.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.questionActions}>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                aria-label={`Move question ${i + 1} up`} className={styles.iconButton}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === drafts.length - 1}
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
