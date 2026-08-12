'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button, Callout, selectClass } from '@/components/ui';
import { SubmitButton } from '@/components/forms/SubmitButton';
import type { Partner, PartnerRole } from '@/lib/api/types';
import { saveEventPartnersAction } from '../../partners/actions';
import { emptyAdminState } from '../state';
import styles from '../cpd.module.css';

const ROLES: { value: PartnerRole; label: string }[] = [
  { value: 'PARTNER', label: 'Partner' },
  { value: 'HOST', label: 'Host' },
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'FUNDER', label: 'Funder' },
  { value: 'ACCREDITOR', label: 'Accrediting body' },
  { value: 'SUPPORTER', label: 'Supporter' },
];

/**
 * Credits partners on an event, choosing from the shared library.
 *
 * Attaching is picking from what already exists rather than typing a name —
 * that is what keeps one KNUST in the system instead of four.
 */
export function EventPartners({
  eventId, attached, library, canEdit, apiBase,
}: {
  eventId: string;
  attached: Partner[];
  library: Partner[];
  canEdit: boolean;
  apiBase: string;
}) {
  const [state, formAction] = useActionState(saveEventPartnersAction, emptyAdminState);
  const [rows, setRows] = useState(
    attached.map((p) => ({ id: p.id, role: (p.role ?? 'PARTNER') as PartnerRole })),
  );

  const byId = new Map(library.map((p) => [p.id, p]));
  const chosen = new Set(rows.map((r) => r.id));
  const available = library.filter((p) => p.isActive && !chosen.has(p.id));

  const payload = JSON.stringify(rows.map((r, i) => ({
    partnerId: Number(r.id),
    role: r.role,
    sortOrder: (i + 1) * 10,
  })));

  if (!canEdit) {
    return attached.length === 0
      ? <p className={styles.muted}>No partners are credited on this event.</p>
      : (
        <ul className={styles.partnerList}>
          {attached.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong>
              <span className={styles.muted}> · {ROLES.find((r) => r.value === p.role)?.label ?? p.role}</span>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <form action={formAction} className={styles.questions}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="partners" value={payload} />

      {state.message && (
        <Callout tone={state.ok ? 'success' : 'danger'}>{state.message}</Callout>
      )}

      {library.length === 0 ? (
        <p className={styles.muted}>
          The partner library is empty. <Link href="/partners">Add a partner</Link> first,
          then credit them here.
        </p>
      ) : (
        <>
          {rows.length === 0 && (
            <p className={styles.muted}>No partners credited yet.</p>
          )}

          <ul className={styles.partnerRows}>
            {rows.map((row, i) => {
              const partner = byId.get(row.id);
              return (
                <li key={row.id} className={styles.partnerRow}>
                  <div className={styles.partnerIdent}>
                    {partner?.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${apiBase}${partner.logo.url}`} alt="" className={styles.partnerLogo} />
                    ) : (
                      <span className={styles.partnerInitials} aria-hidden="true">
                        {(partner?.shortName ?? partner?.name ?? '?').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span>{partner?.name ?? 'Unknown partner'}</span>
                  </div>

                  <select
                    className={selectClass}
                    value={row.role}
                    aria-label={`Role for ${partner?.name ?? 'partner'}`}
                    onChange={(e) => setRows((rs) => rs.map((r, j) => (
                      j === i ? { ...r, role: e.target.value as PartnerRole } : r
                    )))}
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>

                  <button type="button" className={styles.removeButton}
                    onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          {available.length > 0 && (
            <div className={styles.partnerAdd}>
              <select
                className={selectClass}
                value=""
                aria-label="Add a partner to this event"
                onChange={(e) => {
                  if (!e.target.value) return;
                  setRows((rs) => [...rs, { id: e.target.value, role: 'PARTNER' }]);
                  e.currentTarget.value = '';
                }}
              >
                <option value="">Add a partner…</option>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className={styles.questionsFooter}>
            <Link href="/partners" className={styles.muted}>Manage the library</Link>
            <SubmitButton size="sm" pendingLabel="Saving…">Save partners</SubmitButton>
          </div>
        </>
      )}
    </form>
  );
}
