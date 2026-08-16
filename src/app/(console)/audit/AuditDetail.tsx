import type { AuditLogEntry } from '@/lib/api/types';
import styles from './audit.module.css';

/**
 * What actually changed in one entry.
 *
 * A server component using a native <details>: an audit trail should open and
 * be readable without client JavaScript, and there is no state here worth
 * shipping a bundle for.
 */

type Row = { key: string; was: unknown; now: unknown };

const isRecord = (v: unknown): v is Record<string, unknown> => (
  !!v && typeof v === 'object' && !Array.isArray(v)
);

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Only the keys whose value moved.
 *
 * A user edit writes the whole record to both snapshots, so an undiffed view
 * is forty unchanged fields hiding the one that matters.
 */
function changes(before: unknown, after: unknown): Row[] | null {
  if (!isRecord(before) || !isRecord(after)) return null;

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const rows = keys
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ key: k, was: before[k], now: after[k] }));

  return rows.length ? rows : [];
}

export function AuditDetail({ entry }: { entry: AuditLogEntry }) {
  const diff = changes(entry.before, entry.after);
  const hasSnapshot = entry.before !== null || entry.after !== null;
  const hasMetadata = entry.metadata !== null && entry.metadata !== undefined;

  if (!hasSnapshot && !hasMetadata && !entry.ip && !entry.requestId) {
    return <span style={{ color: 'var(--color-text-subtle)' }}>—</span>;
  }

  return (
    <details className={styles.detail}>
      <summary className={styles.summary}>Details</summary>

      <div className={styles.detailBody}>
        {diff && diff.length > 0 && (
          <div>
            <p className={styles.blockTitle}>Changed</p>
            <dl className={styles.changes}>
              {diff.map((row) => (
                <div key={row.key} className={styles.change}>
                  <dt className={styles.changeKey}>{row.key}</dt>
                  <dd className={styles.changeValues}>
                    <span className={styles.was}>{show(row.was)}</span>
                    <span className={styles.arrow} aria-label="became">→</span>
                    <span className={styles.now}>{show(row.now)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {diff && diff.length === 0 && (
          <p className={styles.blockTitle}>Recorded, but no field changed value</p>
        )}

        {/* One-sided entries — a creation or a deletion — have nothing to diff
            against, so the snapshot itself is the useful thing. */}
        {!diff && entry.after !== null && entry.after !== undefined && (
          <div>
            <p className={styles.blockTitle}>After</p>
            <pre className={styles.json}>{JSON.stringify(entry.after, null, 2)}</pre>
          </div>
        )}
        {!diff && entry.before !== null && entry.before !== undefined && (
          <div>
            <p className={styles.blockTitle}>Before</p>
            <pre className={styles.json}>{JSON.stringify(entry.before, null, 2)}</pre>
          </div>
        )}

        {hasMetadata && (
          <div>
            <p className={styles.blockTitle}>Metadata</p>
            <pre className={styles.json}>{JSON.stringify(entry.metadata, null, 2)}</pre>
          </div>
        )}

        <div className={styles.context}>
          {entry.ip && <span>IP {entry.ip}</span>}
          {entry.requestId && <span>Request {entry.requestId}</span>}
          {entry.userAgent && <span title={entry.userAgent}>{entry.userAgent.slice(0, 60)}</span>}
        </div>
      </div>
    </details>
  );
}
