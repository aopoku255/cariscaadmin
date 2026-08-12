'use client';

import { useActionState, useState } from 'react';
import { Button, Callout, inputClass, selectClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { EventPrice, ReferenceData } from '@/lib/api/types';
import { savePricesAction } from '../actions';
import { emptyAdminState } from '../state';
import styles from '../cpd.module.css';

/**
 * Sets what an event costs.
 *
 * A list rather than a single field, because CARISCA prices one event several
 * ways at once — virtual against in-person, Africa against international, and
 * the same event quoted in more than one currency. Each row carries the
 * conditions under which it applies and the server picks the most specific
 * match at registration.
 */

type Row = {
  key: string;
  label: string;
  amount: string;
  currency: string;
  attendanceMode: 'ANY' | 'IN_PERSON' | 'VIRTUAL';
  audience: 'ANY' | 'HOST_COUNTRY' | 'AFRICA' | 'INTERNATIONAL';
  tier: string;
};

const MODES = [
  { value: 'ANY', label: 'Either way' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'VIRTUAL', label: 'Online' },
] as const;

const AUDIENCES = [
  { value: 'ANY', label: 'Everyone' },
  { value: 'HOST_COUNTRY', label: 'Same country as the event' },
  { value: 'AFRICA', label: 'Participants in Africa' },
  { value: 'INTERNATIONAL', label: 'Participants outside Africa' },
] as const;

let counter = 0;
const newKey = () => `p${Date.now()}-${(counter += 1)}`;

const blankRow = (currency: string): Row => ({
  key: newKey(),
  label: '',
  amount: '0',
  currency,
  attendanceMode: 'ANY',
  audience: 'ANY',
  tier: 'standard',
});

function toRow(p: EventPrice): Row {
  return {
    key: p.id,
    label: p.label,
    // The API hands back the amount already divided by the currency's own
    // exponent; it goes back the same way and is converted server-side.
    amount: p.money.formatted,
    currency: p.money.currency,
    attendanceMode: p.attendanceMode,
    audience: p.audience,
    tier: p.tier,
  };
}

export function PricesEditor({
  eventId, prices, currencies, canEdit,
}: {
  eventId: string;
  prices: EventPrice[];
  currencies: ReferenceData['currencies'];
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(savePricesAction, emptyAdminState);
  const defaultCurrency = currencies.find((c) => c.code === 'GHS')?.code ?? currencies[0]?.code ?? 'GHS';
  const [rows, setRows] = useState<Row[]>(prices.map(toRow));

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const payload = JSON.stringify(rows.map((r, i) => ({
    tier: r.tier || 'standard',
    label: r.label || 'Standard',
    amount: r.amount.trim() === '' ? '0' : r.amount.trim(),
    currency: r.currency,
    attendanceMode: r.attendanceMode,
    audience: r.audience,
    isDefault: i === 0,
    priority: 100,
  })));

  const allFree = rows.length > 0 && rows.every((r) => Number(r.amount) === 0);

  if (!canEdit) {
    return prices.length === 0
      ? <p className={styles.muted}>No fee is set.</p>
      : (
        <table className={styles.miniTable}>
          <thead>
            <tr><th>Rate</th><th>Attending</th><th>Who</th><th className={styles.amountCell}>Amount</th></tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td>{MODES.find((m) => m.value === p.attendanceMode)?.label}</td>
                <td>{AUDIENCES.find((a) => a.value === p.audience)?.label}</td>
                <td className={styles.amountCell}>
                  {p.money.amountMinor === 0 ? 'Free' : `${p.money.currency} ${p.money.formatted}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="id" value={eventId} />
      <input type="hidden" name="prices" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {rows.length === 0 && (
        <Callout tone="warning" title="No fee is set">
          An event needs at least one fee before it can be published. For a free
          event, add one and leave the amount at zero.
        </Callout>
      )}

      {rows.length > 0 && (
        <ul className={styles.priceRows}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.priceRow}>
              <div className={styles.priceMain}>
                <input
                  className={inputClass}
                  value={r.label}
                  placeholder={i === 0 ? 'Standard' : 'e.g. In-Person (Africa)'}
                  aria-label={`Name for rate ${i + 1}`}
                  onChange={(e) => update(r.key, { label: e.target.value })}
                />

                <div className={styles.priceAmount}>
                  <select
                    className={selectClass}
                    value={r.currency}
                    aria-label={`Currency for rate ${i + 1}`}
                    onChange={(e) => update(r.key, { currency: e.target.value })}
                  >
                    {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                  <input
                    className={inputClass}
                    value={r.amount}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label={`Amount for rate ${i + 1}`}
                    onChange={(e) => update(r.key, { amount: e.target.value.replace(/[^\d.]/g, '') })}
                  />
                </div>
              </div>

              <div className={styles.priceConditions}>
                <label className={styles.priceCondition}>
                  <span>Attending</span>
                  <select className={selectClass} value={r.attendanceMode}
                    onChange={(e) => update(r.key, { attendanceMode: e.target.value as Row['attendanceMode'] })}>
                    {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </label>

                <label className={styles.priceCondition}>
                  <span>Who</span>
                  <select className={selectClass} value={r.audience}
                    onChange={(e) => update(r.key, { audience: e.target.value as Row['audience'] })}>
                    {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </label>

                <button type="button" className={styles.removeButton}
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {allFree && (
        <p className={styles.muted}>
          This event is free. Participants are confirmed straight away with no
          payment step.
        </p>
      )}

      {rows.length > 1 && (
        <p className={styles.muted}>
          Where more than one rate could apply, the most specific wins. If two are
          equally specific the cheaper is used, so an ambiguous set never
          overcharges anyone.
        </p>
      )}

      <div className={styles.questionsFooter}>
        <div className={styles.priceAddButtons}>
          <Button type="button" variant="secondary" size="sm"
            onClick={() => setRows((rs) => [...rs, blankRow(defaultCurrency)])}>
            Add a rate
          </Button>
          {rows.length === 0 && (
            <Button type="button" variant="ghost" size="sm"
              onClick={() => setRows([{ ...blankRow(defaultCurrency), label: 'Free', amount: '0' }])}>
              Make it free
            </Button>
          )}
        </div>

        <SubmitButton size="sm" pendingLabel="Saving…">Save fees</SubmitButton>
      </div>
    </form>
  );
}
