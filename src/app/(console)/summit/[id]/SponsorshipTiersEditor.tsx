'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, inputClass, selectClass, textareaClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { SponsorshipTier, ReferenceData } from '@/lib/api/types';
import { saveSponsorshipTiersAction } from '../actions';
import { emptyAdminState } from '../state';
import styles from '@/components/admin/event/AdminEvent.module.css';

/**
 * Paid sponsorship levels — Platinum, Gold, Silver — with their own
 * benefits text. A partner is assigned to one of these from the Partners
 * editor, once it role is set to Sponsor. The price here is informational
 * only: nothing about it creates a payment obligation or touches the
 * payments module.
 */

type Row = { key: string; name: string; benefits: string; price: string; currency: string };

let counter = 0;
const newKey = () => `tier${Date.now()}-${(counter += 1)}`;

const blankRow = (currency: string): Row => ({
  key: newKey(), name: '', benefits: '', price: '', currency,
});

function toRow(t: SponsorshipTier): Row {
  return {
    key: t.id,
    name: t.name,
    benefits: t.benefits ?? '',
    price: t.money?.formatted ?? '',
    currency: t.money?.currency ?? '',
  };
}

export function SponsorshipTiersEditor({
  eventId, tiers, currencies, canEdit,
}: {
  eventId: string; tiers: SponsorshipTier[]; currencies: ReferenceData['currencies']; canEdit: boolean;
}) {
  const [state, formAction] = useActionState(saveSponsorshipTiersAction, emptyAdminState);
  const defaultCurrency = currencies.find((c) => c.code === 'GHS')?.code ?? currencies[0]?.code ?? 'GHS';
  const [rows, setRows] = useState<Row[]>(tiers.map(toRow));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = JSON.stringify(rows.map((r, i) => ({
    name: r.name,
    benefits: r.benefits || undefined,
    price: r.price.trim() || undefined,
    currency: r.price.trim() ? (r.currency || defaultCurrency) : undefined,
    sortOrder: (i + 1) * 10,
  })));

  if (!canEdit) {
    return tiers.length === 0
      ? <p className={styles.muted}>No sponsorship tiers are set up.</p>
      : (
        <ul className={styles.readonlyQuestions}>
          {tiers.map((t) => (
            <li key={t.id}>
              <strong>{t.name}</strong>
              {t.money && <span className={styles.muted}> · {t.money.currency} {t.money.formatted}</span>}
            </li>
          ))}
        </ul>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="tiers" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {rows.length === 0 && (
        <p className={styles.muted}>
          No tiers yet. Add Platinum, Gold, Silver — whatever levels this Summit
          offers — then assign a sponsoring partner to one from the Partners editor.
        </p>
      )}

      {rows.length > 0 && (
        <ul className={styles.plainRows}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.plainRow}>
              <div className={styles.priceMain}>
                <input
                  className={inputClass}
                  value={r.name}
                  placeholder="e.g. Platinum"
                  aria-label={`Name for tier ${i + 1}`}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                />
                <div className={styles.priceAmount}>
                  <select
                    className={selectClass}
                    value={r.currency || defaultCurrency}
                    aria-label={`Currency for tier ${i + 1}`}
                    onChange={(e) => update(r.key, { currency: e.target.value })}
                  >
                    {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                  <input
                    className={inputClass}
                    value={r.price}
                    inputMode="decimal"
                    placeholder="Optional"
                    aria-label={`Price for tier ${i + 1}`}
                    onChange={(e) => update(r.key, { price: e.target.value.replace(/[^\d.]/g, '') })}
                  />
                </div>
              </div>
              <textarea
                className={textareaClass}
                value={r.benefits}
                placeholder="One benefit per line — logo placement, stage mentions, exhibit space…"
                aria-label={`Benefits for tier ${i + 1}`}
                rows={3}
                onChange={(e) => update(r.key, { benefits: e.target.value })}
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
          onClick={() => setRows((rs) => [...rs, blankRow(defaultCurrency)])}>
          Add a tier
        </Button>
        <SubmitButton size="sm" pendingLabel="Saving…">Save tiers</SubmitButton>
      </div>
    </form>
  );
}
